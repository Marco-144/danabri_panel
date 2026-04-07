"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, Plus, Pencil, Trash2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { getAlmacenes, getAlertasStock, createAlertaStock, updateAlertaStock, deleteAlertaStock } from "@/services/almacenesService";

export default function Alertas() {
    const [rows, setRows] = useState([]);
    const [almacenes, setAlmacenes] = useState([]);
    const [idAlmacen, setIdAlmacen] = useState("");
    const [search, setSearch] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [crudModal, setCrudModal] = useState({ open: false, mode: "create", item: null });

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [a, r] = await Promise.all([
                getAlmacenes(),
                getAlertasStock({ id_almacen: idAlmacen, search }),
            ]);
            setAlmacenes(Array.isArray(a) ? a : []);
            setRows(Array.isArray(r) ? r : []);
            setError("");
        } catch (e) {
            setError(e.message || "Error al cargar alertas");
        } finally {
            setLoading(false);
        }
    }, [idAlmacen, search]);

    useEffect(() => {
        load();
    }, [load]);

    const totalFaltante = useMemo(
        () => rows.reduce((acc, r) => acc + Number(r.sugerido_resurtido || 0), 0),
        [rows]
    );

    async function onSaveAlerta(payload) {
        try {
            setSaving(true);
            if (crudModal.mode === "create") {
                await createAlertaStock(payload);
            } else {
                await updateAlertaStock(crudModal.item.id_alerta_stock, payload);
            }
            setCrudModal({ open: false, mode: "create", item: null });
            await load();
        } catch (e) {
            setError(e.message || "Error al guardar alerta");
        } finally {
            setSaving(false);
        }
    }

    async function onDeleteAlerta(id) {
        const ok = window.confirm("Seguro que deseas eliminar esta alerta?");
        if (!ok) return;
        try {
            await deleteAlertaStock(id);
            await load();
        } catch (e) {
            setError(e.message || "Error al eliminar alerta");
        }
    }

    return (
        <div className="space-y-4">
            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

            <Card className="p-4 space-y-3">
                <div className="flex flex-col md:flex-row gap-2">
                    <Select value={idAlmacen} onChange={(e) => setIdAlmacen(e.target.value)} options={almacenes.map((a) => ({ value: a.id_almacen, label: a.nombre }))} placeholder="Todos los almacenes" className="md:w-[260px]" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto o codigo" className="flex-1" />
                    <Button onClick={load}><BellRing size={14} /> Consultar</Button>
                    <Button onClick={() => setCrudModal({ open: true, mode: "create", item: null })}><Plus size={14} /> Nueva</Button>
                </div>
                <div className="text-sm text-muted">Faltante total sugerido: <strong className="text-primary">{totalFaltante}</strong></div>
            </Card>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">Producto</th>
                            <th className="text-left p-3">Presentacion</th>
                            <th className="text-left p-3">Codigo</th>
                            <th className="text-left p-3">Almacen</th>
                            <th className="text-right p-3">Stock</th>
                            <th className="text-right p-3">Minimo</th>
                            <th className="text-right p-3">Sugerido</th>
                            <th className="text-left p-3">Tipo</th>
                            <th className="text-left p-3">Estado</th>
                            <th className="text-center p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={10} className="p-6 text-center text-muted">Cargando...</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={10} className="p-6 text-center text-muted">Sin alertas</td></tr>
                        ) : (
                            rows.map((r) => (
                                <tr key={r.id_alerta_stock} className="border-t border-border hover:bg-background/50">
                                    <td className="p-3">{r.producto_nombre}</td>
                                    <td className="p-3">{r.presentacion_nombre}</td>
                                    <td className="p-3">{r.codigo_barras || "-"}</td>
                                    <td className="p-3">{r.almacen_nombre}</td>
                                    <td className="p-3 text-right">{r.stock}</td>
                                    <td className="p-3 text-right">{r.stock_minimo}</td>
                                    <td className="p-3 text-right font-semibold text-red-600">{r.sugerido_resurtido}</td>
                                    <td className="p-3">{r.tipo_alerta}</td>
                                    <td className="p-3">{r.estado}</td>
                                    <td className="p-3">
                                        <div className="flex justify-center gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => setCrudModal({ open: true, mode: "edit", item: r })}><Pencil size={14} /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => onDeleteAlerta(r.id_alerta_stock)}><Trash2 size={14} /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {crudModal.open && (
                <AlertaCrudModal
                    mode={crudModal.mode}
                    item={crudModal.item}
                    almacenes={almacenes}
                    saving={saving}
                    onCancel={() => setCrudModal({ open: false, mode: "create", item: null })}
                    onSubmit={onSaveAlerta}
                />
            )}
        </div>
    );
}

function AlertaCrudModal({ mode, item, almacenes, saving, onCancel, onSubmit }) {
    const [form, setForm] = useState({
        id_presentacion: item?.id_presentacion || "",
        id_almacen: item?.id_almacen || "",
        tipo_alerta: item?.tipo_alerta || "bajo_tienda",
        cantidad_sugerida: item?.sugerido_resurtido ?? 0,
        estado: item?.estado || "activa",
    });

    return (
        <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit({
                        id_presentacion: Number(form.id_presentacion),
                        id_almacen: Number(form.id_almacen),
                        tipo_alerta: form.tipo_alerta,
                        cantidad_sugerida: Number(form.cantidad_sugerida),
                        estado: form.estado,
                    });
                }}
                className="bg-white rounded-2xl border border-border shadow-card w-full max-w-lg p-5 space-y-4"
            >
                <h3 className="text-lg font-semibold text-primary">{mode === "create" ? "Nueva alerta" : "Editar alerta"}</h3>
                <Input label="ID Presentacion" type="number" min="1" value={form.id_presentacion} onChange={(e) => setForm((p) => ({ ...p, id_presentacion: e.target.value }))} />
                <Select label="Almacen" value={form.id_almacen} onChange={(e) => setForm((p) => ({ ...p, id_almacen: e.target.value }))} options={almacenes.map((a) => ({ value: a.id_almacen, label: a.nombre }))} placeholder="Seleccionar" />
                <Select label="Tipo alerta" value={form.tipo_alerta} onChange={(e) => setForm((p) => ({ ...p, tipo_alerta: e.target.value }))} options={[{ value: "bajo_tienda", label: "Bajo tienda" }, { value: "bajo_bodega", label: "Bajo bodega" }, { value: "resurtido_tienda", label: "Resurtido tienda" }, { value: "compra_proveedor", label: "Compra proveedor" }]} />
                <Input label="Cantidad sugerida" type="number" min="0" value={form.cantidad_sugerida} onChange={(e) => setForm((p) => ({ ...p, cantidad_sugerida: e.target.value }))} />
                <Select label="Estado" value={form.estado} onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value }))} options={[{ value: "activa", label: "Activa" }, { value: "resuelta", label: "Resuelta" }, { value: "omitida", label: "Omitida" }]} />
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onCancel}>Cancelar</Button>
                    <Button type="submit" variant="accent" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
                </div>
            </form>
        </div>
    );
}
