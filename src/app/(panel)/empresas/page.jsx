"use client";

import { Search, ChevronLeft, ChevronRight, Loader, Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageTitle from "@/components/ui/PageTitle";
import { FilterPopover, FilterChip } from "@/components/ui/FilterPopover";
import { createEmpresa, deleteEmpresa, updateEmpresa, getEmpresas } from "@/services/empresasService";

const DEFAULT_FILTERS = {
    has_rfc: "all",
    cp: "",
};

const EMPTY_FORM = {
    nombre: "",
    nombre_fiscal: "",
    pago_habitual: "",
    rfc: "",
    direccion: "",
    colonia: "",
    ciudad: "",
    estado: "",
    cp: "",
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
    return <EmpresasListView />;
}

function EmpresasListView() {
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saveError, setSaveError] = useState("");
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [currentPage, setCurrentPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
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

            const cpFilter = String(filters.cp || "").trim();
            const byCp = !cpFilter || String(empresa.cp || "").includes(cpFilter);

            return bySearch && byRfc && byCp;
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

    const openCreateModal = () => {
        setEditingId(null);
        setFormData(EMPTY_FORM);
        setSaveError("");
        setModalOpen(true);
    };

    const openEditModal = (empresa) => {
        setEditingId(empresa.id_empresa);
        setFormData({
            nombre: empresa.nombre || "",
            nombre_fiscal: empresa.nombre_fiscal || "",
            pago_habitual: empresa.pago_habitual || "",
            rfc: empresa.rfc || "",
            direccion: empresa.direccion || "",
            colonia: empresa.colonia || "",
            ciudad: empresa.ciudad || "",
            estado: empresa.estado || "",
            cp: empresa.cp || "",
        });
        setSaveError("");
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingId(null);
        setFormData(EMPTY_FORM);
        setSaveError("");
    };

    const validateForm = () => {
        if (!String(formData.nombre || "").trim()) {
            return "El nombre es requerido";
        }

        if (!String(formData.nombre_fiscal || "").trim()) {
            return "El nombre fiscal es requerido";
        }

        if (!String(formData.cp || "").trim()) {
            return "El código postal es requerido";
        }

        if (!String(formData.direccion || "").trim()) {
            return "La dirección es requerida";
        }

        if (!String(formData.colonia || "").trim()) {
            return "La colonia es requerida";
        }

        if (!String(formData.ciudad || "").trim()) {
            return "La ciudad es requerida";
        }

        if (!String(formData.estado || "").trim()) {
            return "El estado es requerido";
        }

        return "";
    };

    const handleSave = async () => {
        const validationMessage = validateForm();
        if (validationMessage) {
            setSaveError(validationMessage);
            return;
        }

        const payload = {
            nombre: String(formData.nombre || "").trim(),
            nombre_fiscal: String(formData.nombre_fiscal || "").trim(),
            pago_habitual: String(formData.pago_habitual || "").trim(),
            rfc: String(formData.rfc || "").trim(),
            direccion: String(formData.direccion || "").trim(),
            colonia: String(formData.colonia || "").trim(),
            ciudad: String(formData.ciudad || "").trim(),
            estado: String(formData.estado || "").trim(),
            cp: String(formData.cp || "").trim(),
        };

        try {
            setSaving(true);
            setSaveError("");

            if (editingId) {
                await updateEmpresa(editingId, payload);
            } else {
                await createEmpresa(payload);
            }

            closeModal();
            await loadEmpresas();
        } catch (saveErr) {
            setSaveError(saveErr.message || "No se pudo guardar la empresa");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (empresa) => {
        const confirmed = window.confirm(`¿Eliminar la empresa ${empresa.nombre}?`);
        if (!confirmed) {
            return;
        }

        try {
            setSaving(true);
            setSaveError("");
            await deleteEmpresa(empresa.id_empresa);
            await loadEmpresas();
        } catch (deleteError) {
            setSaveError(deleteError.message || "No se pudo eliminar la empresa");
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

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
                    <Button variant="primary" className="rounded-xl shadow-sm gap-2" onClick={openCreateModal}>
                        <Plus size={16} />
                        Agregar empresa
                    </Button>
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

            {saveError && (
                <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                    {saveError}
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-hidden">
                <EmpresaTableInline
                    data={paginatedEmpresas}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
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
                                aria-label="Primera página" >
                                «
                            </Button>
                        )}

                        <Button
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={safeCurrentPage === 1}
                            variant="outline"
                            className="h-9 w-9 p-0"
                            aria-label="Página anterior" >
                            <ChevronLeft size={16} className="mx-auto" />
                        </Button>

                        {visiblePages.map((page) => (
                            <Button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                variant={page === safeCurrentPage ? "tabActive" : "tabIdle"}
                                className="h-9 min-w-9 px-3 border text-sm" >
                                {page}
                            </Button>
                        ))}

                        <Button
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={safeCurrentPage === totalPages}
                            variant="outline"
                            className="h-9 w-9 p-0"
                            aria-label="Página siguiente">
                            <ChevronRight size={16} className="mx-auto" />
                        </Button>

                        {totalPages > maxVisiblePages && (
                            <Button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={safeCurrentPage === totalPages}
                                variant="outline"
                                className="h-9 min-w-9 px-2"
                                aria-label="Última página">
                                »
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 px-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-border bg-white shadow-card p-6">
                        <div className="flex items-center gap-2 mb-4 text-primary">
                            <Building2 size={20} />
                            <h3 className="text-lg font-semibold">
                                {editingId ? "Editar empresa" : "Agregar empresa"}
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            <Input
                                label="Nombre"
                                value={formData.nombre}
                                onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                            />
                            <Input
                                label="Nombre fiscal"
                                value={formData.nombre_fiscal}
                                onChange={(e) => setFormData((prev) => ({ ...prev, nombre_fiscal: e.target.value }))}
                            />
                            <Input
                                label="RFC"
                                value={formData.rfc}
                                onChange={(e) => setFormData((prev) => ({ ...prev, rfc: e.target.value }))}
                            />
                            <Input
                                label="Pago habitual (opcional)"
                                type="date"
                                value={formData.pago_habitual}
                                onChange={(e) => setFormData((prev) => ({ ...prev, pago_habitual: e.target.value }))}
                            />
                            <Input
                                label="Código postal"
                                value={formData.cp}
                                onChange={(e) => setFormData((prev) => ({ ...prev, cp: e.target.value }))}
                            />
                            <Input
                                label="Dirección"
                                value={formData.direccion}
                                onChange={(e) => setFormData((prev) => ({ ...prev, direccion: e.target.value }))}
                            />
                            <Input
                                label="Colonia"
                                value={formData.colonia}
                                onChange={(e) => setFormData((prev) => ({ ...prev, colonia: e.target.value }))}
                            />
                            <Input
                                label="Ciudad"
                                value={formData.ciudad}
                                onChange={(e) => setFormData((prev) => ({ ...prev, ciudad: e.target.value }))}
                            />
                            <Input
                                label="Estado"
                                value={formData.estado}
                                onChange={(e) => setFormData((prev) => ({ ...prev, estado: e.target.value }))}
                            />
                        </div>

                        {saveError ? (
                            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                                {saveError}
                            </div>
                        ) : null}

                        <div className="flex justify-end gap-3">
                            <Button
                                onClick={closeModal}
                                disabled={saving}
                                variant="outline">
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                variant="primary">
                                {saving ? "Guardando..." : "Guardar"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
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
        const reset = DEFAULT_FILTERS;
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
                        setDraft(value || DEFAULT_FILTERS);
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

function EmpresaTableInline({ data, onEdit, onDelete, disabled }) {
    return (
        <table className="w-full text-sm">
            <thead className="bg-background text-primary">
                <tr>
                    <th className="text-left p-3">ID</th>
                    <th className="text-left p-3">Nombre</th>
                    <th className="text-left p-3">Nombre fiscal</th>
                    <th className="text-left p-3">Pago habitual</th>
                    <th className="text-left p-3">RFC</th>
                    <th className="text-left p-3">Dirección</th>
                    <th className="text-left p-3">Colonia</th>
                    <th className="text-left p-3">Ciudad</th>
                    <th className="text-left p-3">Estado</th>
                    <th className="text-left p-3">C.P.</th>
                    <th className="text-center p-3">Acciones</th>
                </tr>
            </thead>

            <tbody>
                {data.length === 0 && (
                    <tr>
                        <td colSpan={11} className="p-6 text-center text-muted">No hay empresas para mostrar.</td>
                    </tr>
                )}

                {data.map((empresa) => (
                    <tr key={empresa.id_empresa} className="border-t border-border hover:bg-background/60">
                        <td className="p-3">{empresa.id_empresa}</td>
                        <td className="p-3">{empresa.nombre}</td>
                        <td className="p-3">{empresa.nombre_fiscal}</td>
                        <td className="p-3">{fmtDate(empresa.pago_habitual)}</td>
                        <td className="p-3">{empresa.rfc || "-"}</td>
                        <td className="p-3">{empresa.direccion || "-"}</td>
                        <td className="p-3">{empresa.colonia || "-"}</td>
                        <td className="p-3">{empresa.ciudad || "-"}</td>
                        <td className="p-3">{empresa.estado || "-"}</td>
                        <td className="p-3">{empresa.cp}</td>

                        <td className="p-3">
                            <div className="flex justify-center text-muted">
                                <Button
                                    variant="lightghost"
                                    className="p-0 h-auto"
                                    onClick={() => onEdit?.(empresa)}
                                    disabled={disabled}
                                    aria-label="Editar empresa"
                                >
                                    <Pencil size={18} className="hover:text-yellow-700" />
                                </Button>
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