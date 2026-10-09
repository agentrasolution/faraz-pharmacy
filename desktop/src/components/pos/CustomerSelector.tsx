import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus, UserCheck, X, AlertCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { Customer } from "@/types";

interface CustomerSelectorProps {
  customerId?: string;
  customerName?: string;
  onCustomerChange: (id?: string, name?: string) => void;
  customers: Customer[];
  outstandingArrears?: number;
  onModalCloseFocusSearch?: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export default function CustomerSelector({
  customerId,
  customerName,
  onCustomerChange,
  customers,
  outstandingArrears = 0,
  onModalCloseFocusSearch,
  triggerRef: externalTriggerRef,
}: CustomerSelectorProps) {
  const queryClient = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Complete Form states matching Customers.tsx page
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [address, setAddress] = useState("");

  const [duplicateCustomer, setDuplicateCustomer] = useState<Customer | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [saving, setSaving] = useState(false);

  const localTriggerRef = useRef<HTMLButtonElement>(null);
  const triggerRef = externalTriggerRef || localTriggerRef;
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Filtered customers for dropdown
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm))
  );

  // Close customer dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  // Autofocus Name field and reset all fields the instant modal opens
  useEffect(() => {
    if (modalOpen) {
      setName("");
      setPhone("");
      setFatherName("");
      setFatherPhone("");
      setAddress("");
      setDuplicateCustomer(null);
      setCheckingDuplicate(false);
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [modalOpen]);

  // Duplicate customer check on Phone field blur
  const handlePhoneBlur = useCallback(async () => {
    const cleanPhone = phone.replace(/^\+92/, "").replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 9) {
      setDuplicateCustomer(null);
      return;
    }

    setCheckingDuplicate(true);
    try {
      const localMatch = customers.find((c) => {
        const cPhone = (c.phone || "").replace(/^\+92/, "").replace(/\D/g, "");
        return cPhone.length >= 9 && cPhone === cleanPhone;
      });

      if (localMatch) {
        setDuplicateCustomer(localMatch);
        setCheckingDuplicate(false);
        return;
      }

      const remoteMatches = await api.customers.search(cleanPhone);
      if (remoteMatches && remoteMatches.length > 0) {
        setDuplicateCustomer(remoteMatches[0]);
      } else {
        setDuplicateCustomer(null);
      }
    } catch {
      setDuplicateCustomer(null);
    } finally {
      setCheckingDuplicate(false);
    }
  }, [phone, customers]);

  // Select the duplicate customer directly
  const handleSelectDuplicate = useCallback(() => {
    if (duplicateCustomer) {
      onCustomerChange(duplicateCustomer.id, duplicateCustomer.name);
      setModalOpen(false);
      toast.success(`Selected customer: ${duplicateCustomer.name}`);
      onModalCloseFocusSearch?.();
    }
  }, [duplicateCustomer, onCustomerChange, onModalCloseFocusSearch]);

  // Submit Add Customer Form with all customer details
  const handleSaveCustomer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      toast.error("Customer name is required");
      nameInputRef.current?.focus();
      return;
    }

    if (duplicateCustomer) {
      handleSelectDuplicate();
      return;
    }

    setSaving(true);
    try {
      const cleanPhone = phone.trim()
        ? phone.startsWith("+92")
          ? phone
          : `+92${phone.replace(/\D/g, "")}`
        : undefined;

      const cleanFatherPhone = fatherPhone.trim()
        ? fatherPhone.startsWith("+92")
          ? fatherPhone
          : `+92${fatherPhone.replace(/\D/g, "")}`
        : undefined;

      const created = await api.customers.create({
        name: name.trim(),
        phone: cleanPhone,
        fatherName: fatherName.trim() || undefined,
        fatherPhone: cleanFatherPhone,
        address: address.trim() || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(`Customer ${created.name} added`);
      onCustomerChange(created.id, created.name);
      setModalOpen(false);
      onModalCloseFocusSearch?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to add customer");
    } finally {
      setSaving(false);
    }
  };

  // Close modal via Escape: focus returns to trigger on main page
  const handleModalClose = useCallback(
    (open: boolean) => {
      if (!open) {
        setModalOpen(false);
        setTimeout(() => {
          triggerRef.current?.focus();
        }, 50);
      } else {
        setModalOpen(true);
      }
    },
    [triggerRef]
  );

  return (
    <div className="space-y-2.5">
      {/* Customer Selector Control */}
      <div className="flex items-center gap-2">
        <div ref={dropdownRef} className="relative flex-1">
          {selectedCustomer ? (
            <div className="flex items-center justify-between h-10 px-3.5 rounded-xl border border-brand/40 bg-brand/5 transition-all">
              <div className="flex items-center gap-2 min-w-0">
                <UserCheck className="h-4 w-4 text-brand shrink-0" />
                <span className="font-semibold text-text-primary text-xs truncate">
                  {selectedCustomer.name}
                </span>
                {selectedCustomer.phone && (
                  <span className="text-[11px] font-mono text-text-secondary truncate">
                    ({selectedCustomer.phone})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onCustomerChange(undefined, undefined)}
                className="h-6 w-6 rounded-md flex items-center justify-center text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                title="Remove customer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div>
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className="w-full h-10 px-3.5 rounded-xl border border-border/80 bg-surface hover:bg-surface-2/60 text-left text-xs font-medium text-text-secondary flex items-center justify-between transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40 cursor-pointer"
              >
                <span>Add / Select Customer</span>
                <span className="text-[11px] text-text-secondary/60">▼</span>
              </button>

              {/* Customer Picker Dropdown */}
              {dropdownOpen && (
                <div className="absolute left-0 right-0 top-12 z-50 rounded-2xl border border-border bg-surface shadow-xl p-2 animate-in fade-in zoom-in-95">
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search customer name or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 rounded-lg border border-border/70 bg-surface-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        setModalOpen(true);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold text-brand hover:bg-brand/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <UserPlus className="h-3.5 w-3.5" />+ Add New Customer
                    </button>

                    {filteredCustomers.length === 0 ? (
                      <p className="px-2.5 py-3 text-center text-xs text-text-secondary">
                        No customer found
                      </p>
                    ) : (
                      filteredCustomers.slice(0, 20).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            onCustomerChange(c.id, c.name);
                            setDropdownOpen(false);
                            onModalCloseFocusSearch?.();
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-text-primary hover:bg-surface-2 flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <span className="font-medium truncate">{c.name}</span>
                          <span className="text-[11px] font-mono text-text-secondary">
                            {c.phone || "No phone"}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Add Button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDropdownOpen(false);
            setModalOpen(true);
          }}
          className="h-10 px-3 rounded-xl gap-1.5 text-xs font-semibold shrink-0 cursor-pointer"
          title="Add Customer (modal)"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add</span>
        </Button>
      </div>

      {/* Inline Previous Arrears indicator (ONLY shown when customer is selected) */}
      {selectedCustomer && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl border border-border/80 bg-surface-2/60 transition-all">
          <span className="text-xs text-text-secondary font-medium">Previous Arrears:</span>
          {outstandingArrears > 0 ? (
            <span className="font-mono text-xs font-bold text-warning flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-warning" />
              {formatCurrency(outstandingArrears)}
            </span>
          ) : (
            <span className="font-mono text-xs font-semibold text-success flex items-center gap-1">
              PKR 0 (Clear)
            </span>
          )}
        </div>
      )}

      {/* Add Customer Modal — Matching exact fields of Customers.tsx */}
      <Dialog open={modalOpen} onOpenChange={handleModalClose}>
        <DialogContent
          className="max-w-md p-6 rounded-2xl max-h-[90vh] overflow-y-auto"
          onEscapeKeyDown={() => handleModalClose(false)}
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Customer</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveCustomer} className="space-y-3.5 pt-2">
            {/* 1. Name Field (autofocused on open) */}
            <div className="space-y-1">
              <Label htmlFor="customer-name" className="text-xs font-medium">
                Name <span className="text-danger">*</span>
              </Label>
              <Input
                id="customer-name"
                ref={nameInputRef}
                tabIndex={1}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer full name"
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            {/* 2. Phone Field with duplicate detection */}
            <div className="space-y-1">
              <Label htmlFor="customer-phone" className="text-xs font-medium">
                Phone
              </Label>
              <div className="flex items-center">
                <span className="h-9 px-3 flex items-center justify-center rounded-l-xl border border-r-0 border-border bg-surface-2 text-text-secondary text-xs font-mono font-medium">
                  +92
                </span>
                <Input
                  id="customer-phone"
                  ref={phoneInputRef}
                  tabIndex={2}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={phone.replace(/^\+92/, "")}
                  onChange={(e) => {
                    const num = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setPhone(num ? `+92${num}` : "");
                  }}
                  onBlur={handlePhoneBlur}
                  placeholder="3001234567"
                  className="h-9 text-xs rounded-l-none rounded-r-xl font-mono"
                  disabled={checkingDuplicate}
                />
              </div>

              {checkingDuplicate && (
                <p className="text-[11px] text-text-secondary">Checking for existing customer...</p>
              )}

              {/* Duplicate Customer Alert */}
              {duplicateCustomer && (
                <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 space-y-2 animate-in fade-in">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-semibold">Customer already exists!</p>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        {duplicateCustomer.name} • {duplicateCustomer.phone}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-semibold border-amber-500/40 hover:bg-amber-500/15"
                    onClick={handleSelectDuplicate}
                  >
                    Select this customer instead
                  </Button>
                </div>
              )}
            </div>

            {/* 3. Father Name Field */}
            <div className="space-y-1">
              <Label htmlFor="customer-father-name" className="text-xs font-medium">
                Father Name
              </Label>
              <Input
                id="customer-father-name"
                tabIndex={3}
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                placeholder="Father name (optional)"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* 4. Father Phone No Field */}
            <div className="space-y-1">
              <Label htmlFor="customer-father-phone" className="text-xs font-medium">
                Father Phone No
              </Label>
              <div className="flex items-center">
                <span className="h-9 px-3 flex items-center justify-center rounded-l-xl border border-r-0 border-border bg-surface-2 text-text-secondary text-xs font-mono font-medium">
                  +92
                </span>
                <Input
                  id="customer-father-phone"
                  tabIndex={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={fatherPhone.replace(/^\+92/, "")}
                  onChange={(e) => {
                    const num = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setFatherPhone(num ? `+92${num}` : "");
                  }}
                  placeholder="3001234567"
                  className="h-9 text-xs rounded-l-none rounded-r-xl font-mono"
                />
              </div>
            </div>

            {/* 5. Address Field */}
            <div className="space-y-1">
              <Label htmlFor="customer-address" className="text-xs font-medium">
                Address
              </Label>
              <Input
                id="customer-address"
                tabIndex={5}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Address (optional)"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleModalClose(false)}
                className="h-9 px-3 text-xs font-medium text-text-secondary"
              >
                Cancel (Esc)
              </Button>
              <Button
                type="submit"
                tabIndex={6}
                variant="brand"
                disabled={!name.trim() || saving}
                className="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer"
              >
                {saving ? "Saving..." : "Add Customer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
