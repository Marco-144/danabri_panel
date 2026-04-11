"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader, Search, Plus, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageTitle from "@/components/ui/PageTitle";
import Pagination from "@/components/ui/Pagination";

export default function DescuentosCatalogoPageCards({
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

    const ITEMS_PER_PAGE = 6;

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        try {
            setLoading(true);
            const data = await getItems();
            setRows(Array.isArray(data) ? data : []);
            setCurrentPage(1);
            setError("");
        } catch (err) {
            setError(err.message || `No se pudo cargar ${title.toLowerCase()}`);
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((row) => String(row.nombre || "").toLowerCase().includes(q));
    }, [rows, search]);

    const paginatedRows = useMemo(() => {
        return filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    }, [filtered, currentPage]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

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

            {filtered.length === 0 ? (
                <div className="text-center py-12 text-muted">
                    <p className="text-sm">No hay {title.toLowerCase()} para mostrar.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {paginatedRows.map((row) => {
                            const isActivo = row.activo === 1 || row.activo === true || row.activo === "1";
                            return (
                                <div key={row[idKey]} className="bg-white rounded-2xl border border-border shadow-card p-4 hover:shadow-lg transition">
                                    <div className="mb-3 pb-3 border-b border-border">
                                        <h4 className="font-semibold text-primary text-sm">{row.nombre}</h4>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                                        <div className="bg-background rounded p-2">
                                            <div className="text-muted text-xs">Desc. 1</div>
                                            <div className="font-semibold text-primary">{row.descuento_1 || 0}</div>
                                        </div>
                                        <div className="bg-background rounded p-2">
                                            <div className="text-muted text-xs">Desc. 2</div>
                                            <div className="font-semibold text-primary">{row.descuento_2 || 0}</div>
                                        </div>
                                        <div className="bg-background rounded p-2">
                                            <div className="text-muted text-xs">Desc. 3</div>
                                            <div className="font-semibold text-primary">{row.descuento_3 || 0}</div>
                                        </div>
                                        <div className="bg-background rounded p-2">
                                            <div className="text-muted text-xs">Desc. 4</div>
                                            <div className="font-semibold text-primary">{row.descuento_4 || 0}</div>
                                        </div>
                                    </div>

                                    <div className="mb-3 pb-3 border-t border-border pt-3">
                                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${isActivo ? "bg-activo text-white" : "bg-inactivo text-white"}`}>
                                            {isActivo ? "Activa" : "Inactiva"}
                                        </span>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="lightghost"
                                            className="flex-1 py-2 text-sm h-auto"
                                            onClick={() => setFormModal({ open: true, mode: "edit", item: row })}
                                        >
                                            <Pencil size={16} /> Editar
                                        </Button>
                                        <Button
                                            variant="lightghost"
                                            className="flex-1 py-2 text-sm h-auto"
                                            onClick={() => setItemToDelete(row)}
                                        >
                                            <Trash2 size={16} /> Eliminar
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {totalPages > 1 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            itemsPerPage={ITEMS_PER_PAGE}
                            totalItems={filtered.length}
                        />
                    )}
                </>
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
