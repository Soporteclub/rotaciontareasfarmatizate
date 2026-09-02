"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useUIStore } from "@/frontend/presentation/hooks/use-ui-store";

export default function DocsPage() {
  const isAdmin = useSyncExternalStore(
    useUIStore.subscribe,
    () => useUIStore.getState().isAdmin,
    () => false
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [spec, setSpec] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    // FIX (A2): /api/docs now requires the admin key (header x-admin-key). Read
    // the in-memory key from the UI store (it is never persisted) and send it.
    const adminKey = useUIStore.getState().adminKey;
    fetch("/api/docs", { headers: { "x-admin-key": adminKey || "" } })
      .then((res) => {
        if (!res.ok) throw new Error("No autorizado");
        return res.json();
      })
      .then((data) => setSpec(data))
      .catch((err) => setError(err.message));
  }, [isAdmin]);

  useEffect(() => {
    if (!spec || !containerRef.current) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css";

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js";
    script.onload = () => {
      if (!containerRef.current || !(window as unknown as Record<string, unknown>).SwaggerUIBundle) return;
      const SwaggerUIBundle = (window as unknown as Record<string, unknown>).SwaggerUIBundle as {
        (opts: Record<string, unknown>): void;
      };
      SwaggerUIBundle({
        spec,
        domNode: containerRef.current,
        docExpansion: "list",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true,
      });
    };
    script.onerror = () => setError("No se pudo cargar Swagger UI desde CDN");

    document.head.appendChild(link);
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [spec]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Acceso restringido a administradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {error && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center text-red-600">
            <p>Error al cargar la documentación: {error}</p>
          </div>
        </div>
      )}
      {!spec && !error && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
            <p className="text-gray-600">Cargando documentación...</p>
          </div>
        </div>
      )}
      <div ref={containerRef} className={spec ? "" : "hidden"} />
    </div>
  );
}
