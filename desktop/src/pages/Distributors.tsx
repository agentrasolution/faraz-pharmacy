import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Pencil, Trash2, LayoutGrid, List, ChevronLeft, ChevronRight } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { downloadCSV, downloadPDF } from "@/lib/export";
import { useModuleShortcuts } from "@/hooks/useModuleShortcuts";
import { ShortcutHint } from "@/components/shared/Kbd";
import PasswordConfirmDialog from "@/components/shared/PasswordConfirmDialog";
import ExportButton from "@/components/shared/ExportButton";
import type { Distributor } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";

export default function Distributors() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    salesmanName: "",
    salesmanContact: "",
    deliveryManName: "",
    deliveryManContact: "",
  });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const searchRef = useRef<HTMLInputElement>(null);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, limit]);

  const { data, isLoading } = useQuery({
    queryKey: ["distributors", page, limit, debouncedSearch],
    queryFn: () => api.distributors.listPaginated({ page, limit, search: debouncedSearch }),
  });

  const distributors = data?.data ?? [];
  const meta = data?.meta;

  const createMutation = useMutation({
    mutationFn: () => api.distributors.create(form),
    onSuccess: () => {
      toast.success("Distributor created");
      queryClient.invalidateQueries({ queryKey: ["distributors"] });
      setOpen(false);
      setForm({
        name: "",
        salesmanName: "",
        salesmanContact: "",
        deliveryManName: "",
        deliveryManContact: "",
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: () => api.distributors.update(editingId!, form),
    onSuccess: () => {
      toast.success("Distributor updated");
      queryClient.invalidateQueries({ queryKey: ["distributors"] });
      setOpen(false);
      setEditingId(null);
      setForm({
        name: "",
        salesmanName: "",
        salesmanContact: "",
        deliveryManName: "",
        deliveryManContact: "",
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.distributors.delete(id),
    onSuccess: () => {
      toast.success("Distributor deleted");
      queryClient.invalidateQueries({ queryKey: ["distributors"] });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setDeleteId(null);
    },
  });

  function handleExportPDF() {
    downloadPDF(
      `distributors_${new Date().toISOString().split("T")[0]}.pdf`,
      "Distributors List",
      ["Proprietor", "Salesman", "Salesman Contact", "Delivery Man", "Delivery Man Contact"],
      distributors.map((d: Distributor) => [
        d.name,
        d.salesman_name,
        d.salesman_contact,
        d.delivery_man_name,
        d.delivery_man_contact,
      ])
    );
  }
  function handleExportCSV() {
    downloadCSV(
      `distributors_${new Date().toISOString().split("T")[0]}.csv`,
      ["Proprietor", "Salesman", "Salesman Contact", "Delivery Man", "Delivery Man Contact"],
      distributors.map((d: Distributor) => [
        d.name,
        d.salesman_name,
        d.salesman_contact,
        d.delivery_man_name,
        d.delivery_man_contact,
      ])
    );
  }

  useModuleShortcuts({
    onAdd: openAdd,
    onSearch: () => searchRef.current?.focus(),
    onExportPDF: handleExportPDF,
    onExportCSV: handleExportCSV,
  });

  function openAdd() {
    setEditingId(null);
    setForm({
      name: "",
      salesmanName: "",
      salesmanContact: "",
      deliveryManName: "",
      deliveryManContact: "",
    });
    setOpen(true);
  }

  function openEdit(d: Distributor) {
    setEditingId(d.id);
    setForm({
      name: d.name || "",
      salesmanName: d.salesman_name || "",
      salesmanContact: d.salesman_contact || "",
      deliveryManName: d.delivery_man_name || "",
      deliveryManContact: d.delivery_man_contact || "",
    });
    setOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Distributors"
        description="Manage your supplier network"
        action={{
          label: (
            <>
              <span>Add Distributor</span>
              <ShortcutHint shortcut="Mod+N" />
            </>
          ),
          onClick: openAdd,
        }}
      />
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input
            autoFocus
            ref={searchRef}
            placeholder="Search distributors..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <ExportButton type="pdf" onClick={handleExportPDF} />
        <ExportButton type="csv" onClick={handleExportCSV} />
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-2 transition-colors",
              viewMode === "grid"
                ? "bg-accent text-white"
                : "text-text-secondary hover:bg-surface-2"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-2 transition-colors",
              viewMode === "list"
                ? "bg-accent text-white"
                : "text-text-secondary hover:bg-surface-2"
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="rounded-xl border border-border">
          <DataTable
            columns={[
              {
                key: "name",
                header: "Proprietor",
                cell: (d: Distributor) => (
                  <span className="font-medium text-text-primary">{d.name || "\u2014"}</span>
                ),
              },
              {
                key: "salesman_name",
                header: "Salesman",
                cell: (d: Distributor) => (
                  <span className="text-text-secondary">{d.salesman_name || "\u2014"}</span>
                ),
              },
              {
                key: "salesman_contact",
                header: "Salesman Contact",
                cell: (d: Distributor) => (
                  <span className="font-mono text-[11px]">{d.salesman_contact || "\u2014"}</span>
                ),
              },
              {
                key: "delivery_man_name",
                header: "Delivery Man",
                cell: (d: Distributor) => (
                  <span className="text-text-secondary">{d.delivery_man_name || "\u2014"}</span>
                ),
              },
              {
                key: "delivery_man_contact",
                header: "Delivery Contact",
                cell: (d: Distributor) => (
                  <span className="font-mono text-[11px]">
                    {d.delivery_man_contact || "\u2014"}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "",
                cell: (d: Distributor) => (
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => openEdit(d)}
                      className="h-7 w-7 rounded-md flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(d.id)}
                      className="h-7 w-7 rounded-md flex items-center justify-center text-text-secondary hover:text-danger hover:bg-danger/5 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ),
              },
            ]}
            data={distributors}
            loading={isLoading}
            keyExtractor={(d: Distributor) => d.id}
            emptyMessage="No distributors found"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          ) : distributors.length === 0 ? (
            <div className="col-span-full text-center py-12 text-sm text-text-secondary">
              No distributors found
            </div>
          ) : (
            distributors.map((dist: Distributor) => (
              <div
                key={dist.id}
                className="rounded-xl border border-border bg-surface p-4 hover:border-accent/30 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-sm text-text-primary truncate pr-2">
                    {dist.name || "Unnamed Distributor"}
                  </h3>
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(dist)}
                      className="h-6 w-6 rounded flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(dist.id)}
                      className="h-6 w-6 rounded flex items-center justify-center text-text-secondary hover:text-danger hover:bg-danger/5 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-0.5">
                      Salesman
                    </p>
                    <p className="text-xs text-text-primary font-medium truncate">
                      {dist.salesman_name || "\u2014"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-0.5">
                      Salesman Contact
                    </p>
                    <p className="text-xs text-text-primary font-mono truncate">
                      {dist.salesman_contact || "\u2014"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-0.5">
                      Delivery Man
                    </p>
                    <p className="text-xs text-text-primary font-medium truncate">
                      {dist.delivery_man_name || "\u2014"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-0.5">
                      Delivery Contact
                    </p>
                    <p className="text-xs text-text-primary font-mono truncate">
                      {dist.delivery_man_contact || "\u2014"}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 border-t border-border pt-4 px-1">
        <div className="flex items-center gap-4 text-sm text-text-secondary">
          <span>
            Showing {meta ? (meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1) : 0} to {meta ? Math.min(meta.page * meta.limit, meta.total) : 0} of {meta?.total ?? 0} entries
          </span>
          <div className="flex items-center gap-2">
            <label htmlFor="distributor-limit-select">Rows per page:</label>
            <select
              id="distributor-limit-select"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="bg-surface text-text-primary border border-border rounded px-2 py-1 text-sm outline-none"
            >
              {[10, 20, 30, 50, 100].map((val) => (
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
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-text-secondary px-2">
            Page {meta?.page ?? 1} of {meta?.totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!meta || meta.page >= (meta.totalPages || 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            setEditingId(null);
          }
          setOpen(v);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Distributor" : "Add Distributor"}</DialogTitle>
          </DialogHeader>
          <div className="px-5 pb-5 space-y-3">
            <div>
              <Label>Proprietor Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Proprietor / company name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Salesman Name</Label>
                <Input
                  value={form.salesmanName}
                  onChange={(e) => setForm({ ...form, salesmanName: e.target.value })}
                  placeholder="Salesman name"
                />
              </div>
              <div>
                <Label>Salesman Contact</Label>
                <div className="flex">
                  <span className="flex items-center justify-center px-2 bg-muted border border-r-0 border-border rounded-l-md text-xs text-text-secondary">
                    +92
                  </span>
                  <Input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.salesmanContact.replace(/^\+92/, "")}
                    onChange={(e) => {
                      const num = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setForm({ ...form, salesmanContact: num ? `+92${num}` : "" });
                    }}
                    placeholder="3001234567"
                    className="rounded-l-none"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Delivery Man Name</Label>
                <Input
                  value={form.deliveryManName}
                  onChange={(e) => setForm({ ...form, deliveryManName: e.target.value })}
                  placeholder="Delivery man name"
                />
              </div>
              <div>
                <Label>Delivery Man Contact</Label>
                <div className="flex">
                  <span className="flex items-center justify-center px-2 bg-muted border border-r-0 border-border rounded-l-md text-xs text-text-secondary">
                    +92
                  </span>
                  <Input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.deliveryManContact.replace(/^\+92/, "")}
                    onChange={(e) => {
                      const num = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setForm({ ...form, deliveryManContact: num ? `+92${num}` : "" });
                    }}
                    placeholder="3001234567"
                    className="rounded-l-none"
                  />
                </div>
              </div>
            </div>
            <Button
              className="w-full"
              disabled={createMutation.isPending || updateMutation.isPending}
              onClick={() => (editingId ? updateMutation.mutate() : createMutation.mutate())}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingId
                  ? "Update Distributor"
                  : "Add Distributor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PasswordConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => {
          if (!v) setDeleteId(null);
        }}
        title="Delete Distributor"
        description="Are you sure you want to delete this distributor? Associated products and stock entries will not be affected."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId);
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}