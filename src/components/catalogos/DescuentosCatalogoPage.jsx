"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader, Search, Plus, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageTitle from "@/components/ui/PageTitle";

export default function DescuentosCatalogoPage({
    title,
    subtitle,
    singularLabel,
    addLabel,
    idKey,
    getItems,
    createItem,
    updateItem,
    deleteItem,
}) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [rows, setRows] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);

    const [formModal, setFormModal] = useState({ open: false, mode: "create", item: null });
    const [itemToDelete, setItemToDelete] = useState(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getItems();
            setRows(Array.isArray(data) ? data : []);
            setError("");
        } catch (err) {
            setError(err.message || `No se pudo cargar ${title.toLowerCase()}`);
        } finally {
            setLoading(false);
        }
    }, [getItems, title]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((row) => String(row.nombre || "").toLowerCase().includes(q));
    }, [rows, search]);

    const pageSize = 8;
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

    const paginatedRows = useMemo(() => {
        const startIndex = (safeCurrentPage - 1) * pageSize;
        return filtered.slice(startIndex, startIndex + pageSize);
    }, [filtered, safeCurrentPage]);

    const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
    const endItem = totalItems === 0 ? 0 : Math.min(safeCurrentPage * pageSize, totalItems);

    const maxVisiblePages = 5;
    const startPage = Math.max(
        1,
        Math.min(safeCurrentPage - Math.floor(maxVisiblePages / 2), totalPages - maxVisiblePages + 1)
    );
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    const visiblePages = Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);

    const onSave = async (payload) => {
        if (formModal.mode === "create") {
            await createItem(payload);
        } else {
            await updateItem(formModal.item[idKey], payload);
        }

        setFormModal({ open: false, mode: "create", item: null });
        await load();
    };

    const onDelete = async () => {
        await deleteItem(itemToDelete[idKey]);
        setItemToDelete(null);
        await load();
    };

    const paginationButtonClass =
        "inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-white text-primary hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed";

    if (loading) {
        return (
            <div className="h-56 flex items-center justify-center">
                <Loader className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <PageTitle title={title} subtitle={subtitle} />

            {error && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

            <div className="p-4 rounded-2xl flex flex-col md:flex-row mb-4 gap-3 md:items-center">
                <div className="relative inline-block w-full md:w-[460px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <Input
                        type="text"
                        placeholder="Buscar..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        inputClassName="bg-white text-primary w-full py-2.5 pl-10 pr-4 rounded-full"
                    />
                </div>

                <Button
                    onClick={() => setFormModal({ open: true, mode: "create", item: null })}
                    className="md:ml-auto rounded-xl shadow-sm"
                >
                    <Plus size={16} /> {addLabel}
                </Button>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">{singularLabel}</th>
                            <th className="text-left p-3">Desc. 1</th>
                            <th className="text-left p-3">Desc. 2</th>
                            <th className="text-left p-3">Desc. 3</th>
                            <th className="text-left p-3">Desc. 4</th>
                            <th className="text-left p-3">Estado</th>
                            <th className="text-center p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedRows.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-6 text-center text-muted">No hay {title.toLowerCase()} para mostrar.</td>
                            </tr>
                        )}

                        {paginatedRows.map((row) => {
                            const isActivo = row.activo === 1 || row.activo === true || row.activo === "1";
                            return (
                                <tr key={row[idKey]} className="border-t border-border hover:bg-background/50">
                                    <td className="p-3">{row.nombre}</td>
                                    <td className="p-3">{`${row.descuento_1 || 0}`}</td>
                                    <td className="p-3">{`${row.descuento_2 || 0}`}</td>
                                    <td className="p-3">{`${row.descuento_3 || 0}`}</td>
                                    <td className="p-3">{`${row.descuento_4 || 0}`}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs rounded-full ${isActivo ? "bg-activo text-white" : "bg-inactivo text-white"}`}>
                                            {isActivo ? "Activa" : "Inactiva"}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex justify-center text-muted">
                                            <Button variant="lightghost" className="p-0 h-auto" onClick={() => setFormModal({ open: true, mode: "edit", item: row })}>
                                                <Pencil size={18} className="hover:text-yellow-700" />
                                            </Button>
                                            <Button variant="lightghost" className="p-0 h-auto" onClick={() => setItemToDelete(row)}>
                                                <Trash2 size={18} className="hover:text-red-700" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-1">
                    <p className="text-sm text-muted">
                        {totalItems === 0
                            ? "No hay resultados para mostrar."
                            : `Mostrando ${startItem}-${endItem} de ${totalItems} ${title.toLowerCase()}`}
                    </p>

                    <div className="flex justify-end items-center gap-2 flex-wrap">
                        {totalPages > maxVisiblePages && (
                            <button
                                type="button"
                                onClick={() => setCurrentPage(1)}
                                disabled={safeCurrentPage === 1}
                                className={`${paginationButtonClass} min-w-9 px-2`}
                                aria-label="Primera página"
                                title="Primera página"
                            >
                                <span aria-hidden="true">«</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={safeCurrentPage === 1}
                            className={paginationButtonClass}
                            aria-label="Página anterior"
                            title="Página anterior"
                        >
                            <ChevronLeft size={16} className="mx-auto shrink-0" />
                            <span className="sr-only">Página anterior</span>
                        </button>

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

                        <button
                            type="button"
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={safeCurrentPage === totalPages}
                            className={paginationButtonClass}
                            aria-label="Página siguiente"
                            title="Página siguiente"
                        >
                            <ChevronRight size={16} className="mx-auto shrink-0" />
                            <span className="sr-only">Página siguiente</span>
                        </button>

                        {totalPages > maxVisiblePages && (
                            <button
                                type="button"
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={safeCurrentPage === totalPages}
                                className={`${paginationButtonClass} min-w-9 px-2`}
                                aria-label="Última página"
                                title="Última página"
                            >
                                <span aria-hidden="true">»</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {formModal.open && (
                <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
                    <DescuentoFormModal
                        mode={formModal.mode}
                        item={formModal.item}
                        singularLabel={singularLabel.toLowerCase()}
                        onClose={() => setFormModal({ open: false, mode: "create", item: null })}
                        onSave={onSave}
                    />
                </div>
            )}

            {itemToDelete && (
                <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-border shadow-card w-full max-w-md p-5">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-full bg-red-100 p-2 text-red-700"><AlertTriangle size={18} /></div>
                            <div>
                                <h3 className="text-lg font-semibold text-primary">Eliminar {singularLabel.toLowerCase()}</h3>
                                <p className="text-sm text-muted mt-1">{`Se eliminara ${itemToDelete.nombre}. Esta accion no se puede deshacer.`}</p>
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setItemToDelete(null)}>Cancelar</Button>
                            <Button variant="accent" onClick={onDelete}>Confirmar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DescuentoFormModal({ mode, item, singularLabel, onClose, onSave }) {
    const [form, setForm] = useState({
        nombre: item?.nombre || "",
        descuento_1: item?.descuento_1 ?? 0,
        descuento_2: item?.descuento_2 ?? 0,
        descuento_3: item?.descuento_3 ?? 0,
        descuento_4: item?.descuento_4 ?? 0,
        activo: item ? (item.activo === 1 || item.activo === true || item.activo === "1") : true,
    });

    const submit = (e) => {
        e.preventDefault();
        onSave?.({
            nombre: form.nombre.trim(),
            descuento_1: Number(form.descuento_1),
            descuento_2: Number(form.descuento_2),
            descuento_3: Number(form.descuento_3),
            descuento_4: Number(form.descuento_4),
            activo: Boolean(form.activo),
        });
    };

    return (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-border shadow-card w-full max-w-xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-semibold text-primary">{mode === "create" ? `Agregar ${singularLabel}` : `Editar ${singularLabel}`}</h3>
                <Button variant="ghost" className="p-0 h-auto" onClick={onClose}><X size={18} className="text-muted hover:text-primary" /></Button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                    <label className="text-sm text-muted block mb-1">Nombre</label>
                    <Input value={form.nombre} onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))} inputClassName="py-2" />
                </div>

                <Input label="Descuento 1" type="number" min="0" value={form.descuento_1} onChange={(e) => setForm((prev) => ({ ...prev, descuento_1: e.target.value }))} />
                <Input label="Descuento 2" type="number" min="0" value={form.descuento_2} onChange={(e) => setForm((prev) => ({ ...prev, descuento_2: e.target.value }))} />
                <Input label="Descuento 3" type="number" min="0" value={form.descuento_3} onChange={(e) => setForm((prev) => ({ ...prev, descuento_3: e.target.value }))} />
                <Input label="Descuento 4" type="number" min="0" value={form.descuento_4} onChange={(e) => setForm((prev) => ({ ...prev, descuento_4: e.target.value }))} />

                <label className="md:col-span-2 flex items-center gap-2 text-sm text-primary">
                    <input type="checkbox" checked={form.activo} onChange={(e) => setForm((prev) => ({ ...prev, activo: e.target.checked }))} />
                    Activa
                </label>
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button type="submit" variant="primary">Guardar</Button>
            </div>
        </form>
    );
}
