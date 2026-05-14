"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, FileDown, Loader, ShoppingCart, Pencil } from "lucide-react";
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
        <div className="space-y-6">
            <section className="bg-white border border-border rounded-2xl shadow-card overflow-hidden p-6">
                <PageTitle
                    breadcrumb="Proveedores / Ordenes de Compra"
                    title="Orden de Compra"
                    Icon={ShoppingCart}
                    actions={
                        <div className="flex gap-2">
                            <Link href={`/proveedores/ordenes?mode=edit&id=${id}`}>
                                <Button variant="outline" className="gap-2">
                                    <Pencil size={15} /> Editar
                                </Button>
                            </Link>
                            <Button variant="generate" className="gap-2" onClick={openPdf}>
                                <FileDown size={15} /> PDF
                            </Button>
                            <Link href="/proveedores/ordenes">
                                <Button variant="primary" className="gap-2">
                                    <ArrowLeft size={16} /> Volver
                                </Button>
                            </Link>
                        </div>
                    }
                />
            </section>

            {/* Body */}
            <div className="flex gap-4 items-start">

                <aside className="w-[252px] shrink-0 sticky top-4 bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="bg-primary px-6 py-6 flex flex-col items-center text-center">
                        {/* Avatar con inicial del nombre */}
                        <div className="w-[60px] h-[60px] rounded-full bg-white/20 flex items-center justify-center mb-3 ring-2 ring-white/30">
                            <span className="text-[18px] font-bold text-white tracking-wide font-oswald">
                                OC
                            </span>
                        </div>
                        <h2 className="text-white font-semibold text-md leading-snug font-oswald">
                            {orden.folio}
                        </h2>
                        <p className="text-white/55 text-xs mt-0.5 leading-snug">Orden de Compra</p>
                    </div>

                    {/* KPI's */}
                    <div className="p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.10em] text-slate-400 mb-2.5 px-1">
                            Indicadores clave
                        </p>
                        <div className="space-y-0.5">
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Subtotal</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0">
                                    {fmt(orden.subtotal)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Fecha de Registro</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0 ">
                                    {fmtDate(orden.created_at)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Fecha de Orden</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0 ">
                                    {fmtDate(orden.fecha)}
                                </span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Content */}
                <div className="flex-1 min-w-0 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-100">
                        <section className="px-8 py-6 border-b border-middleborder">
                            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 mb-5 font-oswald">
                                Informacion General
                            </h3>

                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Folio</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{orden.folio}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Proveedor</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{orden.proveedor_nombre}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Almacen Destino</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{orden.almacen_nombre}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Giro</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{orden.proveedor_giro || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Fecha de Registro</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{fmtDate(orden.created_at)}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Fecha Prevista</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{fmtDate(orden.fecha)}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Estado</p>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                                </div>
                            </div>
                        </section>

                        <section className="px-8 py-6 border-b border-middleborder">
                            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 mb-5 font-oswald">
                                Productos de la Orden
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[600px] text-sm">
                                    <thead className="bg-slate-100 text-primary">
                                        <tr>
                                            <th className="text-left p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Producto / Presentacion</th>
                                            <th className="text-left p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Codigo</th>
                                            <th className="text-center p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Cantidad</th>
                                            <th className="text-right p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Costo Unit.</th>
                                            <th className="text-right p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Importe</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(orden.detalles || []).length === 0 && (
                                            <tr><td colSpan={5} className="p-6 text-center text-muted">Sin productos.</td></tr>
                                        )}
                                        {(orden.detalles || []).map((d) => (
                                            <tr key={d.id_detalle} className="border-t border-border hover:bg-background/50">
                                                <td className="p-3">
                                                    <p className="font-medium text-primary">{d.presentacion_nombre || d.descripcion_manual || "Producto manual"}</p>
                                                    <p className="text-xs text-muted">{d.producto_nombre || d.descripcion_manual || "-"}</p>
                                                </td>
                                                <td className="p-3 font-mono text-xs text-muted">{d.codigo_barras || d.codigo_manual || "-"}</td>
                                                <td className="p-3 text-center">{d.cantidad}</td>
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
                        </section>

                        <section className="px-8 py-6">
                            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 mb-5 font-oswald">
                                Notas
                            </h3>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{orden.notas || "Sin notas adicionales."}</p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
