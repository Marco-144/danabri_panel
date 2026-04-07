"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader, Search, Plus, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import { getCategorias, createCategoria, updateCategoria, deleteCategoria } from "@/services/productosService";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageTitle from "@/components/ui/PageTitle";

export default function ProductosCategoriasPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [rows, setRows] = useState([]);

    const [formModal, setFormModal] = useState({ open: false, mode: "create", item: null });
    const [deleteItem, setDeleteItem] = useState(null);

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const data = await getCategorias();
            setRows(Array.isArray(data) ? data : []);
            setError("");
        } catch (err) {
            setError(err.message || "No se pudo cargar categorias");
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => String(r.nombre || "").toLowerCase().includes(q));
    }, [rows, search]);

    const onSave = async (payload) => {
        if (formModal.mode === "create") await createCategoria(payload);
        else await updateCategoria(formModal.item.id_categoria, payload);
        setFormModal({ open: false, mode: "create", item: null });
        await load();
    };

    const onDelete = async () => {
        await deleteCategoria(deleteItem.id_categoria);
        setDeleteItem(null);
        await load();
    };

    if (loading) return <div className="h-56 flex items-center justify-center"><Loader className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-4">
            <PageTitle title="Categorias" subtitle="Catalogo de categorias para productos." />

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

                <Button onClick={() => setFormModal({ open: true, mode: "create", item: null })} className="md:ml-auto rounded-xl shadow-sm">
                    <Plus size={16} /> Agregar categoria
                </Button>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">Categoria</th>
                            <th className="text-left p-3">Estado</th>
                            <th className="text-center p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={3} className="p-6 text-center text-muted">No hay categorias para mostrar.</td>
                            </tr>
                        )}

                        {filtered.map((c) => {
                            const isActivo = c.activo === 1 || c.activo === true || c.activo === "1";
                            return (
                                <tr key={c.id_categoria} className="border-t border-border hover:bg-background/50">
                                    <td className="p-3">{c.nombre}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs rounded-full ${isActivo ? "bg-activo text-white" : "bg-inactivo text-white"}`}>
                                            {isActivo ? "Activa" : "Inactiva"}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex justify-center text-muted">
                                            <Button variant="ghost" className="p-0 h-auto" onClick={() => setFormModal({ open: true, mode: "edit", item: c })}><Pencil size={18} className="hover:text-yellow-700" /></Button>
                                            <Button variant="ghost" className="p-0 h-auto" onClick={() => setDeleteItem(c)}><Trash2 size={18} className="hover:text-red-700" /></Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {formModal.open && (
                <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
                    <CategoriaFormModalInline
                        mode={formModal.mode}
                        item={formModal.item}
                        onClose={() => setFormModal({ open: false, mode: "create", item: null })}
                        onSave={onSave}
                    />
                </div>
            )}

            {deleteItem && (
                <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-border shadow-card w-full max-w-md p-5">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-full bg-red-100 p-2 text-red-700"><AlertTriangle size={18} /></div>
                            <div>
                                <h3 className="text-lg font-semibold text-primary">Eliminar categoria</h3>
                                <p className="text-sm text-muted mt-1">{`Se eliminara ${deleteItem.nombre}. Esta accion no se puede deshacer.`}</p>
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancelar</Button>
                            <Button variant="accent" onClick={onDelete}>Confirmar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CategoriaFormModalInline({ mode, item, onClose, onSave }) {
    const [form, setForm] = useState({
        nombre: item?.nombre || "",
        activo: item ? (item.activo === 1 || item.activo === true || item.activo === "1") : true,
    });

    const submit = (e) => {
        e.preventDefault();
        onSave?.({ nombre: form.nombre.trim(), activo: Boolean(form.activo) });
    };

    return (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-border shadow-card w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-semibold text-primary">{mode === "create" ? "Agregar categoria" : "Editar categoria"}</h3>
                <Button variant="ghost" className="p-0 h-auto" onClick={onClose}><X size={18} className="text-muted hover:text-primary" /></Button>
            </div>

            <div className="p-4 grid grid-cols-1 gap-3">
                <div>
                    <label className="text-sm text-muted block mb-1">Nombre</label>
                    <Input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} inputClassName="py-2" />
                </div>

                <label className="flex items-center gap-2 text-sm text-primary">
                    <input type="checkbox" checked={form.activo} onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))} />
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
