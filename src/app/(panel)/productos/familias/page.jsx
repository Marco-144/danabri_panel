"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader, Search, Plus, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import { getFamilias, createFamilia, updateFamilia, deleteFamilia, getLineas } from "@/services/productosService";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PageTitle from "@/components/ui/PageTitle";

export default function ProductosFamiliasPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [rows, setRows] = useState([]);
    const [lineas, setLineas] = useState([]);

    const [formModal, setFormModal] = useState({ open: false, mode: "create", item: null });
    const [deleteItem, setDeleteItem] = useState(null);

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const [familias, lineasData] = await Promise.all([getFamilias(), getLineas()]);
            setRows(Array.isArray(familias) ? familias : []);
            setLineas(Array.isArray(lineasData) ? lineasData : []);
            setError("");
        } catch (err) {
            setError(err.message || "No se pudo cargar familias");
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) =>
            String(r.nombre || "").toLowerCase().includes(q) ||
            String(r.nombre_linea || "").toLowerCase().includes(q)
        );
    }, [rows, search]);

    const onSave = async (payload) => {
        if (formModal.mode === "create") await createFamilia(payload);
        else await updateFamilia(formModal.item.id_familia, payload);
        setFormModal({ open: false, mode: "create", item: null });
        await load();
    };

    const onDelete = async () => {
        await deleteFamilia(deleteItem.id_familia);
        setDeleteItem(null);
        await load();
    };

    if (loading) return <div className="h-56 flex items-center justify-center"><Loader className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-4">
            <PageTitle title="Familias" subtitle="Catalogo de familias para productos" />

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
                    <Plus size={16} /> Agregar familia
                </Button>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">Familia</th>
                            <th className="text-left p-3">Linea</th>
                            <th className="text-left p-3">Desc. 1</th>
                            <th className="text-left p-3">Desc. 2</th>
                            <th className="text-left p-3">Desc. 3</th>
                            <th className="text-left p-3">Desc. 4</th>
                            <th className="text-left p-3">Estado</th>
                            <th className="text-center p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-6 text-center text-muted">No hay familias para mostrar.</td>
                            </tr>
                        )}

                        {filtered.map((r) => {
                            const isActivo = r.activo === 1 || r.activo === true || r.activo === "1";
                            return (
                                <tr key={r.id_familia} className="border-t border-border hover:bg-background/50">
                                    <td className="p-3">{r.nombre}</td>
                                    <td className="p-3">{r.nombre_linea}</td>
                                    <td className="p-3">{`${r.descuento_1 || 0}`}</td>
                                    <td className="p-3">{`${r.descuento_2 || 0}`}</td>
                                    <td className="p-3">{`${r.descuento_3 || 0}`}</td>
                                    <td className="p-3">{`${r.descuento_4 || 0}`}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs rounded-full ${isActivo ? "bg-activo text-white" : "bg-inactivo text-white"}`}>
                                            {isActivo ? "Activa" : "Inactiva"}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex justify-center text-muted">
                                            <Button variant="ghost" className="p-0 h-auto" onClick={() => setFormModal({ open: true, mode: "edit", item: r })}><Pencil size={18} className="hover:text-yellow-700" /></Button>
                                            <Button variant="ghost" className="p-0 h-auto" onClick={() => setDeleteItem(r)}><Trash2 size={18} className="hover:text-red-700" /></Button>
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
                    <FamiliaFormModalInline
                        mode={formModal.mode}
                        item={formModal.item}
                        lineas={lineas}
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
                                <h3 className="text-lg font-semibold text-primary">Eliminar familia</h3>
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

function FamiliaFormModalInline({ mode, item, lineas, onClose, onSave }) {
    const [form, setForm] = useState({
        id_linea: item?.id_linea ? String(item.id_linea) : "",
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
            id_linea: Number(form.id_linea),
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
                <h3 className="text-lg font-semibold text-primary">{mode === "create" ? "Agregar familia" : "Editar familia"}</h3>
                <Button variant="ghost" className="p-0 h-auto" onClick={onClose}><X size={18} className="text-muted hover:text-primary" /></Button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                    <Select
                        label="Linea"
                        value={form.id_linea}
                        onChange={(e) => setForm((p) => ({ ...p, id_linea: e.target.value }))}
                        options={lineas.map((l) => ({ value: l.id_linea, label: l.nombre }))}
                        placeholder="Selecciona linea"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="text-sm text-muted block mb-1">Nombre</label>
                    <Input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} inputClassName="py-2" />
                </div>

                <Input label="Descuento 1" type="number" min="0" value={form.descuento_1} onChange={(e) => setForm((p) => ({ ...p, descuento_1: e.target.value }))} />
                <Input label="Descuento 2" type="number" min="0" value={form.descuento_2} onChange={(e) => setForm((p) => ({ ...p, descuento_2: e.target.value }))} />
                <Input label="Descuento 3" type="number" min="0" value={form.descuento_3} onChange={(e) => setForm((p) => ({ ...p, descuento_3: e.target.value }))} />
                <Input label="Descuento 4" type="number" min="0" value={form.descuento_4} onChange={(e) => setForm((p) => ({ ...p, descuento_4: e.target.value }))} />

                <label className="md:col-span-2 flex items-center gap-2 text-sm text-primary">
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
