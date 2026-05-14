"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, Download, Loader, Power, ShieldCheck, CalendarClock } from "lucide-react";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import { cerrarFacturaInventario, getFacturaById, getDownloadFacturaUrl } from "@/services/facturasProveedorService";

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fmtDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("es-MX");
}

function statusBadge(status) {
    if (status === "pagada") return "bg-activo/20 text-activo";
    if (status === "parcial") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-700";
}

export default function FacturaDetalleView({ id }) {
    const [factura, setFactura] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [closing, setClosing] = useState(false);

    async function loadFactura() {
        try {
            setLoading(true);
            const data = await getFacturaById(id);
            setFactura(data);
            setError("");
        } catch (err) {
            setError(err.message || "No se pudo cargar la factura");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadFactura();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    async function handleCloseFactura() {
        try {
            setClosing(true);
            await cerrarFacturaInventario(id);
            await loadFactura();
        } catch (err) {
            setError(err.message || "No se pudo cerrar la factura");
        } finally {
            setClosing(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">{error}</div>;
    }

    if (!factura) return null;

    const puedeCerrar = factura.estado_pago === "pagada" && !factura.inventario_cerrado_at;

    return (
        <div className="space-y-6">
            <section className="bg-white border border-border rounded-2xl shadow-card overflow-hidden p-6">
                <PageTitle
                    title={`Factura ${factura.folio_factura}`}
                    subtitle="Detalle, pagos e historial de cierre de inventario"
                    actions={(
                        <div className="flex flex-wrap gap-2 justify-end">
                            <a href={getDownloadFacturaUrl(factura.id_factura, "pdf")} target="_blank" rel="noreferrer">
                                <Button variant="outline" className="gap-2">
                                    <Download size={16} /> PDF
                                </Button>
                            </a>
                            <Link href={`/proveedores/pagos-pendientes?id_factura=${factura.id_factura}`}>
                                <Button variant="outline" className="gap-2">
                                    <CalendarClock size={16} /> Ver pagos / registrar pago
                                </Button>
                            </Link>
                            <Link href="/proveedores/facturas">
                                <Button variant="outline" className="gap-2">
                                    <ChevronLeft size={16} /> Volver
                                </Button>
                            </Link>
                        </div>
                    )}
                />
            </section>

            <div className="flex gap-4 items-start">
                <aside className="w-[252px] shrink-0 sticky top-4 bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="bg-primary px-6 py-6 flex flex-col items-center text-center">
                        <div className="w-[60px] h-[60px] rounded-full bg-white/20 flex items-center justify-center mb-3 ring-2 ring-white/30">
                            <span className="text-[18px] font-bold text-white tracking-wide font-oswald">FAC</span>
                        </div>
                        <h2 className="text-white font-semibold text-md leading-snug font-oswald">{factura.folio_factura}</h2>
                        <p className="text-white/55 text-xs mt-0.5 leading-snug">Factura</p>
                    </div>

                    <div className="p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.10em] text-slate-400 mb-2.5 px-1">Indicadores clave</p>
                        <div className="space-y-0.5">
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Subtotal</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0">{fmtMoney(factura.total)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Fecha de Registro</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0 ">{fmtDate(factura.created_at)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Fecha Factura</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0 ">{fmtDate(factura.fecha_factura)}</span>
                            </div>
                        </div>
                    </div>
                </aside>

                <div className="flex-1 min-w-0 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-100">
                        <section className="px-8 py-6 border-b border-middleborder">
                            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 mb-5 font-oswald">Informacion General</h3>

                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Proveedor</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{factura.proveedor_nombre}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Almacén</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{factura.almacen_nombre}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Orden</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{factura.orden_folio || "Sin orden"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Fecha factura</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{fmtDate(factura.fecha_factura)}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Fecha vencimiento</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{fmtDate(factura.fecha_vencimiento)}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Saldo pendiente</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{fmtMoney(factura.saldo_pendiente)}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Total</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{fmtMoney(factura.total)}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Pagado</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{fmtMoney(factura.total_pagado)}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default flex items-center justify-between">
                                    <div>
                                        <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Estado</p>
                                        <span className={`mt-1 inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(factura.estado_pago)}`}>{factura.estado_pago}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-muted">Cierre inventario</p>
                                        <p className="font-medium text-primary">{factura.inventario_cerrado_at ? fmtDate(factura.inventario_cerrado_at) : "Pendiente"}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {factura.observaciones ? (
                            <section className="px-8 py-6 border-b border-middleborder">
                                <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 mb-5 font-oswald">Observaciones</h3>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{factura.observaciones}</p>
                            </section>
                        ) : null}

                        <section className="px-8 py-6 border-b border-middleborder">
                            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 mb-5 font-oswald">Productos de la factura</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[900px]">
                                    <thead className="bg-background text-primary">
                                        <tr>
                                            <th className="text-left p-3">Producto / Presentación</th>
                                            <th className="text-left p-3">Código</th>
                                            <th className="text-right p-3">Cantidad</th>
                                            <th className="text-right p-3">Costo s/IVA</th>
                                            <th className="text-right p-3">Subtotal s/IVA</th>
                                            <th className="text-right p-3">Subtotal c/IVA</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(factura.detalles || []).length === 0 ? (
                                            <tr><td colSpan={6} className="p-6 text-center text-muted">Sin productos</td></tr>
                                        ) : factura.detalles.map((d) => (
                                            <tr key={d.id_detalle} className="border-t border-border hover:bg-background/40">
                                                <td className="p-3">
                                                    <p className="font-medium text-primary">{d.presentacion_nombre}</p>
                                                    <p className="text-xs text-muted">{d.producto_nombre}</p>
                                                </td>
                                                <td className="p-3 font-mono text-xs text-muted">{d.codigo_barras || "-"}</td>
                                                <td className="p-3 text-right">{d.cantidad_recibida}</td>
                                                <td className="p-3 text-right">{fmtMoney(d.costo_unitario_sin_iva)}</td>
                                                <td className="p-3 text-right font-medium text-primary">{fmtMoney(d.subtotal_sin_iva)}</td>
                                                <td className="p-3 text-right font-medium text-primary">{fmtMoney(d.subtotal_con_iva)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="px-8 py-6">
                            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 mb-5 font-oswald">Pagos registrados</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[900px]">
                                    <thead className="bg-background text-primary">
                                        <tr>
                                            <th className="text-left p-3">Fecha</th>
                                            <th className="text-right p-3">Monto</th>
                                            <th className="text-left p-3">Método</th>
                                            <th className="text-left p-3">Referencia</th>
                                            <th className="text-left p-3">Observaciones</th>
                                            <th className="text-left p-3">Registro</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(factura.pagos || []).length === 0 ? (
                                            <tr><td colSpan={6} className="p-6 text-center text-muted">Sin pagos registrados</td></tr>
                                        ) : factura.pagos.map((pago) => (
                                            <tr key={pago.id_pago} className="border-t border-border hover:bg-background/40">
                                                <td className="p-3">{fmtDate(pago.fecha_pago)}</td>
                                                <td className="p-3 text-right font-medium text-primary">{fmtMoney(pago.monto)}</td>
                                                <td className="p-3 capitalize">{pago.metodo_pago || "-"}</td>
                                                <td className="p-3">{pago.referencia_pago || "-"}</td>
                                                <td className="p-3 text-muted max-w-[260px] truncate" title={pago.observaciones_pago || ""}>{pago.observaciones_pago || "-"}</td>
                                                <td className="p-3 text-xs text-muted">{fmtDate(pago.created_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 text-sm text-right text-muted">Total pagado: <strong className="text-primary">{fmtMoney(factura.total_pagado)}</strong></div>
                        </section>

                        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end p-6">
                            {puedeCerrar ? (
                                <Button variant="primary" className="gap-2" onClick={handleCloseFactura} disabled={closing}>
                                    <ShieldCheck size={16} /> {closing ? "Cerrando..." : "Cerrar factura y añadir al inventario"}
                                </Button>
                            ) : (
                                <Button variant="outline" className="gap-2" disabled>
                                    <Power size={16} /> {factura.inventario_cerrado_at ? "Factura cerrada" : "Disponible al quedar pagada"}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
