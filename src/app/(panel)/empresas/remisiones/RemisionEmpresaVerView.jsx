"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Download, Loader, Pencil, Printer } from "lucide-react";
import Button from "@/components/ui/Button";
import FieldCard from "@/components/ui/FieldCard";
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
                <td>${String(line.descripcion || "-")}</td>
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
        <div className="space-y-5">
            <PageTitle
                title={`Remision ${data.folio_remision}`}
                subtitle="Detalle completo de remision a empresa"
                actions={(
                    <div className="flex gap-2">
                        <Button variant="outline" className="gap-2" onClick={handlePrint}><Printer size={16} /> Imprimir remision</Button>
                        <Link href="/empresas/remisiones">
                            <Button variant="outline" className="gap-2"><ChevronLeft size={16} /> Volver</Button>
                        </Link>
                        <Link href={`/empresas/remisiones?mode=edit&id=${data.id_remision_empresa}`}>
                            <Button variant="outline" className="gap-2"><Pencil size={16} /> Editar</Button>
                        </Link>
                        <Link href={`/empresas/abonos?id_remision_empresa=${data.id_remision_empresa}`}>
                            <Button>Ver Abonos</Button>
                        </Link>
                        {data.facturada ? (
                            <a href={getDownloadRemisionFacturaUrl(data.id_remision_empresa, "pdf")} target="_blank" rel="noreferrer">
                                <Button variant="outline" className="gap-2"><Download size={16} /> Descargar factura</Button>
                            </a>
                        ) : null}
                    </div>
                )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <FieldCard label="Empresa" value={data.empresa_nombre_fiscal || data.empresa_nombre} />
                <FieldCard label="RFC Empresa" value={data.empresa_rfc || "-"} />
                <FieldCard label="Dirección" value={data.empresa_direccion || "-"} />
                <FieldCard label="Colonia" value={data.empresa_colonia || "-"} />
                <FieldCard label="Ciudad" value={data.empresa_ciudad || "-"} />
                <FieldCard label="Estado" value={data.empresa_estado || "-"} />
                <FieldCard label="Código Postal" value={data.empresa_cp || "-"} />
                <FieldCard label="Fecha remision" value={fmtDate(data.fecha_remision)} />
                <FieldCard label="Referencia cotizacion" value={data.id_cotizacion_empresa ? `Basado en Cotizacion #${data.id_cotizacion_empresa}` : "Sin cotizacion base"} />
                <FieldCard label="Observaciones" value={data.observaciones || "-"} />
                <FieldCard label="Total sin IVA" value={fmtMoney(totalSinIva)} />
                <FieldCard label="Total con IVA" value={fmtMoney(totalConIva)} />
                <FieldCard label="Estado" value={data.estado_pago} />
                <FieldCard label="Factura" value={data.facturada ? (data.folio_factura || "Si") : "No"} />
                <FieldCard label="Fecha factura" value={fmtDate(data.fecha_factura)} />
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-card overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">Descripcion</th>
                            <th className="text-right p-3">Cant. factura</th>
                            <th className="text-left p-3">Unidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data.detalles || []).length === 0 ? (
                            <tr><td colSpan={3} className="p-6 text-center text-muted">Sin partidas</td></tr>
                        ) : (data.detalles || []).map((line) => (
                            <tr key={line.id_detalle_remision_empresa} className="border-t border-border hover:bg-background/40">
                                <td className="p-3">{line.descripcion}</td>
                                <td className="p-3 text-right">{line.cantidad_factura}</td>
                                <td className="p-3">{line.unidad}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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
