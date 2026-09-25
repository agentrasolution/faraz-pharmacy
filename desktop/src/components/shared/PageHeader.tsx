import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import { ShortcutHint } from "@/components/shared/Kbd";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: { label: ReactNode; onClick: () => void; shortcut?: string };
  back?: { label: string; onClick: () => void };
}

export default function PageHeader({ title, description, action, back }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          {back && (
            <Button variant="ghost" size="icon" onClick={back.onClick} className="rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-lg font-display font-bold text-text-primary tracking-tight">{title}</h1>
        </div>
        {description && <p className="text-xs text-text-secondary">{description}</p>}
      </div>
      {action && (
        <Button onClick={action.onClick} className="gap-2 rounded-xl" size="default" variant="brand">
          <Plus className="h-4 w-4" />
          <span>{action.label}</span>
          {action.shortcut && <ShortcutHint shortcut={action.shortcut} />}
        </Button>
      )}
    </div>
  );
}
