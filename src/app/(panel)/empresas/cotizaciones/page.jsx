"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, Funnel, Loader, Pencil, Plus, Search, Trash2, ReceiptText, FileText } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { FilterPopover, FilterChip } from "@/components/ui/FilterPopover";
import PageTitle from "@/components/ui/PageTitle";

import {
    deleteCotizacionEmpresa,
    getCotizacionesEmpresas,
} from "@/services/cotizacionesEmpresasService";
import CotizacionEmpresaFormView from "./CotizacionEmpresaFormView";
import CotizacionEmpresaVerView from "./CotizacionEmpresaVerView";

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fmtDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("es-MX");
}

export default function CotizacionesEmpresaPage() {
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode");
    const id = searchParams.get("id");

    if (mode === "add") {
        return <CotizacionEmpresaFormView />;
    }

    if (mode === "edit" && id) {
        return <CotizacionEmpresaFormView id={id} />;
    }

    if (mode === "view" && id) {
        return <CotizacionEmpresaVerView id={id} />;
    }

    return <CotizacionesEmpresaListView />;
}

function CotizacionesEmpresaListView() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({ tipo_presentacion: "all", desde: "", hasta: "" });
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);

    const pageSize = 10;

    const loadCotizaciones = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getCotizacionesEmpresas();
            setRows(Array.isArray(data) ? data : []);
            setError("");
        } catch (loadError) {
            setRows([]);
            setError(loadError.message || "No se pudieron cargar las cotizaciones");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCotizaciones();
    }, [loadCotizaciones]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, filters]);

    const filteredRows = useMemo(() => {
        const term = String(search || "").toLowerCase().trim();
        return rows.filter((row) => {
            const rowDate = String(row.created_at || row.fecha_emision || "").slice(0, 10);
            const bySearch = !term || (
                String(row.id_cotizacion_empresa || "").toLowerCase().includes(term)
                || String(row.empresa_nombre || "").toLowerCase().includes(term)
                || String(row.tipo_presentacion || "").toLowerCase().includes(term)
            );
            const byTipo = filters.tipo_presentacion === "all" || String(row.tipo_presentacion || "") === filters.tipo_presentacion;
            const byDesde = !filters.desde || (rowDate && rowDate >= filters.desde);
            const byHasta = !filters.hasta || (rowDate && rowDate <= filters.hasta);

            return bySearch && byTipo && byDesde && byHasta;
        });
    }, [rows, search, filters]);

    const totalItems = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

    const paginatedRows = useMemo(() => {
        const startIndex = (safeCurrentPage - 1) * pageSize;
        return filteredRows.slice(startIndex, startIndex + pageSize);
    }, [filteredRows, safeCurrentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const handleDelete = async (row) => {
        const confirmed = window.confirm(`¿Eliminar la cotizacion #${row.id_cotizacion_empresa}?`);
        if (!confirmed) return;

        try {
            setPendingDeleteId(row.id_cotizacion_empresa);
            await deleteCotizacionEmpresa(row.id_cotizacion_empresa);
            await loadCotizaciones();
        } catch (deleteError) {
            setError(deleteError.message || "No se pudo eliminar la cotizacion");
        } finally {
            setPendingDeleteId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <PageTitle
                title="Cotizaciones de Empresas"
                subtitle="Administracion de cotizaciones por empresa"
                icon={<FileText size={20} />}
                actions={(
                    <Link href="/empresas/cotizaciones?mode=add">
                        <Button className="gap-2">
                            <Plus size={16} />
                            Nueva cotizacion
                        </Button>
                    </Link>
                )}
            />

            {error ? (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
            ) : null}

            <div className="p-4">
                <div className="flex flex-col md:flex-row gap-3 md:items-center">
                    <div className="relative inline-block w-full md:w-[420px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por empresa o folio interno"
                            inputClassName="bg-white text-primary py-2.5 pl-10 pr-4 rounded-full border border-border"
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
                            onClear={() => setFilters({ tipo_presentacion: "all", desde: "", hasta: "" })}
                        >
                            <div>
                                <p className="text-xs text-muted mb-2">Tipo de presentación</p>
                                <div className="flex gap-2 flex-wrap">
                                    <FilterChip active={filters.tipo_presentacion === "all"} onClick={() => setFilters((prev) => ({ ...prev, tipo_presentacion: "all" }))}>Todas</FilterChip>
                                    <FilterChip active={filters.tipo_presentacion === "pieza"} onClick={() => setFilters((prev) => ({ ...prev, tipo_presentacion: "pieza" }))}>Pieza</FilterChip>
                                    <FilterChip active={filters.tipo_presentacion === "caja"} onClick={() => setFilters((prev) => ({ ...prev, tipo_presentacion: "caja" }))}>Caja</FilterChip>
                                    <FilterChip active={filters.tipo_presentacion === "paquete"} onClick={() => setFilters((prev) => ({ ...prev, tipo_presentacion: "paquete" }))}>Paquete</FilterChip>
                                </div>
                            </div>

                            <Input
                                label="Fecha desde"
                                type="date"
                                value={filters.desde}
                                onChange={(e) => setFilters((prev) => ({ ...prev, desde: e.target.value }))}
                            />
                            <Input
                                label="Fecha hasta"
                                type="date"
                                value={filters.hasta}
                                onChange={(e) => setFilters((prev) => ({ ...prev, hasta: e.target.value }))}
                            />
                        </FilterPopover>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">Folio</th>
                            <th className="text-left p-3">Empresa</th>
                            <th className="text-left p-3">Perfil empresa</th>
                            <th className="text-left p-3">Tipo</th>
                            <th className="text-left p-3">Fecha realizacion</th>
                            <th className="text-left p-3">Vigencia</th>
                            <th className="text-right p-3">Total sin IVA</th>
                            <th className="text-center p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedRows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-6 text-center text-muted">Sin cotizaciones</td>
                            </tr>
                        ) : paginatedRows.map((row) => (
                            <tr key={row.id_cotizacion_empresa} className="border-t border-border hover:bg-background/50">
                                <td className="p-3 font-semibold text-primary">COT-E-{String(row.id_cotizacion_empresa).padStart(5, "0")}</td>
                                <td className="p-3">{row.empresa_nombre}</td>
                                <td className="p-3">
                                    <Link href={`/empresas?empresa=${row.id_empresa}`}
                                        className="text-slidehover font-semibold underline underline-offset-2 hover:underline hover:text-accent">
                                        Ver empresa
                                    </Link>
                                </td>
                                <td className="p-3 capitalize">{row.tipo_presentacion || "pieza"}</td>
                                <td className="p-3">{fmtDate(row.created_at || row.fecha_emision)}</td>
                                <td className="p-3">{row.vigencia_dias} dias</td>
                                <td className="p-3 text-right font-semibold text-primary">{fmtMoney(row.total)}</td>
                                <td className="p-3">
                                    <div className="flex justify-center items-center gap-1">
                                        <Link href={`/empresas/cotizaciones?mode=view&id=${row.id_cotizacion_empresa}`}>
                                            <Button variant="lightghost" className="p-1.5 h-auto hover:text-primary" title="Ver cotizacion">
                                                <Eye size={16} />
                                            </Button>
                                        </Link>
                                        <Link href={`/empresas/cotizaciones?mode=edit&id=${row.id_cotizacion_empresa}`}>
                                            <Button variant="lightghost" className="p-1.5 h-auto hover:text-yellow-700" title="Editar cotizacion">
                                                <Pencil size={16} />
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="lightghost"
                                            className="p-1.5 h-auto hover:text-red-600"
                                            title="Eliminar cotizacion"
                                            onClick={() => handleDelete(row)}
                                            disabled={pendingDeleteId === row.id_cotizacion_empresa}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                        <div className="border-l-2 h-6 text-gray-400" />
                                        <Link href={`/empresas/remisiones?mode=add&id_cotizacion_empresa=${row.id_cotizacion_empresa}`}>
                                            <Button
                                                variant="lightghost"
                                                title="Generar remision"
                                                className="p-1.5 h-auto hover:text-green-700">
                                                <ReceiptText size={16} />
                                            </Button>
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="border-t border-border px-4 py-3 bg-white flex items-center justify-between text-sm text-muted">
                    <span>
                        {totalItems === 0 ? "Sin resultados" : `Total: ${totalItems} cotizaciones`}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={safeCurrentPage === 1}
                        >
                            Anterior
                        </Button>
                        <span>{safeCurrentPage} / {totalPages}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={safeCurrentPage === totalPages}
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
