"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, Key, Lock, Unlock, Eye, EyeOff } from "lucide-react";
import { useUIStore } from "@/frontend/presentation/hooks/use-ui-store";

export function AdminKeyModal() {
  const adminPendingUnlock = useUIStore((s) => s.adminPendingUnlock);
  const unlockAdmin = useUIStore((s) => s.unlockAdmin);
  const lockAdmin = useUIStore((s) => s.lockAdmin);
  const clearAdminRequest = useUIStore((s) => s.clearAdminRequest);
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();

      if (data.data?.valid) {
        unlockAdmin(key.trim());
        setKey("");
        setError("");
      } else {
        setError("Clave incorrecta. Intenta de nuevo.");
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      clearAdminRequest();
      setKey("");
      setError("");
      // FIX (admin modal): cancelar/bloquear el modal también bloquea el admin
      // para que no quede la sesión abierta sin querer.
      lockAdmin();
    }
  };

  return (
    <Dialog
      open={adminPendingUnlock}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                Desbloquear Administrador
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Ingresa la clave para acceder a Grupos, Empleados, Reglas y Auditoría
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Key className="h-3.5 w-3.5" />
              Clave de administrador
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(e) => { setKey(e.target.value); setError(""); }}
                placeholder="Ingresa la clave..."
                className="pl-9 pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive" />
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!key || loading}
              className="flex-1"
            >
              {loading ? (
                "Validando..."
              ) : (
                <>
                  <Unlock className="h-4 w-4 mr-1.5" />
                  Desbloquear todo
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Una clave desbloquea todas las secciones de administración.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
