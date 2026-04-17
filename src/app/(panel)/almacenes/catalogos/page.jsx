"use client";

import { useEffect, useState } from "react";
import PageTitle from "@/components/ui/PageTitle";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Warehouse } from "lucide-react";
import { getAlmacenes, createAlmacen, updateAlmacen, deleteAlmacen } from "@/services/almacenesService";

const TIPOS = [
    { value: "matriz", label: "Matriz" },
    { value: "sucursal", label: "Sucursal" },
];

const INITIAL = { nombre: "", tipo: "", activo: true };

export default function AlmacenesCatalogosPage() {
    const [rows, setRows] = useState([]);
    const [form, setForm] = useState(INITIAL);
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    async function load() {
        try {
            setRows(await getAlmacenes());
            setError("");
        } catch (e) {
            setError(e.message || "Error al cargar almacenes");
        }
    }

    useEffect(() => {
        load();
    }, []);

    function resetForm() {
        setForm(INITIAL);
        setEditing(null);
    }

    async function onSubmit(e) {
        e.preventDefault();
        try {
            setSaving(true);
            if (editing) {
                await updateAlmacen(editing.id_almacen, form);
            } else {
                await createAlmacen(form);
            }
            resetForm();
            await load();
        } catch (err) {
            setError(err.message || "Error al guardar almacen");
        } finally {
            setSaving(false);
        }
    }

    async function onDelete(id) {
        const ok = window.confirm("Seguro que deseas eliminar este almacen?");
        if (!ok) return;
        try {
            await deleteAlmacen(id);
            await load();
        } catch (e) {
            setError(e.message || "Error al eliminar almacen");
        }
    }

    function onEdit(row) {
        setEditing(row);
        setForm({
            nombre: row.nombre || "",
            tipo: row.tipo || "",
            activo: Boolean(row.activo),
        });
    }

    return (
        <div className="space-y-4">
            <PageTitle title="Almacenes" subtitle="Control de inventario, movimientos y alertas." icon={<Warehouse />} />
            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

            <Card className="p-4">
                <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <Input label="Nombre" value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del almacen" required />

                    <Select label="Tipo" value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))} options={TIPOS} placeholder="Selecciona tipo" required />

                    <Select
                        label="Activo"
                        value={form.activo ? "1" : "0"}
                        onChange={(e) => setForm((p) => ({ ...p, activo: e.target.value === "1" }))}
                        options={[
                            { value: "1", label: "Si" },
                            { value: "0", label: "No" },
                        ]}
                        placeholder="Selecciona"
                    />

                    <div className="flex gap-2">
                        <Button type="submit" variant="accent" disabled={saving}>{saving ? "Guardando..." : editing ? "Actualizar" : "Crear"}</Button>
                        {editing ? <Button variant="outline" onClick={resetForm}>Cancelar</Button> : null}
                    </div>
                </form>
            </Card>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">Nombre</th>
                            <th className="text-left p-3">Tipo</th>
                            <th className="text-left p-3">Activo</th>
                            <th className="text-left p-3">Inventario</th>
                            <th className="text-right p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr><td colSpan={5} className="p-6 text-center text-muted">Sin almacenes</td></tr>
                        ) : (
                            rows.map((r) => (
                                <tr key={r.id_almacen} className="border-t border-border hover:bg-background/50">
                                    <td className="p-3">{r.nombre}</td>
                                    <td className="p-3">{r.tipo}</td>
                                    <td className="p-3">{r.activo ? "Si" : "No"}</td>
                                    <td className="p-3">{r.registros_inventario}</td>
                                    <td className="p-3 text-right">
                                        <div className="inline-flex gap-2">
                                            <Button size="sm" variant="outline" onClick={() => onEdit(r)}>Editar</Button>
                                            <Button size="sm" variant="danger" onClick={() => onDelete(r.id_almacen)}>Eliminar</Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
