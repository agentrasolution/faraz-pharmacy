import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Building2, Search, Plus, Pencil, Trash2, Download, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { downloadCSV, downloadPDF } from "@/lib/export";
import { formatDate } from "@/lib/utils";
import PasswordConfirmDialog from "@/components/shared/PasswordConfirmDialog";
import type { Company } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";

export default function Companies() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(48);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState("");

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, limit]);

  const { data, isLoading } = useQuery({
    queryKey: ["companies", page, limit, debouncedSearch],
    queryFn: () => api.companies.listPaginated({ page, limit, search: debouncedSearch }),
  });

  const companies = data?.data ?? [];
  const meta = data?.meta;

  const createMutation = useMutation({
    mutationFn: () => api.companies.create({ name }),
    onSuccess: () => {
      toast.success("Company created successfully");
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setOpen(false);
      setName("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: () => api.companies.update(editingId!, { name }),
    onSuccess: () => {
      toast.success("Company updated successfully");
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setOpen(false);
      setEditingId(null);
      setName("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.companies.delete(id),
    onSuccess: () => {
      toast.success("Company deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["companies"] });
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

  function openEdit(c: Company) {
    setEditingId(c.id);
    setName(c.name);
    setOpen(true);
  }

  function handleExportCSV() {
    downloadCSV(
      `companies_${new Date().toISOString().split("T")[0]}.csv`,
      ["Name"],
      companies.map((c: Company) => [c.name])
    );
  }

  function handleExportPDF() {
    downloadPDF(
      `companies_${new Date().toISOString().split("T")[0]}.pdf`,
      "Companies List",
      ["Name"],
      companies.map((c: Company) => [c.name])
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Pharmaceutical Companies"
        description="Brand manufacturers, medicine suppliers and catalog lines"
        action={{
          label: "Add Company",
          onClick: openAdd,
        }}
      />

      {/* Filter & Export Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input
            autoFocus
            placeholder="Search companies by name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10 h-10 rounded-full border border-border/80 bg-surface shadow-xs text-xs focus-visible:ring-2 focus-visible:ring-[#4A25E1]/25"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="rounded-xl shadow-xs"
          >
            <Download className="h-3.5 w-3.5 mr-1 text-text-secondary" /> CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="rounded-xl shadow-xs"
          >
            <Download className="h-3.5 w-3.5 mr-1 text-text-secondary" /> PDF
          </Button>
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))
        ) : companies.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-12 text-center text-sm text-text-secondary">
            {debouncedSearch
              ? "No pharmaceutical companies match your search"
              : "No companies found. Click 'Add Company' to create your first manufacturer."}
          </div>
        ) : (
          companies.map((company: Company) => (
            <div
              key={company.id}
              className="group rounded-2xl border border-border/80 bg-surface p-5 shadow-xs hover:shadow-md hover:border-[#4A25E1]/40 transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  className="flex items-start gap-3.5 min-w-0 flex-1 text-left cursor-pointer"
                  onClick={() => navigate(`/companies/${company.id}`)}
                  title={`View ${company.name}`}
                >
                  <div className="h-11 w-11 rounded-2xl bg-[#4A25E1]/10 dark:bg-white/10 flex items-center justify-center text-[#4A25E1] dark:text-[#754BFB] shrink-0 group-hover:scale-105 transition-all shadow-xs">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-text-primary group-hover:text-[#4A25E1] dark:group-hover:text-[#754BFB] transition-colors truncate">
                      {company.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-text-secondary">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(company.created_at)}</span>
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(company)}
                    className="h-8 w-8 rounded-xl flex items-center justify-center text-text-secondary hover:text-[#4A25E1] hover:bg-surface-2 transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteId(company.id)}
                    className="h-8 w-8 rounded-xl flex items-center justify-center text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Bar */}
      <div className="rounded-2xl border border-border/80 bg-surface p-3 px-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs text-text-secondary">
          <span>
            Showing {meta ? (meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1) : 0} to{" "}
            {meta ? Math.min(meta.page * meta.limit, meta.total) : 0} of {meta?.total ?? 0} entries
          </span>
          <div className="flex items-center gap-2">
            <span>Per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="bg-surface-2 text-text-primary border border-border rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
            >
              {[24, 48, 60, 100].map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!meta || meta.page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-xl shadow-xs"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-xs font-semibold text-text-primary px-2">
            Page {meta?.page ?? 1} of {meta?.totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!meta || meta.page >= (meta.totalPages || 1)}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl shadow-xs"
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setEditingId(null);
            setName("");
          }
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-bold">
              {editingId ? "Edit Company" : "Add Company"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              if (editingId) {
                updateMutation.mutate();
              } else {
                createMutation.mutate();
              }
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="company-name" className="text-xs font-semibold">
                Company Name *
              </Label>
              <Input
                id="company-name"
                autoFocus
                placeholder="e.g. Pfizer, GSK, Abbott"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="brand"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="rounded-xl"
              >
                {editingId ? "Save Changes" : "Create Company"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <PasswordConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        title="Delete Company"
        description="Are you sure you want to delete this company? Products assigned to it will remain intact."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleteId) {
            await deleteMutation.mutateAsync(deleteId);
          }
        }}
      />
    </div>
  );
}