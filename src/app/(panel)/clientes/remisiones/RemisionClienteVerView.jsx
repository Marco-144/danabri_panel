"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CircleDollarSign, Loader, Pencil, FileText, ArrowLeft, Truck } from "lucide-react";
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

    const getEstadoMeta = (valor) => {
        const key = String(valor || "").trim().toLowerCase();
        const map = {
            pendiente: { label: "Pendiente", classes: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
            parcialmente_pagada: { label: "Parcial", classes: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
            pagada: { label: "Pagada", classes: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
            cancelada: { label: "Cancelada", classes: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
        };

        return map[key] ? map[key] : { label: (valor != null ? String(valor).replace(/_/g, ' ') : '-'), classes: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200' };
    };

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
        <div className="space-y-6">
            <section className="bg-white border border-border rounded-2xl shadow-card overflow-hidden p-6">
                <PageTitle
                    breadcrumb="Remisión / Detalle"
                    title="Ver Remisión"
                    Icon={Truck}
                    actions={(
                        <div className="flex gap-2">
                            <Link href={`/clientes/remisiones?mode=edit&id=${data.id_remision}`}>
                                <Button variant="outline" className="gap-2">
                                    <Pencil size={16} />
                                    Editar
                                </Button>
                            </Link>
                            {!data.facturado ? (
                                <Button variant="accent" onClick={handleFacturar} disabled={facturando} className="gap-2">
                                    <FileText size={16} />
                                    {facturando ? "Facturando..." : "Facturar"}
                                </Button>
                            ) : null}
                            <Link href={`/clientes/abonos?id_remision=${data.id_remision}`}>
                                <Button variant="accent">
                                    <CircleDollarSign size={16} />
                                    Ver Abonos
                                </Button>
                            </Link>
                            <Link href="/clientes/remisiones">
                                <Button variant="primary" className="gap-2">
                                    <ArrowLeft size={16} />
                                    Regresar
                                </Button>
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
                            {data.folio}
                        </h2>
                        <p className="text-white/55 text-xs mt-0.5 leading-snug">Entrega sin factura</p>
                        {(() => {
                            const meta = getEstadoMeta(data.estado);
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
                                    {fmtMoney(total)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Fecha</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0">
                                    {fmtDate(data.created_at)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Cliente</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0">
                                    {data.cliente_nombre}
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
                                    <p className="text-[15px] text-slate-700 font-medium">{data.folio}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Fecha</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{fmtDate(data.created_at)}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Estado</p>
                                    {(() => {
                                        const meta = getEstadoMeta(data.estado);
                                        return (
                                            <span className={`mt-3 inline-flex items-center rounded-full font-medium px-3 py-1 text-xs ${meta.classes}`}>
                                                {meta.label}
                                            </span>
                                        );
                                    })()}
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Facturada</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{data.facturado ? "Sí" : "No"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Facturada en</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{fmtDate(data.facturado_at)}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">RFC Facturación</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{data.rfc_facturacion || data.cliente_rfc || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">CFDI Facturación</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{data.uso_cfdi_facturacion || "-"}</p>
                                </div>
                            </div>
                        </section>
                        <section className="px-8 py-6 border-b border-middleborder">
                            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 mb-5 font-oswald">
                                Detalles del cliente
                            </h3>

                            <div className="grid grid-cols-4 gap-4 mb-4">
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Cliente</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{data.cliente_nombre}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">RFC</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{data.cliente_rfc || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Teléfono</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{data.cliente_telefono || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Correo</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{data.cliente_email || "-"}</p>
                                </div>
                            </div>
                        </section>

                        <section className="px-8 py-6 border-b border-middleborder">
                            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 mb-5 font-oswald">
                                Detalles de entrega
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[600px] text-sm">
                                    <thead className="bg-slate-100 text-primary">
                                        <tr>
                                            <th className="text-left p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Producto</th>
                                            <th className="text-left p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Presentacion</th>
                                            <th className="text-center p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Cantidad</th>
                                            <th className="text-right p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Precio</th>
                                            <th className="text-right p-3 font-oswald text-slate-400 uppercase text-xs tracking-[0.05em]">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(data.detalles || []).length === 0 ? (
                                            <tr><td colSpan={5} className="p-6 text-center text-muted">Sin productos</td></tr>
                                        ) : (data.detalles || []).map((line) => (
                                            <tr key={line.id_detalleRemision} className="border-t border-border hover:bg-background/40">
                                                <td className="p-3">{line.producto_nombre}</td>
                                                <td className="p-3">{line.presentacion_nombre}</td>
                                                <td className="p-3 text-center">{line.cantidad}</td>
                                                <td className="p-3 text-right">{fmtMoney(line.precio)}</td>
                                                <td className="p-3 text-right font-semibold text-primary">{fmtMoney(line.subtotal)}</td>
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
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Total</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{fmtMoney(total)}</p>
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
                    </div>
                </div>
            </div>
        </div>
    );
}
