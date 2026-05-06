"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Loader, Pencil, FileDown } from "lucide-react";
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
        const unitPrice = includeIva ? Number(line.precio_con_iva || line.precio || 0) : Number(line.precio_sin_iva || line.precio || 0);
        const amount = includeIva ? Number(line.subtotal_con_iva || line.subtotal || 0) : Number(line.subtotal || 0);
        return `
            <tr>
                <td>${index + 1}</td>
                <td>${line.producto_nombre || "-"}</td>
                <td style="text-align:right;">${Number(line.cantidad || 0)}</td>
                <td style="text-align:right;">$${to6(unitPrice).toFixed(2)}</td>
                <td style="text-align:right;">$${to6(amount).toFixed(2)}</td>
            </tr>
        `;
    }).join("");

    const total = includeIva ? Number(data.total_con_iva || data.total || 0) : Number(data.total || 0);

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

    const total = useMemo(() => Number(data?.total || 0), [data]);

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
        <div className="space-y-5">
            <PageTitle
                title={`Cotizacion ${data.folio}`}
                subtitle="Detalle de cotizacion de cliente"
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
                            <Button variant="outline" className="gap-2"><ChevronLeft size={16} />Volver</Button>
                        </Link>
                    </div>
                )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <FieldCard label="Cliente" value={data.cliente_nombre} />
                <FieldCard label="RFC" value={data.cliente_rfc || "-"} />
                <FieldCard label="Fecha" value={fmtDate(data.fecha_emision || data.created_at)} />
                <FieldCard label="Estado" value={data.estado} />
                <FieldCard label="Total" value={fmtMoney(total)} />
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-card overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">Producto</th>
                            <th className="text-right p-3">Cantidad</th>
                            <th className="text-right p-3">Precio</th>
                            <th className="text-right p-3">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data.detalles || []).length === 0 ? (
                            <tr><td colSpan={4} className="p-6 text-center text-muted">Sin partidas</td></tr>
                        ) : (data.detalles || []).map((line) => (
                            <tr key={line.id_detalle} className="border-t border-border hover:bg-background/40">
                                <td className="p-3">{line.producto_nombre}</td>
                                <td className="p-3 text-right">{line.cantidad}</td>
                                <td className="p-3 text-right">{fmtMoney(line.precio)}</td>
                                <td className="p-3 text-right font-semibold text-primary">{fmtMoney(line.subtotal)}</td>
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
