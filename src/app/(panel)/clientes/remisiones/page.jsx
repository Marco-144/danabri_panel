"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Check, Eye, FileText, Funnel, Loader, Pencil, Plus, ReceiptText, Search, Trash2 } from "lucide-react";
import StatKpiCard from "@/components/ui/StatKpiCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { FilterPopover, FilterChip } from "@/components/ui/FilterPopover";
import PageTitle from "@/components/ui/PageTitle";
import {
    deleteRemisionCliente,
    facturarRemisionCliente,
    getRemisionesClientes,
} from "@/services/remisionesClientesService";

const RemisionClienteFormView = dynamic(() => import("./RemisionClienteFormView"));
const RemisionClienteVerView = dynamic(() => import("./RemisionClienteVerView"));

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fmtDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("es-MX");
}

function badgeByStatus(status) {
    if (status === "parcialmente_pagada") return "bg-blue-100 text-blue-700";
    if (status === "pagada") return "bg-activo/20 text-activo";
    if (status === "cancelada") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-800";
}

export default function RemisionesClientesPage() {
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode");
    const id = searchParams.get("id");
    const idCotizacion = searchParams.get("id_cotizacion") || "";

    if (mode === "add") return <RemisionClienteFormView idCotizacion={idCotizacion} />;
    if (mode === "edit" && id) return <RemisionClienteFormView id={id} />;
    if (mode === "view" && id) return <RemisionClienteVerView id={id} />;

    return <RemisionesClientesListView />;
}

function RemisionesClientesListView() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [filters, setFilters] = useState({ estado: "", facturado: "", desde: "", hasta: "" });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getRemisionesClientes({
                search,
                estado: filters.estado,
                facturado: filters.facturado,
                desde: filters.desde,
                hasta: filters.hasta,
            });
            setRows(Array.isArray(data) ? data : []);
            setError("");
        } catch (e) {
            setRows([]);
            setError(e.message || "No se pudieron cargar las remisiones");
        } finally {
            setLoading(false);
        }
    }, [search, filters]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const pendientes = useMemo(() => rows.filter((r) => Number(r.saldo_pendiente || 0) > 0), [rows]);
    const totalSaldoPendiente = useMemo(() => pendientes.reduce((acc, r) => acc + Number(r.saldo_pendiente || 0), 0), [pendientes]);
    const facturadasCount = useMemo(() => rows.filter((r) => r.facturado).length, [rows]);
    const pagadasCount = useMemo(() => rows.filter((r) => r.estado === "pagada").length, [rows]);

    async function handleDelete(row) {
        const ok = window.confirm(`¿Eliminar remision ${row.folio}?`);
        if (!ok) return;

        try {
            await deleteRemisionCliente(row.id_remision);
            await loadData();
        } catch (e) {
            setError(e.message || "No se pudo eliminar la remision");
        }
    }

    async function handleFacturar(row) {
        try {
            await facturarRemisionCliente(row.id_remision);
            await loadData();
        } catch (e) {
            setError(e.message || "No se pudo facturar la remision");
        }
    }

    return (
        <div className="space-y-4">
            <PageTitle
                title="Remisiones de Clientes"
                subtitle="Venta operativa, cobros y facturación por separado"
                icon={<ReceiptText size={22} />}
                actions={(
                    <div className="flex gap-2">
                        <Link href="/clientes/abonos">
                            <Button variant="outline">Ir a Abonos</Button>
                        </Link>
                        <Link href="/clientes/remisiones?mode=add">
                            <Button className="gap-2"><Plus size={16} />Nueva Remision</Button>
                        </Link>
                    </div>
                )}
            />

            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

            <div className="p-4">
                <div className="flex flex-col md:flex-row gap-3 md:items-center">
                    <div className="relative inline-block w-full md:w-[420px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por folio o cliente"
                            inputClassName="bg-white text-primary py-2.5 pl-10 pr-4 rounded-full"
                        />
                    </div>

                    <div className="md:ml-auto flex items-center gap-2">
                        <FilterPopover
                            open={filtersOpen}
                            onOpenChange={setFiltersOpen}
                            triggerVariant="ghost"
                            triggerClassName="px-3 py-2"
                            triggerContent={<span className="flex items-center gap-2"><Funnel size={16} /></span>}
                            panelClassName="w-[340px]"
                            panelPositionClassName="right-0 top-full"
                            onApply={() => setFiltersOpen(false)}
                            onClear={() => setFilters({ estado: "", facturado: "", desde: "", hasta: "" })}
                        >
                            <div>
                                <p className="text-xs text-muted mb-2">Estado</p>
                                <div className="flex gap-2 flex-wrap">
                                    <FilterChip active={filters.estado === ""} onClick={() => setFilters((prev) => ({ ...prev, estado: "" }))}>Todos</FilterChip>
                                    <FilterChip active={filters.estado === "pendiente"} onClick={() => setFilters((prev) => ({ ...prev, estado: "pendiente" }))}>Pendiente</FilterChip>
                                    <FilterChip active={filters.estado === "parcialmente_pagada"} onClick={() => setFilters((prev) => ({ ...prev, estado: "parcialmente_pagada" }))}>Parcial</FilterChip>
                                    <FilterChip active={filters.estado === "pagada"} onClick={() => setFilters((prev) => ({ ...prev, estado: "pagada" }))}>Pagada</FilterChip>
                                    <FilterChip active={filters.estado === "cancelada"} onClick={() => setFilters((prev) => ({ ...prev, estado: "cancelada" }))}>Cancelada</FilterChip>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-muted mb-2">Facturada</p>
                                <div className="flex gap-2 flex-wrap">
                                    <FilterChip active={filters.facturado === ""} onClick={() => setFilters((prev) => ({ ...prev, facturado: "" }))}>Todas</FilterChip>
                                    <FilterChip active={filters.facturado === "1"} onClick={() => setFilters((prev) => ({ ...prev, facturado: "1" }))}>Facturadas</FilterChip>
                                    <FilterChip active={filters.facturado === "0"} onClick={() => setFilters((prev) => ({ ...prev, facturado: "0" }))}>Sin factura</FilterChip>
                                </div>
                            </div>

                            <Input label="Fecha desde" type="date" value={filters.desde} onChange={(e) => setFilters((prev) => ({ ...prev, desde: e.target.value }))} />
                            <Input label="Fecha hasta" type="date" value={filters.hasta} onChange={(e) => setFilters((prev) => ({ ...prev, hasta: e.target.value }))} />
                        </FilterPopover>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatKpiCard icon={<FileText size={20} />} title="Remisiones con saldo" value={pendientes.length} tone={pendientes.length > 0 ? "warning" : "success"} />
                <StatKpiCard icon={<ReceiptText size={20} />} title="Saldo pendiente" value={fmtMoney(totalSaldoPendiente)} tone={totalSaldoPendiente > 0 ? "warning" : "success"} />
                <StatKpiCard icon={<Check size={20} />} title="Facturadas" value={facturadasCount} tone={facturadasCount > 0 ? "success" : "default"} />
                <StatKpiCard icon={<Check size={20} />} title="Pagadas" value={pagadasCount} tone="info" />
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-x-auto">
                <table className="w-full min-w-[1120px] text-sm">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">Folio</th>
                            <th className="text-left p-3">Cliente</th>
                            <th className="text-left p-3">RFC</th>
                            <th className="text-left p-3">Fecha</th>
                            <th className="text-right p-3">Total</th>
                            <th className="text-right p-3">Saldo</th>
                            <th className="text-center p-3">Estado</th>
                            <th className="text-center p-3">Factura</th>
                            <th className="text-center p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={9} className="p-6 text-center text-muted"><Loader className="inline animate-spin" size={16} /> Cargando...</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={9} className="p-6 text-center text-muted">Sin remisiones</td></tr>
                        ) : rows.map((row) => (
                            <tr key={row.id_remision} className="border-t border-border hover:bg-background/50">
                                <td className="p-3 font-semibold text-primary">{row.folio}</td>
                                <td className="p-3">{row.cliente_nombre}</td>
                                <td className="p-3">{row.cliente_rfc || "-"}</td>
                                <td className="p-3">{fmtDate(row.created_at)}</td>
                                <td className="p-3 text-right">{fmtMoney(row.total)}</td>
                                <td className="p-3 text-right font-semibold text-primary">{fmtMoney(row.saldo_pendiente)}</td>
                                <td className="p-3 text-center"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badgeByStatus(row.estado)}`}>{row.estado}</span></td>
                                <td className="p-3 text-center">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${row.facturado ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                                        {row.facturado ? "Facturada" : "Sin factura"}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <div className="flex justify-center items-center gap-1">
                                        <Link href={`/clientes/remisiones?mode=view&id=${row.id_remision}`}>
                                            <Button variant="lightghost" className="p-1.5 h-auto" title="Ver"><Eye size={16} /></Button>
                                        </Link>
                                        <Link href={`/clientes/remisiones?mode=edit&id=${row.id_remision}`}>
                                            <Button variant="lightghost" className="p-1.5 h-auto hover:text-yellow-700" title="Editar"><Pencil size={16} /></Button>
                                        </Link>
                                        <Button variant="lightghost" className="p-1.5 h-auto hover:text-red-600" title="Eliminar" onClick={() => handleDelete(row)}>
                                            <Trash2 size={16} />
                                        </Button>
                                        {!row.facturado ? (
                                            <Button variant="lightghost" className="p-1.5 h-auto" title="Facturar" onClick={() => handleFacturar(row)}>
                                                <FileText size={16} />
                                            </Button>
                                        ) : null}
                                        <Link href={`/clientes/abonos?id_remision=${row.id_remision}`}>
                                            <Button variant="lightghost" className="p-1.5 h-auto" title="Abonos"><ReceiptText size={16} /></Button>
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
