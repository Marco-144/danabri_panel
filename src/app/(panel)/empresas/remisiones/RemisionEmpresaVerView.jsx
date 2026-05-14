"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Loader, Pencil, Printer, Truck } from "lucide-react";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import { getDownloadRemisionFacturaUrl, getRemisionEmpresaById } from "@/services/remisionesEmpresasService";

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fmtDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("es-MX");
}

export default function RemisionEmpresaVerView({ id }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const isTrueFlag = (value) => value === 1 || value === "1" || value === true;

    const getEstadoMeta = (valor) => {
        const key = String(valor || "").trim().toLowerCase();
        const map = {
            pendiente: { label: "Pendiente", classes: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
            parcial: { label: "Parcial", classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
            pagada: { label: "Pagada", classes: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
            cancelada: { label: "Cancelada", classes: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
        };

        return map[key] ? map[key] : { label: (valor != null ? String(valor).replace(/_/g, ' ') : '-'), classes: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200' };
    };

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const result = await getRemisionEmpresaById(id);
                setData(result);
                setError("");
            } catch (e) {
                setData(null);
                setError(e.message || "No se pudo cargar la remision");
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [id]);

    const totalSinIva = useMemo(() => Number(data?.total_sin_iva || 0), [data]);
    const totalConIva = useMemo(() => Number(data?.total_con_iva || 0), [data]);

    function buildPrintableHtml() {
        const detalles = Array.isArray(data?.detalles) ? data.detalles : [];
        const rowsHtml = detalles.map((line, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${[line.producto_nombre, line.presentacion_nombre].filter(Boolean).join(" ") || String(line.descripcion || "-")}</td>
                <td style="text-align:right;">${Number(line.cantidad_factura || 0)}</td>
                <td>${String(line.unidad || "pieza")}</td>
                <td style="text-align:right;">$${Number(line.precio_con_iva || 0).toFixed(2)}</td>
                <td style="text-align:right;">$${Number(line.total_con_iva || 0).toFixed(2)}</td>
            </tr>
        `).join("");

        return `
            <html>
            <head>
                <title>Remision ${data?.folio_remision || ""}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
                    h1 { text-align: center; margin-bottom: 10px; }
                    .meta { margin-bottom: 18px; line-height: 1.7; }
                    .meta strong { display: inline-block; min-width: 140px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; }
                    th { background: #f3f4f6; text-align: left; }
                    .total-wrap { margin-top: 16px; display: flex; justify-content: flex-end; }
                    .totals { width: 250px; }
                    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
                    .signatures { margin-top: 28px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
                    .sig { border-top: 1px solid #111827; padding-top: 8px; min-height: 48px; }
                    .sig label { display: block; font-size: 11px; color: #6b7280; margin-bottom: 6px; }
                    .sig span { display: block; font-size: 12px; color: #111827; }
                </style>
            </head>
            <body>
                <h1>REMISION DE EMPRESA</h1>
                <div class="meta">
                    <div><strong>Folio de remision:</strong> ${data?.folio_remision || "-"}</div>
                    <div><strong>Fecha de emision:</strong> ${fmtDate(data?.fecha_remision)}</div>
                    <div><strong>Referencia cotizacion:</strong> ${data?.id_cotizacion_empresa ? `Basado en Cotizacion #${data.id_cotizacion_empresa}` : "Sin cotizacion base"}</div>
                    <div><strong>Empresa:</strong> ${data?.empresa_nombre_fiscal || data?.empresa_nombre || "-"}</div>
                    <div><strong>RFC:</strong> ${data?.empresa_rfc || "-"}</div>
                    <div><strong>Direccion:</strong> ${[data?.empresa_direccion, data?.empresa_colonia, data?.empresa_ciudad, data?.empresa_estado, data?.empresa_cp].filter(Boolean).join(", ") || "-"}</div>
                </div>

                <h3>Productos</h3>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Unidad</th>
                            <th>Precio c/IVA</th>
                            <th>Total c/IVA</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml || `
                        <tr>
                            <td>1</td>
                            <td>Sin partidas</td>
                            <td style="text-align:right;">-</td>
                            <td>-</td>
                            <td style="text-align:right;">-</td>
                            <td style="text-align:right;">-</td>
                        </tr>
                    `}</tbody>
                </table>

                <div class="total-wrap">
                    <div class="totals">
                        <div><span>Subtotal</span><strong>$${totalSinIva.toFixed(2)}</strong></div>
                        <div><span>IVA</span><strong>$${Math.max(0, totalConIva - totalSinIva).toFixed(2)}</strong></div>
                        <div style="border-top:1px solid #d1d5db; margin-top:6px; padding-top:6px;"><span>Total</span><strong>$${totalConIva.toFixed(2)}</strong></div>
                    </div>
                </div>

                ${data?.observaciones ? `<div class="meta" style="margin-top:14px;"><strong>Observaciones:</strong> ${String(data.observaciones)}</div>` : ""}

                <div class="signatures">
                    <div class="sig"><label>Nombre de quien recibe</label><span>&nbsp;</span></div>
                    <div class="sig"><label>Firma de recibido</label><span>&nbsp;</span></div>
                    <div class="sig"><label>Fecha de recibido</label><span>&nbsp;</span></div>
                </div>
            </body>
            </html>
        `;
    }

    function handlePrint() {
        const popup = window.open("", "_blank", "width=1100,height=900");
        if (!popup) return;
        popup.document.write(buildPrintableHtml());
        popup.document.close();
        popup.focus();
    }

    if (loading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <Loader className="animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>;
    }

    if (!data) return null;

    return (
        <div className="space-y-6">
            <section className="bg-white border border-border rounded-2xl shadow-card overflow-hidden p-6">
                <PageTitle
                    breadcrumb="Remisión / Detalle"
                    title="Detalle de remisión"
                    Icon={Truck}
                    actions={(
                        <div className="flex gap-2">
                            <Link href={`/empresas/abonos?id_remision_empresa=${data.id_remision_empresa}`}>
                                <Button variant="accent">Ver Abonos</Button>
                            </Link>
                            {data.facturada ? (
                                <a href={getDownloadRemisionFacturaUrl(data.id_remision_empresa, "pdf")} target="_blank" rel="noreferrer">
                                    <Button variant="generate" className="gap-2">
                                        <Download size={16} />
                                        Descargar factura
                                    </Button>
                                </a>
                            ) : null}
                            <Button variant="generate" className="gap-2" onClick={handlePrint}>
                                <Printer size={16} />
                                Imprimir remision
                            </Button>
                            <Link href={`/empresas/remisiones?mode=edit&id=${data.id_remision_empresa}`}>
                                <Button variant="outline" className="gap-2">
                                    <Pencil size={16} />
                                    Editar
                                </Button>
                            </Link>
                            <Link href="/empresas/remisiones">
                                <Button variant="primary" className="gap-2">
                                    <ArrowLeft size={16} /> Volver</Button>
                            </Link>
                        </div>
                    )}
                />
            </section>

            {/* Body */}
            <div className="flex gap-4 items-start">

                {/* Sidebar */}
                <aside className="w-[252px] shrink-0 sticky top-4 bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="bg-primary px-6 py-6 flex flex-col items-center text-center">

                        {/* Avatar con inicial del nombre */}
                        <div className="w-[60px] h-[60px] rounded-full bg-white/20 flex items-center justify-center mb-3 ring-2 ring-white/30">
                            <span className="text-[18px] font-bold text-white tracking-wide font-oswald">
                                REM
                            </span>
                        </div>
                        <h2 className="text-white font-semibold text-md leading-snug font-oswald">
                            {data.folio_remision}
                        </h2>
                        {(() => {
                            const meta = getEstadoMeta(data.estado_pago);
                            return (
                                <span className={`mt-3 inline-flex items-center rounded-full font-medium px-3 py-1 text-xs ${meta.classes}`}>
                                    {meta.label}
                                </span>
                            );
                        })()}
                    </div>

                    {/* KPI's */}
                    <div className="p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.10em] text-slate-400 mb-2.5 px-1">
                            Indicadores clave
                        </p>
                        <div className="space-y-0.5">
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Total</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0">
                                    {fmtMoney(totalConIva)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Fecha</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0">
                                    {fmtDate(data.fecha_remision)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Empresa</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0">
                                    {data.empresa_nombre}
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
                                Información general
                            </h3>

                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Folio</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{data.folio_remision}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Fecha Remisión</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{fmtDate(data.fecha_remision)}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Estado</p>
                                    <p className="text-[15px] text-slate-700 font-medium">
                                        {(() => {
                                            const meta = getEstadoMeta(data.estado_pago);
                                            return (
                                                <span className={`mt-3 inline-flex items-center rounded-full font-medium px-3 py-1 text-xs ${meta.classes}`}>
                                                    {meta.label}
                                                </span>
                                            );
                                        })()}
                                    </p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Empresa</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{data.empresa_nombre}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Nombre Fiscal</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{data.empresa_nombre_fiscal}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">RFC</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{data.empresa_rfc}</p>
                                </div>
                            </div>
                        </section>

                        <section className="px-8 py-6 border-b border-middleborder">
                            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 mb-5 font-oswald">
                                Detalles de Entrega
                            </h3>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[600px] text-sm">
                                    <thead className="bg-slate-50 text-slate-500">
                                        <tr>
                                            <th className="text-left p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Producto</th>
                                            <th className="text-left p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Presentacion</th>
                                            <th className="text-center p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Cantidad</th>
                                            <th className="text-center p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Unidad</th>
                                            <th className="text-right p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Precio</th>
                                            <th className="text-right p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data.detalles || []).length === 0 ? (
                                            <tr><td colSpan={3} className="p-6 text-center text-muted">Sin productos</td></tr>
                                        ) : (data.detalles || []).map((line) => (
                                            <tr key={line.id_detalle_remision_empresa} className="border-t border-border hover:bg-background/40">
                                                <td className="p-3">{[line.producto_nombre].filter(Boolean).join(" ") || line.descripcion || "-"}</td>
                                                <td className="p-3">{line.presentacion_nombre || "-"}</td>
                                                <td className="p-3 text-center">{line.cantidad_factura}</td>
                                                <td className="p-3 text-center">{line.unidad}</td>
                                                <td className="p-3 text-right">{fmtMoney(line.precio_con_iva)}</td>
                                                <td className="p-3 text-right">{fmtMoney(line.total_con_iva)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="px-8 py-6 border-b border-middleborder">
                            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 mb-5 font-oswald">
                                Totales
                            </h3>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Total s/IVA</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{fmtMoney(totalSinIva)}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Total c/IVA</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{fmtMoney(totalConIva)}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Factura</p>
                                    <span className={`mt-3 inline-flex items-center rounded-full font-medium px-3 py-1 text-xs ${isTrueFlag(data.facturada)
                                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                        : "bg-red-50 text-red-700 ring-1 ring-red-200"
                                        }`}>
                                        {isTrueFlag(data.facturada) ? (data.folio_factura || "Facturada") : "No facturada"}
                                    </span>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Total abonado</p>
                                    <p className="inline-flex items-center rounded-full font-medium px-4 py-1 text-xs bg-green-50 text-green-700 ring-1 ring-green-200">{fmtMoney(data.total_abonado)}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Saldo pendiente</p>
                                    <p className="inline-flex items-center rounded-full font-medium px-4 py-1 text-xs bg-red-50 text-red-700 ring-1 ring-red-200">{fmtMoney(data.saldo_pendiente)}</p>
                                </div>
                            </div>
                        </section>

                        <section className="px-8 py-6">
                            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 mb-5 font-oswald">
                                Comentarios y observaciones
                            </h3>
                            <p className="text-sm text-slate-700">{data.observaciones || "Sin observaciones"}</p>
                        </section>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="text-base font-semibold text-primary">Recepcion de remision</h3>
                    <p className="text-sm text-muted">Esta seccion se incluye en la impresion para validar entrega.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-dashed border-border p-4 min-h-[92px]">
                        <p className="text-xs text-muted uppercase tracking-wide mb-6">Nombre de quien recibe</p>
                    </div>
                    <div className="rounded-xl border border-dashed border-border p-4 min-h-[92px]">
                        <p className="text-xs text-muted uppercase tracking-wide mb-6">Firma</p>
                    </div>
                    <div className="rounded-xl border border-dashed border-border p-4 min-h-[92px]">
                        <p className="text-xs text-muted uppercase tracking-wide mb-6">Fecha de recibido</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
