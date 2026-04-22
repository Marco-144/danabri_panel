"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, Loader, Pencil } from "lucide-react";
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
        <div className="space-y-5">
            <PageTitle
                title={`Cotizacion #${data.id_cotizacion_empresa}`}
                subtitle="Detalle de cotizacion de empresa"
                actions={(
                    <div className="flex gap-2">
                        <Button variant="danger" onClick={() => openPrintPreview(true)}>
                            Generar PDF (con IVA)
                        </Button>
                        <Button variant="danger" onClick={() => openPrintPreview(false)}>
                            Generar PDF (sin IVA)
                        </Button>
                        <Link href={`/empresas/remisiones?mode=add&id_cotizacion_empresa=${data.id_cotizacion_empresa}`}>
                            <Button variant="activo">Crear Remision</Button>
                        </Link>
                        <Link href={`/empresas/cotizaciones?mode=edit&id=${data.id_cotizacion_empresa}`}>
                            <Button variant="outline" className="gap-2">
                                <Pencil size={16} /> Editar
                            </Button>
                        </Link>
                        <Link href="/empresas/cotizaciones">
                            <Button variant="outline" className="gap-2">
                                <ChevronLeft size={16} /> Volver
                            </Button>
                        </Link>
                    </div>
                )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <FieldCard label="Empresa" value={data.empresa_nombre} />
                <FieldCard label="Usuario" value={data.usuario_nombre} />
                <FieldCard label="Fecha emision" value={fmtDate(data.fecha_emision)} />
                <FieldCard label="Vigencia" value={`${data.vigencia_dias} dias`} />
                <FieldCard label="Total sin IVA" value={fmtMoney(data.total)} />
                <FieldCard label="Total con IVA" value={fmtMoney(totalConIva)} />
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-card overflow-x-auto">
                <table className="w-full min-w-[1180px] text-sm">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">Descripcion</th>
                            <th className="text-left p-3">Req.</th>
                            <th className="text-right p-3">Cant. factura</th>
                            <th className="text-right p-3">Cant. sistema</th>
                            <th className="text-left p-3">Unidad</th>
                            <th className="text-right p-3">Precio sin IVA</th>
                            <th className="text-right p-3">Precio con IVA</th>
                            <th className="text-right p-3">Total sin IVA</th>
                            <th className="text-right p-3">Piso</th>
                            <th className="text-right p-3">Bodega</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data.detalles || []).length === 0 ? (
                            <tr>
                                <td colSpan={10} className="p-6 text-center text-muted">Sin partidas</td>
                            </tr>
                        ) : (data.detalles || []).map((line) => (
                            <tr key={line.id_detalle} className="border-t border-border hover:bg-background/40">
                                <td className="p-3">{line.descripcion_personalizada || line.descripcion}</td>
                                <td className="p-3">{line.requerimiento || "-"}</td>
                                <td className="p-3 text-right">{line.cantidad_factura || line.cantidad}</td>
                                <td className="p-3 text-right">{line.cantidad_sistema || line.cantidad || "-"}</td>
                                <td className="p-3">{line.unidad}</td>
                                <td className="p-3 text-right">{fmtMoney(line.precio_sin_iva)}</td>
                                <td className="p-3 text-right">{fmtMoney(line.precio_con_iva)}</td>
                                <td className="p-3 text-right font-semibold text-primary">{fmtMoney(line.total)}</td>
                                <td className="p-3 text-right">{line.piso ?? "-"}</td>
                                <td className="p-3 text-right">{line.bodega ?? "-"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function FieldCard({ label, value }) {
    return (
        <div className="bg-white rounded-2xl border border-border shadow-card p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className="text-sm font-semibold text-primary mt-1">{value || "-"}</p>
        </div>
    );
}
