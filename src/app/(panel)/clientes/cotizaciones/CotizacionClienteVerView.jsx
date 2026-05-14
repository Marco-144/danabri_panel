"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader, Pencil, FileDown, FileText } from "lucide-react";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import { getCotizacionClienteById } from "@/services/cotizacionesClientesService";

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fmtDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("es-MX");
}

function to6(value) {
    return Math.round(Number(value || 0) * 100) / 100;
}

function buildPrintableHtml(data, includeIva) {
    const rowsHtml = (data.detalles || []).map((line, index) => {
        const basePriceWithoutIva = Number(line.precio_sin_iva || line.precio || 0);
        const unitPrice = includeIva ? basePriceWithoutIva * 1.16 : basePriceWithoutIva;
        const amount = includeIva ? (basePriceWithoutIva * 1.16 * Number(line.cantidad || 0)) : (basePriceWithoutIva * Number(line.cantidad || 0));
        return `
            <tr>
                <td>${index + 1}</td>
                <td>${line.presentacion_nombre || line.presentacion_nombre_default || line.producto_nombre || "-"}</td>
                <td style="text-align:right;">${Number(line.cantidad || 0)}</td>
                <td style="text-align:right;">$${to6(unitPrice).toFixed(2)}</td>
                <td style="text-align:right;">$${to6(amount).toFixed(2)}</td>
            </tr>
        `;
    }).join("");

    const total = includeIva ? (Number(data.total || 0) * 1.16) : Number(data.total || 0);

    return `
        <html>
        <head>
            <title>Cotizacion ${data.folio || ""}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
                h1 { text-align: center; margin-bottom: 20px; }
                .meta { margin-bottom: 20px; line-height: 1.8; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #d1d5db; padding: 8px; }
                th { background: #f3f4f6; text-align: left; }
                .total-wrap { margin-top: 16px; text-align: right; font-size: 20px; font-weight: 700; }
            </style>
        </head>
        <body>
            <h1>COTIZACION DE CLIENTE</h1>
            <div class="meta">
                <div><strong>Folio:</strong> ${data.folio || "-"}</div>
                <div><strong>Cliente:</strong> ${data.cliente_nombre || "-"}</div>
                <div><strong>Fecha de emision:</strong> ${fmtDate(data.fecha_emision || data.created_at)}</div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Descripcion</th>
                        <th style="text-align:right;">Cantidad</th>
                        <th style="text-align:right;">Precio unitario</th>
                        <th style="text-align:right;">Importe</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
            <div class="total-wrap">Total: $${Number(total || 0).toFixed(2)}</div>
        </body>
        </html>
    `;
}

export default function CotizacionClienteVerView({ id }) {
    const searchParams = useSearchParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const printedRef = useRef(false);

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const result = await getCotizacionClienteById(id);
                setData(result);
                setError("");
            } catch (e) {
                setData(null);
                setError(e.message || "No se pudo cargar la cotizacion");
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [id]);

    useEffect(() => {
        if (!data) return;
        const printMode = searchParams.get("print");
        if (!printMode || printedRef.current) return;

        const includeIva = printMode === "iva";
        const popup = window.open("", "_blank", "width=1000,height=800");
        if (!popup) return;

        popup.document.write(buildPrintableHtml(data, includeIva));
        popup.document.close();
        popup.focus();
        printedRef.current = true;
    }, [data, searchParams]);

    if (loading) {
        return <div className="h-64 flex items-center justify-center"><Loader className="animate-spin text-primary" /></div>;
    }

    if (error) {
        return <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>;
    }

    if (!data) return null;

    return (
        <div className="space-y-6">
            <section className="bg-white border border-border rounded-2xl shadow-card overflow-hidden p-6">
                <PageTitle
                    breadcrumb="Cotizaciones / Detalle"
                    title="Detalle de cotizacion"
                    Icon={FileText}
                    actions={(
                        <div className="flex gap-2">
                            <Link href={`/clientes/cotizaciones?mode=view&id=${data.id_cotizacion}&print=iva`}>
                                <Button variant="generate" className="gap-2">
                                    <FileDown size={16} /> PDF c/IVA
                                </Button>
                            </Link>
                            <Link href={`/clientes/cotizaciones?mode=view&id=${data.id_cotizacion}&print=siniva`}>
                                <Button variant="generate" className="gap-2">
                                    <FileDown size={16} /> PDF s/IVA
                                </Button>
                            </Link>
                            <Link href={`/clientes/remisiones?mode=add&id_cotizacion=${data.id_cotizacion}`}>
                                <Button>Crear Remision</Button>
                            </Link>
                            <Link href={`/clientes/cotizaciones?mode=edit&id=${data.id_cotizacion}`}>
                                <Button variant="outline" className="gap-2"><Pencil size={16} />Editar</Button>
                            </Link>
                            <Link href="/clientes/cotizaciones">
                                <Button variant="primary" className="gap-2"><ArrowLeft size={16} />Volver</Button>
                            </Link>
                        </div>
                    )}
                />
            </section>

            {/* Body */}
            <div className="flex gap-4 items-start">

                <aside className="w-[252px] shrink-0 sticky top-4 bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="bg-primary px-6 py-6 flex flex-col items-center text-center">
                        {/* Avatar con inicial del nombre */}
                        <div className="w-[60px] h-[60px] rounded-full bg-white/20 flex items-center justify-center mb-3 ring-2 ring-white/30">
                            <span className="text-[18px] font-bold text-white tracking-wide font-oswald">
                                COT
                            </span>
                        </div>
                        <h2 className="text-white font-semibold text-md leading-snug font-oswald">
                            {data.folio}
                        </h2>
                        <p className="text-white/55 text-xs mt-0.5 leading-snug">Propuesta comercial</p>
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
                                    {to6(data.subtotal).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">IVA 16%</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0">
                                    {to6(data.iva).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Total</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0">
                                    {to6(data.total).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Valida hasta</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0">
                                    {data.fechaExpiracion ? new Date(data.fechaExpiracion).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "-"}
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
                                    <p className="text-[15px] text-slate-700 font-medium">{data.folio}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Fecha</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{data.fecha_emision ? new Date(data.fecha_emision).toLocaleDateString("es-MX") : "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Valida hasta</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{data.fechaExpiracion ? new Date(data.fechaExpiracion).toLocaleDateString("es-MX") : "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Estado</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{data.estado}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Total</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{data.total?.toLocaleString("es-MX", { style: "currency", currency: "MXN" }) || "-"}</p>
                                </div>
                            </div>
                        </section>

                        <section className="px-8 py-6 border-b border-middleborder">
                            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 mb-5 font-oswald">
                                Informacion del cliente
                            </h3>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Cliente</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{data.cliente_nombre}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">RFC</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{data.cliente_rfc || "-"}</p>
                                </div>
                            </div>
                        </section>

                        <section className="px-8 py-6">
                            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 mb-5 font-oswald">
                                Productos
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[600px] text-sm">
                                    <thead className="bg-slate-100 text-primary">
                                        <tr>
                                            <th className="text-center p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">#</th>
                                            <th className="text-left p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Producto</th>
                                            <th className="text-left p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Cantidad</th>
                                            <th className="text-left p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Precio Unit.</th>
                                            <th className="text-right p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data.detalles || []).length === 0 ? (
                                            <tr><td colSpan={4} className="p-6 text-center text-muted">Sin productos</td></tr>
                                        ) : (data.detalles || []).map((line, index) => (
                                            <tr key={line.id_detalle} className="border-t border-border hover:bg-background/40">
                                                <td className="p-3 text-center">{index + 1}</td>
                                                <td className="p-3 text-left">{line.presentacion_nombre || line.presentacion_nombre_default || line.producto_nombre || "-"}</td>
                                                <td className="p-3 text-left">{line.cantidad}</td>
                                                <td className="p-3 text-left">{fmtMoney(line.precio)}</td>
                                                <td className="p-3 text-right font-semibold text-primary">{fmtMoney(line.subtotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
