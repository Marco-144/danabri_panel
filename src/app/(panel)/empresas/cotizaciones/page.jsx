"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, Loader, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
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
    const [currentPage, setCurrentPage] = useState(1);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);

    const pageSize = 10;

    const loadCotizaciones = async () => {
        try {
            setLoading(true);
            const data = await getCotizacionesEmpresas({ search });
            setRows(Array.isArray(data) ? data : []);
            setError("");
        } catch (loadError) {
            setRows([]);
            setError(loadError.message || "No se pudieron cargar las cotizaciones");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCotizaciones();
    }, []);

    const filteredRows = useMemo(() => {
        const term = String(search || "").toLowerCase().trim();
        if (!term) return rows;

        return rows.filter((row) => (
            String(row.id_cotizacion_empresa || "").toLowerCase().includes(term)
            || String(row.empresa_nombre || "").toLowerCase().includes(term)
        ));
    }, [rows, search]);

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

            <div className="p-4 rounded-2xl flex flex-col md:flex-row gap-3 md:items-center">
                <div className="relative inline-block w-full md:w-[460px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar por empresa o folio interno"
                        inputClassName="bg-white text-primary w-full py-2.5 pl-10 pr-4 rounded-full"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">Folio</th>
                            <th className="text-left p-3">Empresa</th>
                            <th className="text-left p-3">Perfil empresa</th>
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
                                    <Link href={`/empresas?empresa=${row.id_empresa}`} className="text-primary underline-offset-2 hover:underline">
                                        Ver empresa
                                    </Link>
                                </td>
                                <td className="p-3">{fmtDate(row.created_at || row.fecha_emision)}</td>
                                <td className="p-3">{row.vigencia_dias} dias</td>
                                <td className="p-3 text-right font-semibold text-primary">{fmtMoney(row.total)}</td>
                                <td className="p-3">
                                    <div className="flex justify-center gap-1 text-muted">
                                        <Link href={`/empresas/cotizaciones?mode=view&id=${row.id_cotizacion_empresa}`}>
                                            <Button variant="lightghost" className="p-1.5 h-auto" title="Ver cotizacion">
                                                <Eye size={16} className="hover:text-primary" />
                                            </Button>
                                        </Link>
                                        <Link href={`/empresas/cotizaciones?mode=edit&id=${row.id_cotizacion_empresa}`}>
                                            <Button variant="lightghost" className="p-1.5 h-auto" title="Editar cotizacion">
                                                <Pencil size={16} className="hover:text-yellow-700" />
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="lightghost"
                                            className="p-1.5 h-auto"
                                            title="Eliminar cotizacion"
                                            onClick={() => handleDelete(row)}
                                            disabled={pendingDeleteId === row.id_cotizacion_empresa}
                                        >
                                            <Trash2 size={16} className="hover:text-red-600" />
                                        </Button>
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
