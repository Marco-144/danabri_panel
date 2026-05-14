"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader, FileText, ArrowLeft, FileDown, Pencil } from "lucide-react";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import { getCotizacionEmpresaById } from "@/services/cotizacionesEmpresasService";

const IVA_RATE = 0.16;

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fmtDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("es-MX");
}

function to6(value) {
    return Math.round(Number(value || 0) * 1000000) / 1000000;
}

export default function CotizacionEmpresaVerView({ id }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadCotizacion() {
            try {
                setLoading(true);
                const result = await getCotizacionEmpresaById(id);
                setData(result);
                setError("");
            } catch (loadError) {
                setError(loadError.message || "No se pudo cargar la cotizacion");
                setData(null);
            } finally {
                setLoading(false);
            }
        }

        loadCotizacion();
    }, [id]);


    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>;
    }

    if (!data) {
        return null;
    }

    const totalConIva = to6((data.detalles || []).reduce(
        (acc, line) => acc + (Number(line.cantidad_factura || line.cantidad || 0) * Number(line.precio_con_iva || (Number(line.precio_sin_iva || 0) * (1 + IVA_RATE)))),
        0
    ));

    function buildPrintableHtml({ includeIva }) {
        const rowsHtml = (data.detalles || []).map((line, index) => {
            const qty = Number(line.cantidad_factura || line.cantidad || 0);
            const unitPrice = includeIva
                ? Number(line.precio_con_iva || Number(line.precio_sin_iva || 0) * (1 + IVA_RATE))
                : Number(line.precio_sin_iva || 0);
            const amount = qty * unitPrice;
            const desc = String(line.descripcion_personalizada || line.descripcion || "-");

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${desc}</td>
                    <td style="text-align:right;">${qty}</td>
                    <td style="text-align:right;">$${unitPrice.toFixed(2)}</td>
                    <td style="text-align:right;">$${amount.toFixed(2)}</td>
                </tr>
            `;
        }).join("");

        const total = includeIva ? totalConIva : Number(data.total || 0);

        return `
            <html>
            <head>
                <title>Cotizacion Empresas</title>
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
                <h1>COTIZACION DE EMPRESAS</h1>
                <div class="meta">
                    <div><strong>Empresa:</strong> ${data.empresa_nombre || "-"}</div>
                    <div><strong>Fecha de emision:</strong> ${fmtDate(data.fecha_emision)}</div>
                    <div><strong>Vigencia:</strong> ${data.vigencia_dias || 0} dias</div>
                    <div style="margin-top:8px;"><em>${includeIva ? "Los precios incluyen IVA." : "Los precios y totales estan expresados sin IVA."}</em></div>
                </div>
                <h3>Productos</h3>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Descripcion</th>
                            <th>Cantidad (factura)</th>
                            <th>Precio unitario</th>
                            <th>Importe</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
                <div class="total-wrap">Total: $${Number(total || 0).toFixed(2)}</div>
            </body>
            </html>
        `;
    }

    function openPrintPreview(includeIva) {
        const popup = window.open("", "_blank", "width=1000,height=800");
        if (!popup) return;
        popup.document.write(buildPrintableHtml({ includeIva }));
        popup.document.close();
        popup.focus();
    }

    return (
        <div className="space-y-6">
            <section className="bg-white border border-border rounded-2xl shadow-card overflow-hidden p-6">
                <PageTitle
                    breadcrumb="Cotizaciones / Detalle"
                    title="Detalle de cotizacion"
                    Icon={FileText}
                    actions={(
                        <div className="flex gap-2">
                            <Button variant="generate" onClick={() => openPrintPreview(true)}>
                                <FileDown size={16} />PDF c/IVA
                            </Button>
                            <Button variant="generate" onClick={() => openPrintPreview(false)}>
                                <FileDown size={16} />PDF s/IVA
                            </Button>
                            <Link href={`/empresas/remisiones?mode=add&id_cotizacion_empresa=${data.id_cotizacion_empresa}`}>
                                <Button variant="primary" className="gap-2">
                                    <FileText size={16} />Crear Remision
                                </Button>
                            </Link>
                            <Link href={`/clientes/cotizaciones?mode=edit&id=${data.id_cotizacion}`}>
                                <Button variant="outline" className="gap-2"><Pencil size={16} />Editar</Button>
                            </Link>
                            <Link href="/empresas/cotizaciones">
                                <Button variant="primary" className="gap-2">
                                    <ArrowLeft size={16} /> Volver
                                </Button>
                            </Link>
                        </div>
                    )}
                />
            </section>

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
                            COT-E-{String(data.id_cotizacion_empresa).padStart(5, "0")}
                        </h2>
                        <p className="text-white/55 text-xs mt-0.5 leading-snug">Propuesta comercial</p>
                    </div>

                    <div className="p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.10em] text-slate-400 mb-2.5 px-1">
                            Indicadores clave
                        </p>
                        <div className="space-y-0.5">
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Total s/IVA</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0">
                                    {fmtMoney(data.total)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Total con IVA</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0">
                                    {fmtMoney(totalConIva)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Vigencia</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0">
                                    {`${data.vigencia_dias} días`}
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
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Empresa</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{data.empresa_nombre}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Folio</p>
                                    <p className="text-[15px] text-slate-700 font-medium">COT-E-{String(data.id_cotizacion_empresa).padStart(5, "0")}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Usuario</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{data.usuario_nombre}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Fecha Emisión</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{fmtDate(data.fecha_emision)}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Vigencia</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{data.vigencia_dias} días</p>
                                </div>
                            </div>
                        </section>

                        <section className="px-8 py-6 border-b border-middleborder">
                            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 mb-5 font-oswald">
                                Productos
                            </h3>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[600px] text-sm">
                                    <thead className="bg-slate-100 text-primary">
                                        <tr>
                                            <th className="text-left p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Descripcion</th>
                                            <th className="text-center p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Cantidad</th>
                                            <th className="text-center p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Unidad</th>
                                            <th className="text-right p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Precio sin IVA</th>
                                            <th className="text-right p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Precio con IVA</th>
                                            <th className="text-right p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Total sin IVA</th>
                                            <th className="text-right p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Total con IVA</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data.detalles || []).length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="p-6 text-center text-muted">Sin partidas</td>
                                            </tr>
                                        ) : (data.detalles || []).map((line) => (
                                            <tr key={line.id_detalle} className="border-t border-border hover:bg-background/40">
                                                <td className="p-3">{line.descripcion_personalizada || line.descripcion}</td>
                                                <td className="p-3 text-center">{line.cantidad_factura || line.cantidad}</td>
                                                <td className="p-3 text-center">{line.unidad}</td>
                                                <td className="p-3 text-right">{fmtMoney(line.precio_sin_iva)}</td>
                                                <td className="p-3 text-right">{fmtMoney(line.precio_con_iva)}</td>
                                                <td className="p-3 text-right font-semibold text-primary">{fmtMoney(line.total)}</td>
                                                <td className="p-3 text-right font-semibold text-primary">{fmtMoney(
                                                    (Number(line.cantidad_factura || line.cantidad || 0) *
                                                        Number(line.precio_con_iva || (Number(line.precio_sin_iva || 0) * (1 + IVA_RATE))))
                                                )}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="px-8 py-6">
                            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 mb-5 font-oswald">
                                Totales
                            </h3>

                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Total s/IVA</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{fmtMoney(data.total)}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Total c/IVA</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{fmtMoney(totalConIva)}</p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
