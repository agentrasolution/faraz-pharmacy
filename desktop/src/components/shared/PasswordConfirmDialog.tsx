import { useState, type ReactNode } from "react";
import { Lock, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface PasswordConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
}

export default function PasswordConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  loading = false,
}: PasswordConfirmDialogProps) {
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    if (!password.trim()) {
      setError("Password is required");
      return;
    }
    setVerifying(true);
    setError("");
    try {
      const result = await api.auth.verifyPassword(password);
      if (result.valid) {
        setPassword("");
        onConfirm();
      } else {
        setError("Invalid password");
      }
    } catch {
      setError("Failed to verify password");
    } finally {
      setVerifying(false);
    }
  }

  function handleClose() {
    setPassword("");
    setError("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="px-5 pb-5 space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs font-medium text-text-primary">
              <Lock className="h-4 w-4 text-brand" /> Enter admin password to confirm
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Admin password"
              className="h-10 rounded-xl"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirm();
              }}
              autoFocus
            />
            {error && <p className="text-xs text-danger font-medium bg-danger/10 px-2.5 py-1.5 rounded-lg">{error}</p>}
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="outline"
              className="rounded-xl h-10 px-4 text-xs font-medium"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl h-10 px-5 text-xs font-medium shadow-xs"
              disabled={!password || loading || verifying}
              onClick={handleConfirm}
            >
              {verifying ? "Verifying..." : loading ? "Processing..." : confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
