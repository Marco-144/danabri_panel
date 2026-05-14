"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Loader, Plus, Pencil, Trash2, Eye, Building2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageTitle from "@/components/ui/PageTitle";
import { FilterPopover, FilterChip } from "@/components/ui/FilterPopover";
import { deleteEmpresa, getEmpresas, updateEmpresa } from "@/services/empresasService";

import AgregarEmpresasView from "./AgregarEmpresasView";
import EditarEmpresas from "./EditarEmpresas";
import VerEmpresaView from "./VerEmpresaView";

const DEFAULT_FILTERS = {
    has_rfc: "all",
    cp: "",
    activo: "all",
};

function fmtDate(value) {
    if (!value) return "-";
    const text = String(value).trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        return `Día ${Number(match[3])} del mes`;
    }

    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return "-";
    return `Día ${date.getDate()} del mes`;
}

export default function EmpresasPage() {
    return (
        <Suspense fallback={<EmpresasPageFallback />}>
            <EmpresasPageContent />
        </Suspense>
    );
}

function EmpresasPageFallback() {
    return (
        <div className="flex items-center justify-center h-64">
            <Loader className="animate-spin text-primary" />
        </div>
    );
}

function EmpresasPageContent() {
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode");
    const selectedId = searchParams.get("id");

    if (mode === "add") {
        return <AgregarEmpresasView />;
    }

    if (mode === "edit" && selectedId) {
        return <EditarEmpresas id={selectedId} />;
    }

    if (mode === "view" && selectedId) {
        return <VerEmpresaView id={selectedId} />;
    }

    return <EmpresasListView />;
}

function EmpresasListView() {
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const loadEmpresas = async () => {
        try {
            setLoading(true);
            const result = await getEmpresas();
            setEmpresas(Array.isArray(result) ? result : []);
            setError("");
        } catch (loadError) {
            setError(loadError.message || "No se pudieron cargar las empresas");
            setEmpresas([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEmpresas();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filters]);

    const filteredEmpresas = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();

        return empresas.filter((empresa) => {
            const bySearch = !term ||
                String(empresa.nombre || "").toLowerCase().includes(term) ||
                String(empresa.nombre_fiscal || "").toLowerCase().includes(term) ||
                String(empresa.rfc || "").toLowerCase().includes(term) ||
                String(empresa.cp || "").toLowerCase().includes(term) ||
                String(empresa.direccion || "").toLowerCase().includes(term) ||
                String(empresa.colonia || "").toLowerCase().includes(term) ||
                String(empresa.ciudad || "").toLowerCase().includes(term) ||
                String(empresa.estado || "").toLowerCase().includes(term);

            const hasRfc = Boolean(String(empresa.rfc || "").trim());
            const byRfc =
                filters.has_rfc === "all" ||
                (filters.has_rfc === "1" && hasRfc) ||
                (filters.has_rfc === "0" && !hasRfc);

            const isActivo = empresa.activo === 1 || empresa.activo === "1" || empresa.activo === true;
            const byActivo =
                filters.activo === "all" ||
                (filters.activo === "1" && isActivo) ||
                (filters.activo === "0" && !isActivo);

            const cpFilter = String(filters.cp || "").trim();
            const byCp = !cpFilter || String(empresa.cp || "").includes(cpFilter);

            return bySearch && byRfc && byCp && byActivo;
        });
    }, [empresas, searchTerm, filters]);

    const totalItems = filteredEmpresas.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

    const paginatedEmpresas = useMemo(() => {
        const startIndex = (safeCurrentPage - 1) * pageSize;
        return filteredEmpresas.slice(startIndex, startIndex + pageSize);
    }, [filteredEmpresas, safeCurrentPage]);

    const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
    const endItem = totalItems === 0 ? 0 : Math.min(safeCurrentPage * pageSize, totalItems);

    const maxVisiblePages = 5;
    const startPage = Math.max(
        1,
        Math.min(safeCurrentPage - Math.floor(maxVisiblePages / 2), totalPages - maxVisiblePages + 1)
    );
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    const visiblePages = Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const handleDelete = async (empresa) => {
        const confirmed = window.confirm(`¿Eliminar la empresa ${empresa.nombre}?`);
        if (!confirmed) {
            return;
        }

        try {
            setSaving(true);
            setActionError("");
            await deleteEmpresa(empresa.id_empresa);
            await loadEmpresas();
        } catch (deleteError) {
            setActionError(deleteError.message || "No se pudo eliminar la empresa");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (empresa) => {
        const isActivo = empresa.activo === 1 || empresa.activo === "1" || empresa.activo === true;
        const nextActivo = isActivo ? 0 : 1;

        try {
            setSaving(true);
            setActionError("");
            await updateEmpresa(empresa.id_empresa, { activo: nextActivo });
            setEmpresas((prev) => prev.map((item) => (
                item.id_empresa === empresa.id_empresa ? { ...item, activo: nextActivo } : item
            )));
        } catch (toggleError) {
            setActionError(toggleError.message || "No se pudo actualizar el estado de la empresa");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">{error}</div>
        );
    }

    return (
        <div>
            <PageTitle
                title="Empresas"
                subtitle="Lista de empresas"
                icon={<Building2 size={20} />}
                actions={(
                    <Link href="/empresas?mode=add">
                        <Button variant="primary" className="rounded-xl shadow-sm gap-2">
                            <Plus size={16} />
                            Agregar empresa
                        </Button>
                    </Link>
                )}
            />

            <div className="p-4 rounded-2xl flex flex-col md:flex-row mb-4 gap-3 md:items-center">
                <EmpresasFiltersInline
                    value={filters}
                    onApply={setFilters}
                    onClear={() => setFilters(DEFAULT_FILTERS)}
                />

                <div className="relative inline-block w-full md:w-[460px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <Input
                        type="text"
                        placeholder="Buscar empresa..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        inputClassName="bg-white text-primary w-full py-2.5 pl-10 pr-4 rounded-full"
                    />
                </div>
            </div>

            {actionError && (
                <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                    {actionError}
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-hidden">
                <EmpresaTableInline
                    data={paginatedEmpresas}
                    onDelete={handleDelete}
                    onToggleActive={handleToggleActive}
                    disabled={saving}
                />

                <div className="border-t border-border px-4 py-3 bg-white">
                    <p className="text-sm text-muted">
                        {totalItems === 0
                            ? "No hay resultados para mostrar."
                            : `Mostrando ${startItem}-${endItem} de ${totalItems} empresas`}
                    </p>
                </div>

                {totalPages > 1 && (
                    <div className="border-t border-border px-4 py-3 flex justify-end items-center gap-2 bg-white flex-wrap">
                        {totalPages > maxVisiblePages && (
                            <Button
                                onClick={() => setCurrentPage(1)}
                                disabled={safeCurrentPage === 1}
                                variant="outline"
                                className="h-9 min-w-9 px-2"
                                aria-label="Primera página"
                            >
                                «
                            </Button>
                        )}

                        <Button
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={safeCurrentPage === 1}
                            variant="outline"
                            className="h-9 w-9 p-0"
                            aria-label="Página anterior"
                        >
                            <ChevronLeft size={16} className="mx-auto" />
                        </Button>

                        {visiblePages.map((page) => (
                            <Button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                variant={page === safeCurrentPage ? "tabActive" : "tabIdle"}
                                className="h-9 min-w-9 px-3 border text-sm"
                            >
                                {page}
                            </Button>
                        ))}

                        <Button
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={safeCurrentPage === totalPages}
                            variant="outline"
                            className="h-9 w-9 p-0"
                            aria-label="Página siguiente"
                        >
                            <ChevronRight size={16} className="mx-auto" />
                        </Button>

                        {totalPages > maxVisiblePages && (
                            <Button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={safeCurrentPage === totalPages}
                                variant="outline"
                                className="h-9 min-w-9 px-2"
                                aria-label="Última página"
                            >
                                »
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function EmpresasFiltersInline({ value, onApply, onClear }) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(value || DEFAULT_FILTERS);

    const handleApply = () => {
        onApply?.(draft);
        setOpen(false);
    };

    const handleClear = () => {
        const reset = { ...DEFAULT_FILTERS };
        setDraft(reset);
        onClear?.();
        setOpen(false);
    };

    return (
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <FilterPopover
                open={open}
                onOpenChange={(nextOpen) => {
                    if (nextOpen) {
                        setDraft(value || { ...DEFAULT_FILTERS });
                    }
                    setOpen(nextOpen);
                }}
                panelClassName="w-[340px]"
                triggerLabel="Filtros"
                onApply={handleApply}
                onClear={handleClear}
            >
                <div>
                    <p className="text-xs text-muted mb-2">RFC</p>
                    <div className="flex gap-2 flex-wrap">
                        <FilterChip active={draft.has_rfc === "all"} onClick={() => setDraft((prev) => ({ ...prev, has_rfc: "all" }))}>Todos</FilterChip>
                        <FilterChip active={draft.has_rfc === "1"} onClick={() => setDraft((prev) => ({ ...prev, has_rfc: "1" }))}>Con RFC</FilterChip>
                        <FilterChip active={draft.has_rfc === "0"} onClick={() => setDraft((prev) => ({ ...prev, has_rfc: "0" }))}>Sin RFC</FilterChip>
                    </div>
                </div>

                <div>
                    <p className="text-xs text-muted mb-2">Estado</p>
                    <div className="flex gap-2 flex-wrap">
                        <FilterChip active={draft.activo === "all"} onClick={() => setDraft((prev) => ({ ...prev, activo: "all" }))}>Todos</FilterChip>
                        <FilterChip active={draft.activo === "1"} onClick={() => setDraft((prev) => ({ ...prev, activo: "1" }))}>Activas</FilterChip>
                        <FilterChip active={draft.activo === "0"} onClick={() => setDraft((prev) => ({ ...prev, activo: "0" }))}>Inactivas</FilterChip>
                    </div>
                </div>

                <Input
                    label="Código postal"
                    value={draft.cp}
                    onChange={(e) => setDraft((prev) => ({ ...prev, cp: e.target.value }))}
                    placeholder="Ej. 27000"
                />
            </FilterPopover>
        </div>
    );
}

function EmpresaTableInline({ data, onDelete, onToggleActive, disabled }) {
    return (
        <table className="w-full text-sm">
            <thead className="bg-background text-primary">
                <tr>
                    <th className="text-left p-3">ID</th>
                    <th className="text-left p-3">Nombre</th>
                    <th className="text-left p-3">Nombre fiscal</th>
                    <th className="text-left p-3">Pago habitual</th>
                    <th className="text-left p-3">RFC</th>
                    <th className="text-center p-3">Activo</th>
                    <th className="text-center p-3">Acciones</th>
                </tr>
            </thead>

            <tbody>
                {data.length === 0 && (
                    <tr>
                        <td colSpan={12} className="p-6 text-center text-muted">No hay empresas para mostrar.</td>
                    </tr>
                )}

                {data.map((empresa) => (
                    <tr key={empresa.id_empresa} className="border-t border-border hover:bg-background/60">
                        <td className="p-3">{empresa.id_empresa}</td>
                        <td className="p-3">{empresa.nombre}</td>
                        <td className="p-3">{empresa.nombre_fiscal}</td>
                        <td className="p-3">{fmtDate(empresa.pago_habitual)}</td>
                        <td className="p-3">{empresa.rfc || "-"}</td>
                        <td className="p-3 text-center">
                            {(() => {
                                const isActivo = empresa.activo === 1 || empresa.activo === "1" || empresa.activo === true;
                                return (
                                    <Button
                                        onClick={() => onToggleActive?.(empresa)}
                                        disabled={disabled}
                                        variant={isActivo ? "activo" : "inactivo"}
                                        size="sm"
                                        className="rounded-full"
                                    >
                                        {isActivo ? "Activo" : "Inactivo"}
                                    </Button>
                                );
                            })()}
                        </td>

                        <td className="p-3">
                            <div className="flex justify-center text-muted">
                                <Link href={`/empresas?mode=view&id=${empresa.id_empresa}`}>
                                    <Button variant="lightghost" className="p-0 h-auto" aria-label="Ver detalle de empresa">
                                        <Eye size={18} className="hover:text-primary" />
                                    </Button>
                                </Link>
                                <Link href={`/empresas?mode=edit&id=${empresa.id_empresa}`}>
                                    <Button variant="lightghost" className="p-0 h-auto" aria-label="Editar empresa">
                                        <Pencil size={18} className="hover:text-yellow-700" />
                                    </Button>
                                </Link>
                                <Button
                                    variant="lightghost"
                                    className="p-0 h-auto"
                                    onClick={() => onDelete?.(empresa)}
                                    disabled={disabled}
                                    aria-label="Eliminar empresa"
                                >
                                    <Trash2 size={18} className="hover:text-red-600" />
                                </Button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}