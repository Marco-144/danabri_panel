"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Plus, Pencil, Trash2, Warehouse } from "lucide-react";
import PageTitle from "@/components/ui/PageTitle";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { getAlmacenes, getMovimientos, createMovimiento, updateMovimiento, deleteMovimiento } from "@/services/almacenesService";

export default function AlmacenesMovimientosPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [rows, setRows] = useState([]);
    const [almacenes, setAlmacenes] = useState([]);

    const [search, setSearch] = useState("");
    const [idAlmacen, setIdAlmacen] = useState("");
    const [tipo, setTipo] = useState("");
    const [origen, setOrigen] = useState("");
    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");
    const [saving, setSaving] = useState(false);
    const [crudModal, setCrudModal] = useState({ open: false, mode: "create", item: null });

    async function loadBase() {
        try {
            setLoading(true);
            const [a, m] = await Promise.all([getAlmacenes(), getMovimientos()]);
            setAlmacenes(Array.isArray(a) ? a : []);
            setRows(Array.isArray(m) ? m : []);
            setError("");
        } catch (e) {
            setError(e.message || "Error al cargar movimientos");
        } finally {
            setLoading(false);
        }
    }

    async function onSearch() {
        try {
            setLoading(true);
            const m = await getMovimientos({ id_almacen: idAlmacen, tipo, origen, desde, hasta, search });
            setRows(Array.isArray(m) ? m : []);
            setError("");
        } catch (e) {
            setError(e.message || "Error al filtrar movimientos");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadBase();
    }, []);

    async function onSaveMovimiento(payload) {
        try {
            setSaving(true);
            if (crudModal.mode === "create") {
                await createMovimiento(payload);
            } else {
                await updateMovimiento(crudModal.item.id_movimiento, payload);
            }
            setCrudModal({ open: false, mode: "create", item: null });
            await onSearch();
        } catch (e) {
            setError(e.message || "Error al guardar movimiento");
        } finally {
            setSaving(false);
        }
    }

    async function onDeleteMovimiento(id) {
        const ok = window.confirm("Seguro que deseas eliminar este movimiento?");
        if (!ok) return;
        try {
            await deleteMovimiento(id);
            await onSearch();
        } catch (e) {
            setError(e.message || "Error al eliminar movimiento");
        }
    }

    return (
        <div className="space-y-4">
            <PageTitle title="Movimientos" subtitle="Control de inventario, movimientos y alertas." icon={<Warehouse />} />
            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

            <Card className="p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto/codigo/almacen" />
                    <Select value={idAlmacen} onChange={(e) => setIdAlmacen(e.target.value)} options={almacenes.map((a) => ({ value: a.id_almacen, label: a.nombre }))} placeholder="Almacen" />
                    <Select value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Tipo" options={[{ value: "entrada", label: "Entrada" }, { value: "salida", label: "Salida" }, { value: "ajuste", label: "Ajuste" }]} />
                    <Select value={origen} onChange={(e) => setOrigen(e.target.value)} placeholder="Origen" options={[{ value: "venta", label: "Venta" }, { value: "compra", label: "Compra" }, { value: "remision", label: "Remision" }, { value: "ajuste", label: "Ajuste" }]} />
                    <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
                    <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={loadBase}>Limpiar</Button>
                    <Button onClick={onSearch}><Search size={14} /> Buscar</Button>
                    <Button onClick={() => setCrudModal({ open: true, mode: "create", item: null })}><Plus size={14} /> Nuevo</Button>
                </div>
            </Card>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-x-auto">
                <table className="w-full text-sm min-w-[980px]">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">Fecha</th>
                            <th className="text-left p-3">Tipo</th>
                            <th className="text-left p-3">Origen</th>
                            <th className="text-left p-3">Producto</th>
                            <th className="text-left p-3">Presentacion</th>
                            <th className="text-left p-3">Codigo</th>
                            <th className="text-left p-3">Almacen</th>
                            <th className="text-right p-3">Cantidad</th>
                            <th className="text-center p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={9} className="p-6 text-center text-muted"><Loader2 className="inline mr-2 animate-spin" /> Cargando...</td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="p-6 text-center text-muted">Sin movimientos</td>
                            </tr>
                        ) : (
                            rows.map((r) => (
                                <tr key={r.id_movimiento} className="border-t border-border hover:bg-background/50">
                                    <td className="p-3">{new Date(r.created_at).toLocaleString()}</td>
                                    <td className="p-3">{r.tipo}</td>
                                    <td className="p-3">{r.origen}</td>
                                    <td className="p-3">{r.producto_nombre}</td>
                                    <td className="p-3">{r.presentacion_nombre}</td>
                                    <td className="p-3">{r.codigo_barras || "-"}</td>
                                    <td className="p-3">{r.almacen_nombre}</td>
                                    <td className="p-3 text-right font-medium">{r.cantidad}</td>
                                    <td className="p-3">
                                        <div className="flex justify-center gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => setCrudModal({ open: true, mode: "edit", item: r })}><Pencil size={14} /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => onDeleteMovimiento(r.id_movimiento)}><Trash2 size={14} /></Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {crudModal.open && (
                <MovimientoCrudModal
                    mode={crudModal.mode}
                    item={crudModal.item}
                    almacenes={almacenes}
                    saving={saving}
                    onCancel={() => setCrudModal({ open: false, mode: "create", item: null })}
                    onSubmit={onSaveMovimiento}
                />
            )}
        </div>
    );
}

function MovimientoCrudModal({ mode, item, almacenes, saving, onCancel, onSubmit }) {
    const [form, setForm] = useState({
        id_presentacion: item?.id_presentacion || "",
        id_almacen: item?.id_almacen || "",
        tipo: item?.tipo || "entrada",
        cantidad: item?.cantidad || 1,
        origen: item?.origen || "ajuste",
        id_origen: item?.id_origen || "",
    });

    return (
        <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit({
                        id_presentacion: Number(form.id_presentacion),
                        id_almacen: Number(form.id_almacen),
                        tipo: form.tipo,
                        cantidad: Number(form.cantidad),
                        origen: form.origen,
                        id_origen: Number(form.id_origen),
                    });
                }}
                className="bg-white rounded-2xl border border-border shadow-card w-full max-w-lg p-5 space-y-4"
            >
                <h3 className="text-lg font-semibold text-primary">{mode === "create" ? "Nuevo movimiento" : "Editar movimiento"}</h3>
                <Input label="ID Presentacion" type="number" min="1" value={form.id_presentacion} onChange={(e) => setForm((p) => ({ ...p, id_presentacion: e.target.value }))} />
                <Select label="Almacen" value={form.id_almacen} onChange={(e) => setForm((p) => ({ ...p, id_almacen: e.target.value }))} options={almacenes.map((a) => ({ value: a.id_almacen, label: a.nombre }))} placeholder="Seleccionar" />
                <Select label="Tipo" value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))} options={[{ value: "entrada", label: "Entrada" }, { value: "salida", label: "Salida" }, { value: "ajuste", label: "Ajuste" }]} />
                <Input label="Cantidad" type="number" min="1" value={form.cantidad} onChange={(e) => setForm((p) => ({ ...p, cantidad: e.target.value }))} />
                <Select label="Origen" value={form.origen} onChange={(e) => setForm((p) => ({ ...p, origen: e.target.value }))} options={[{ value: "venta", label: "Venta" }, { value: "compra", label: "Compra" }, { value: "remision", label: "Remision" }, { value: "ajuste", label: "Ajuste" }]} />
                <Input label="ID Origen" type="number" min="1" value={form.id_origen} onChange={(e) => setForm((p) => ({ ...p, id_origen: e.target.value }))} />
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onCancel}>Cancelar</Button>
                    <Button type="submit" variant="accent" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
                </div>
            </form>
        </div>
    );
}