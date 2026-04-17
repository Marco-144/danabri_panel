"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, FileDown, Loader, ShoppingCart } from "lucide-react";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import FieldCard from "@/components/ui/FieldCard";
import { getOrdenCompraById } from "@/services/ordenesCompraService";

const STATUS_CONFIG = {
    pendiente: { label: "Pendiente", bg: "bg-yellow-100", text: "text-yellow-800" },
    recibida: { label: "Recibida", bg: "bg-activo/20", text: "text-activo" },
    parcial: { label: "Parcial", bg: "bg-blue-100", text: "text-blue-800" },
    cancelada: { label: "Cancelada", bg: "bg-red-100", text: "text-red-700" },
};

function fmt(n) {
    return Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fmtDate(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function VerOrden({ id }) {
    const [orden, setOrden] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        getOrdenCompraById(id)
            .then(setOrden)
            .catch((err) => setError(err.message || "Error al cargar la orden"))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="flex items-center justify-center h-64"><Loader className="animate-spin text-primary" /></div>;
    if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">{error}</div>;
    if (!orden) return null;

    const cfg = STATUS_CONFIG[orden.status] || STATUS_CONFIG.pendiente;
    const openPdf = () => window.open(`/api/ordenes-compra?pdf=1&id=${id}`, "_blank", "noopener,noreferrer");

    return (
        <div className="space-y-5">
            <PageTitle
                title={`Orden ${orden.folio}`}
                subtitle="Detalle de la orden de compra"
                icon={<ShoppingCart size={22} />}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" className="gap-2" onClick={openPdf}>
                            <FileDown size={15} /> PDF
                        </Button>
                        <Link href="/proveedores/ordenes">
                            <Button variant="outline" className="gap-2">
                                <ChevronLeft size={16} /> Volver
                            </Button>
                        </Link>
                    </div>
                }
            />

            <div className="bg-white rounded-2xl border border-border shadow-card p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-primary">Informacion General</h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <FieldCard label="Folio" value={orden.folio} />
                    <FieldCard label="Proveedor" value={orden.proveedor_nombre} />
                    <FieldCard label="Almacen" value={orden.almacen_nombre || "-"} />
                    <FieldCard label="Giro" value={orden.proveedor_giro || "-"} />
                    <FieldCard label="Fecha" value={fmtDate(orden.fecha)} />
                    <FieldCard label="Registrada" value={fmtDate(orden.created_at)} />
                    <FieldCard label="Usuario" value={orden.usuario_nombre || "-"} />
                    {orden.notas && (
                        <div className="sm:col-span-2 md:col-span-3">
                            <FieldCard label="Notas" value={orden.notas} />
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
                <div className="p-4 border-b border-border">
                    <h2 className="font-semibold text-primary">Productos de la Orden</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                        <thead className="bg-background text-primary">
                            <tr>
                                <th className="text-left p-3">Producto / Presentacion</th>
                                <th className="text-left p-3">Codigo</th>
                                <th className="text-right p-3">Cantidad</th>
                                <th className="text-right p-3">Costo Unit.</th>
                                <th className="text-right p-3">Importe</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(orden.detalles || []).length === 0 && (
                                <tr><td colSpan={5} className="p-6 text-center text-muted">Sin productos.</td></tr>
                            )}
                            {(orden.detalles || []).map((d) => (
                                <tr key={d.id_detalle} className="border-t border-border hover:bg-background/50">
                                    <td className="p-3">
                                        <p className="font-medium text-primary">{d.presentacion_nombre}</p>
                                        <p className="text-xs text-muted">{d.producto_nombre}</p>
                                    </td>
                                    <td className="p-3 font-mono text-xs text-muted">{d.codigo_barras || "-"}</td>
                                    <td className="p-3 text-right">{d.cantidad}</td>
                                    <td className="p-3 text-right">{fmt(d.costo_unitario)}</td>
                                    <td className="p-3 text-right font-semibold text-primary">{fmt(d.subtotal)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="border-t border-border p-4 flex justify-end">
                    <div className="w-64 space-y-2 text-sm">
                        <div className="flex justify-between text-muted">
                            <span>Subtotal</span>
                            <span className="font-medium text-primary">{fmt(orden.subtotal)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
