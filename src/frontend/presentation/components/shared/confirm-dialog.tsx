"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, AlertTriangle } from "lucide-react";
import { BRAND } from "@/frontend/presentation/lib/brand";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "primary";
  icon?: "delete" | "warning";
  onConfirm: () => void;
}

/**
 * Reusable confirmation dialog using shadcn AlertDialog.
 * Replaces native browser confirm() with a styled UI dialog.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title = "¿Estás seguro?",
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "destructive",
  icon = "delete",
  onConfirm,
}: ConfirmDialogProps) {
  const IconComponent = icon === "warning" ? AlertTriangle : Trash2;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{
                backgroundColor: variant === "destructive" ? "#ef444412" : `${BRAND.PRIMARY}12`,
                color: variant === "destructive" ? "#ef4444" : BRAND.PRIMARY,
              }}
            >
              <IconComponent className="h-5 w-5" />
            </div>
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm leading-relaxed pl-[52px]">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              variant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
            style={variant === "primary" ? { backgroundColor: BRAND.PRIMARY } : undefined}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
