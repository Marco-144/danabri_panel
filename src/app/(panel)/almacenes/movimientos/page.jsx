"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, Warehouse } from "lucide-react";
import PageTitle from "@/components/ui/PageTitle";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { getAlmacenes, getMovimientos } from "@/services/almacenesService";

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

    return (
        <div className="space-y-4">
            <PageTitle title="Movimientos" subtitle="Control de inventario, movimientos y alertas." icon={<Warehouse />} />
            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

            <Card className="p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto/codigo/almacen" />
                    <Select value={idAlmacen} onChange={(e) => setIdAlmacen(e.target.value)} options={almacenes.map((a) => ({ value: a.id_almacen, label: a.nombre }))} placeholder="Almacen" />
                    <Select value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Tipo" options={[{ value: "entrada", label: "Entrada" }, { value: "salida", label: "Salida" }, { value: "ajuste", label: "Ajuste" }]} />
                    <Select value={origen} onChange={(e) => setOrigen(e.target.value)} placeholder="Origen" options={[{ value: "venta", label: "Venta" }, { value: "compra", label: "Compra" }, { value: "remision", label: "Remision" }, { value: "ajuste", label: "Ajuste" }, { value: "traspaso", label: "Traspaso" }]} />
                    <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
                    <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={loadBase}>Limpiar</Button>
                    <Button onClick={onSearch}><Search size={14} /> Buscar</Button>
                </div>
            </Card>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-x-auto">
                <table className="w-full text-sm min-w-[1100px]">
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
                            <th className="text-left p-3">Nota</th>
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
                                    <td className="p-3 text-muted">{r.nota || "-"}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
