import { useState, useRef } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Factory, User, Search, Pencil, Trash2, LayoutGrid, List } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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

export default function Distributors() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", salesmanName: "", salesmanContact: "", deliveryManName: "", deliveryManContact: "" });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: distributors = [], isLoading } = useQuery({ queryKey: ["distributors"], queryFn: api.distributors.list });

  const filtered = distributors.filter((d: Distributor) =>
    !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.salesman_name?.toLowerCase().includes(search.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: () => api.distributors.create(form),
    onSuccess: () => {
      toast.success("Distributor created");
      queryClient.invalidateQueries({ queryKey: ["distributors"] });
      setOpen(false);
      setForm({ name: "", salesmanName: "", salesmanContact: "", deliveryManName: "", deliveryManContact: "" });
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
      setForm({ name: "", salesmanName: "", salesmanContact: "", deliveryManName: "", deliveryManContact: "" });
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
    downloadPDF(`distributors_${new Date().toISOString().split("T")[0]}.pdf`, "Distributors List",
      ["Proprietor", "Salesman", "Salesman Contact", "Delivery Man", "Delivery Man Contact"],
      filtered.map((d: Distributor) => [d.name, d.salesman_name, d.salesman_contact, d.delivery_man_name, d.delivery_man_contact]));
  }
  function handleExportCSV() {
    downloadCSV(`distributors_${new Date().toISOString().split("T")[0]}.csv`,
      ["Proprietor", "Salesman", "Salesman Contact", "Delivery Man", "Delivery Man Contact"],
      filtered.map((d: Distributor) => [d.name, d.salesman_name, d.salesman_contact, d.delivery_man_name, d.delivery_man_contact]));
  }

  useModuleShortcuts({ onAdd: openAdd, onSearch: () => searchRef.current?.focus(), onExportPDF: handleExportPDF, onExportCSV: handleExportCSV });

  function openAdd() {
    setEditingId(null);
    setForm({ name: "", salesmanName: "", salesmanContact: "", deliveryManName: "", deliveryManContact: "" });
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
      <PageHeader title="Distributors" description="Manage your supplier network" action={{ label: <><span>Add Distributor</span><ShortcutHint shortcut="Mod+N" /></>, onClick: openAdd }} />
      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input autoFocus ref={searchRef} placeholder="Search distributors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <ExportButton type="pdf" onClick={handleExportPDF} />
        <ExportButton type="csv" onClick={handleExportCSV} />
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button onClick={() => setViewMode("grid")} className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-accent text-white" : "text-text-secondary hover:bg-surface-2")}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode("list")} className={cn("p-2 transition-colors", viewMode === "list" ? "bg-accent text-white" : "text-text-secondary hover:bg-surface-2")}>
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="rounded-xl border border-border">
          <DataTable
            columns={[
              { key: "name", header: "Proprietor", cell: (d: Distributor) => <span className="font-medium text-text-primary">{d.name || "\u2014"}</span> },
              { key: "salesman_name", header: "Salesman", cell: (d: Distributor) => <span className="text-text-secondary">{d.salesman_name || "\u2014"}</span> },
              { key: "salesman_contact", header: "Salesman Contact", cell: (d: Distributor) => <span className="font-mono text-[11px]">{d.salesman_contact || "\u2014"}</span> },
              { key: "delivery_man_name", header: "Delivery Man", cell: (d: Distributor) => <span className="text-text-secondary">{d.delivery_man_name || "\u2014"}</span> },
              { key: "delivery_man_contact", header: "Delivery Contact", cell: (d: Distributor) => <span className="font-mono text-[11px]">{d.delivery_man_contact || "\u2014"}</span> },
              {
                key: "actions", header: "", cell: (d: Distributor) => (
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(d)} className="h-7 w-7 rounded-md flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(d.id)} className="h-7 w-7 rounded-md flex items-center justify-center text-text-secondary hover:text-danger hover:bg-danger/5 transition-colors" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ),
              },
            ]}
            data={filtered}
            loading={isLoading}
            keyExtractor={(d: Distributor) => d.id}
            emptyMessage="No distributors found"
          />
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-sm text-text-secondary">No distributors found</div>
        ) : (
          filtered.map((dist: Distributor) => (
            <Card key={dist.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <Factory className="h-5 w-5 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-text-primary truncate">{dist.name || "Unnamed Distributor"}</h3>
                      <div className="space-y-1 mt-2">
                        {dist.salesman_name && (
                          <div className="flex items-center gap-1 text-xs text-text-secondary">
                            <User className="h-3 w-3 shrink-0" />Salesman: {dist.salesman_name}
                            {dist.salesman_contact && <span className="font-mono ml-1">({dist.salesman_contact})</span>}
                          </div>
                        )}
                        {dist.delivery_man_name && (
                          <div className="flex items-center gap-1 text-xs text-text-secondary">
                            <User className="h-3 w-3 shrink-0" />Delivery: {dist.delivery_man_name}
                            {dist.delivery_man_contact && <span className="font-mono ml-1">({dist.delivery_man_contact})</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(dist)} className="h-7 w-7 rounded-md flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(dist.id)} className="h-7 w-7 rounded-md flex items-center justify-center text-text-secondary hover:text-danger hover:bg-danger/5 transition-colors" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>)}

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setEditingId(null); } setOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Distributor" : "Add Distributor"}</DialogTitle>
          </DialogHeader>
          <div className="px-5 pb-5 space-y-3">
            <div>
              <Label>Proprietor Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Proprietor / company name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Salesman Name</Label>
                <Input value={form.salesmanName} onChange={(e) => setForm({ ...form, salesmanName: e.target.value })} placeholder="Salesman name" />
              </div>
              <div>
                <Label>Salesman Contact</Label>
                <Input inputMode="numeric" pattern="[0-9]*" value={form.salesmanContact} onChange={(e) => setForm({ ...form, salesmanContact: e.target.value.replace(/\D/g, "").slice(0, 11) })} placeholder="Phone number" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Delivery Man Name</Label>
                <Input value={form.deliveryManName} onChange={(e) => setForm({ ...form, deliveryManName: e.target.value })} placeholder="Delivery man name" />
              </div>
              <div>
                <Label>Delivery Man Contact</Label>
                <Input inputMode="numeric" pattern="[0-9]*" value={form.deliveryManContact} onChange={(e) => setForm({ ...form, deliveryManContact: e.target.value.replace(/\D/g, "").slice(0, 11) })} placeholder="Phone number" />
              </div>
            </div>
            <Button className="w-full" disabled={createMutation.isPending || updateMutation.isPending}
              onClick={() => editingId ? updateMutation.mutate() : createMutation.mutate()}>
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingId ? "Update Distributor" : "Add Distributor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PasswordConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => { if (!v) setDeleteId(null); }}
        title="Delete Distributor"
        description="Are you sure you want to delete this distributor? Associated products and stock entries will not be affected."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteId) deleteMutation.mutate(deleteId); }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
