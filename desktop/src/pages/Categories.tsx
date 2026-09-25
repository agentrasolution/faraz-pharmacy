import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tags, Search, Plus, Pencil, Trash2, Download, ChevronLeft, ChevronRight } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { downloadCSV, downloadPDF } from "@/lib/export";
import { formatDate } from "@/lib/utils";
import PasswordConfirmDialog from "@/components/shared/PasswordConfirmDialog";
import ExportButton from "@/components/shared/ExportButton";
import type { Category } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";

export default function Categories() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState("");

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["categories", page, limit, debouncedSearch],
    queryFn: () => api.categories.listPaginated({ page, limit, search: debouncedSearch }),
  });

  const categories = data?.data ?? [];
  const meta = data?.meta;

  const createMutation = useMutation({
    mutationFn: () => api.categories.create({ name }),
    onSuccess: () => {
      toast.success("Category created");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setOpen(false);
      setName("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: () => api.categories.update(editingId!, { name }),
    onSuccess: () => {
      toast.success("Category updated");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setOpen(false);
      setEditingId(null);
      setName("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.categories.delete(id),
    onSuccess: () => {
      toast.success("Category deleted");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setDeleteId(null);
    },
  });

  function openAdd() {
    setEditingId(null);
    setName("");
    setOpen(true);
  }

  function openEdit(c: Category) {
    setEditingId(c.id);
    setName(c.name);
    setOpen(true);
  }

  function handleExportCSV() {
    downloadCSV(
      `categories_${new Date().toISOString().split("T")[0]}.csv`,
      ["Name"],
      categories.map((c: Category) => [c.name])
    );
  }

  function handleExportPDF() {
    downloadPDF(
      `categories_${new Date().toISOString().split("T")[0]}.pdf`,
      "Categories List",
      ["Name"],
      categories.map((c: Category) => [c.name])
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories"
        description="Organize and structure pharmaceutical product categories"
        action={{
          label: (
            <span className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              Add Category
            </span>
          ),
          onClick: openAdd,
        }}
      />

      {/* Modern Search & Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
          <Input
            autoFocus
            placeholder="Search categories..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10 h-10 rounded-full bg-surface border-border/80 shadow-xs focus:ring-2 focus:ring-brand/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <ExportButton type="csv" onClick={handleExportCSV} />
          <ExportButton type="pdf" onClick={handleExportPDF} />
        </div>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl bg-surface-2/60" />
          ))
        ) : categories.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-border bg-surface/50 text-center py-16 text-sm text-text-secondary">
            {debouncedSearch
              ? "No categories match your search query."
              : "No categories added yet. Click 'Add Category' to get started."}
          </div>
        ) : (
          categories.map((cat: Category) => (
            <div
              key={cat.id}
              className="group rounded-2xl border border-border/80 bg-surface p-4.5 shadow-xs hover:shadow-md hover:border-brand/40 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="h-11 w-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Tags className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-text-primary truncate tracking-tight">
                      {cat.name}
                    </h3>
                    <p className="text-[11px] text-text-secondary mt-0.5 font-mono">
                      Added: {formatDate(cat.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(cat)}
                    className="h-8 w-8 rounded-xl flex items-center justify-center text-text-secondary hover:text-brand hover:bg-brand/10 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(cat.id)}
                    className="h-8 w-8 rounded-xl flex items-center justify-center text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Unified Pagination Bar */}
      {meta && (
        <div className="rounded-2xl border border-border/80 bg-surface p-3 px-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-text-secondary font-medium">
            Showing <span className="font-semibold text-text-primary">{(page - 1) * limit + 1}</span> to{" "}
            <span className="font-semibold text-text-primary">{Math.min(page * limit, meta.total)}</span> of{" "}
            <span className="font-semibold text-text-primary">{meta.total}</span> categories
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-xl h-8 px-3 text-xs shadow-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
            </Button>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-surface-2 text-text-primary">
              Page {page} of {meta.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded-xl h-8 px-3 text-xs shadow-xs"
            >
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Add / Edit Category Dialog */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) setEditingId(null);
          setOpen(v);
        }}
      >
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-display">
              {editingId ? "Edit Category" : "Add Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-text-primary">Category Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Antibiotics, Pain Relief, Syrups"
                className="h-10 rounded-xl"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="rounded-xl bg-gradient-to-r from-[#4A25E1] to-[#3612B8] text-white hover:from-[#3e1ed1] hover:to-[#2e0ea3] shadow-md shadow-brand/20"
                disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}
                onClick={() => (editingId ? updateMutation.mutate() : createMutation.mutate())}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingId
                  ? "Save Changes"
                  : "Create Category"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PasswordConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => {
          if (!v) setDeleteId(null);
        }}
        title="Delete Category"
        description="Are you sure you want to delete this category? Products assigned to it will remain intact."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId);
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}