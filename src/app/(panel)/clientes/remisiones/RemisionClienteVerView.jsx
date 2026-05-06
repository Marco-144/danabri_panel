"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Loader, Pencil, FileText } from "lucide-react";
import Button from "@/components/ui/Button";
import FieldCard from "@/components/ui/FieldCard";
import PageTitle from "@/components/ui/PageTitle";
import { facturarRemisionCliente, getRemisionClienteById } from "@/services/remisionesClientesService";

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fmtDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("es-MX");
}

export default function RemisionClienteVerView({ id }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [facturando, setFacturando] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const result = await getRemisionClienteById(id);
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

    const total = useMemo(() => Number(data?.total || 0), [data]);

    async function handleFacturar() {
        if (!data?.id_remision) return;

        try {
            setFacturando(true);
            await facturarRemisionCliente(data.id_remision);
            const result = await getRemisionClienteById(data.id_remision);
            setData(result);
            setError("");
        } catch (e) {
            setError(e.message || "No se pudo facturar la remision");
        } finally {
            setFacturando(false);
        }
    }

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
                title={`Remision ${data.folio}`}
                subtitle="Detalle de remision de cliente"
                actions={(
                    <div className="flex gap-2">
                        <Link href={`/clientes/remisiones?mode=edit&id=${data.id_remision}`}>
                            <Button variant="outline" className="gap-2"><Pencil size={16} />Editar</Button>
                        </Link>
                        {!data.facturado ? (
                            <Button onClick={handleFacturar} disabled={facturando} className="gap-2">
                                <FileText size={16} />{facturando ? "Facturando..." : "Facturar"}
                            </Button>
                        ) : null}
                        <Link href={`/clientes/abonos?id_remision=${data.id_remision}`}>
                            <Button>Ver Abonos</Button>
                        </Link>
                        <Link href="/clientes/remisiones">
                            <Button variant="outline" className="gap-2"><ChevronLeft size={16} />Volver</Button>
                        </Link>
                    </div>
                )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <FieldCard label="Cliente" value={data.cliente_nombre} />
                <FieldCard label="RFC" value={data.cliente_rfc || "-"} />
                <FieldCard label="Telefono" value={data.cliente_telefono || "-"} />
                <FieldCard label="Correo" value={data.cliente_email || "-"} />
                <FieldCard label="Fecha" value={fmtDate(data.created_at)} />
                <FieldCard label="Estado" value={data.estado} />
                <FieldCard label="Facturada" value={data.facturado ? "Sí" : "No"} />
                <FieldCard label="Facturada en" value={fmtDate(data.facturado_at)} />
                <FieldCard label="RFC facturación" value={data.rfc_facturacion || data.cliente_rfc || "-"} />
                <FieldCard label="Uso CFDI facturación" value={data.uso_cfdi_facturacion || "-"} />
                <FieldCard label="Total" value={fmtMoney(total)} />
                <FieldCard label="Total abonado" value={fmtMoney(data.total_abonado)} />
                <FieldCard label="Saldo pendiente" value={fmtMoney(data.saldo_pendiente)} />
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-card overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">Producto</th>
                            <th className="text-left p-3">Presentacion</th>
                            <th className="text-right p-3">Cantidad</th>
                            <th className="text-right p-3">Precio</th>
                            <th className="text-right p-3">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data.detalles || []).length === 0 ? (
                            <tr><td colSpan={5} className="p-6 text-center text-muted">Sin partidas</td></tr>
                        ) : (data.detalles || []).map((line) => (
                            <tr key={line.id_detalleRemision} className="border-t border-border hover:bg-background/40">
                                <td className="p-3">{line.producto_nombre}</td>
                                <td className="p-3">{line.presentacion_nombre}</td>
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
