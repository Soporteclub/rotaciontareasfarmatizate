"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Lock, KeyRound, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAdminStore } from "@/frontend/presentation/hooks/use-admin-store";

interface AdminLockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AdminLockDialog({ open, onOpenChange, onSuccess }: AdminLockDialogProps) {
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const unlock = useAdminStore((s) => s.unlock);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const valid = await unlock(key.trim());
    setLoading(false);

    if (valid) {
      setKey("");
      setError("");
      onOpenChange(false);
      onSuccess?.();
    } else {
      setError("Clave incorrecta. Intenta de nuevo.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-[#1545cb]/10">
              <ShieldCheck className="h-5 w-5" style={{ color: "#1545cb" }} />
            </div>
            Acceso de Administrador
          </DialogTitle>
          <DialogDescription>
            Ingresa la clave de administrador para modificar la configuración y generar asignaciones.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
              Clave de administrador
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showKey ? "text" : "password"}
                placeholder="Ingresa la clave..."
                value={key}
                onChange={(e) => { setKey(e.target.value); setError(""); }}
                className="pl-9 pr-10"
                autoFocus
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowKey(!showKey)}
                tabIndex={-1}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-red-500 inline-block" />
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { onOpenChange(false); setKey(""); setError(""); }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!key.trim() || loading}
              className="bg-[#1545cb] hover:bg-[#1545cb]/90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-1" />
                  Desbloquear
                </>
              )}
            </Button>
          </div>
        </form>

        <p className="text-[10px] text-muted-foreground text-center pt-2 border-t">
          Solo personal autorizado puede modificar la configuración del sistema.
        </p>
      </DialogContent>
    </Dialog>
  );
}
