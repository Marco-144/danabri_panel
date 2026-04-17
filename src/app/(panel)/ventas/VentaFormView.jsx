"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader, Plus, Save, Search, ShoppingCart, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PageTitle from "@/components/ui/PageTitle";
import { getAlmacenes } from "@/services/almacenesService";
import { createVenta, getVentaById, getVentasCatalog, updateVenta } from "@/services/ventasService";

const METODOS_PAGO = [
    { value: "efectivo", label: "Efectivo" },
    { value: "tarjeta", label: "Tarjeta" },
    { value: "transferencia", label: "Transferencia" },
    { value: "vale", label: "Vale" },
];

const ESTADOS_VENTA = [
    { value: "pagada", label: "Pagada" },
    { value: "cancelada", label: "Cancelada" },
];

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

export default function VentaFormView({ id }) {
    const router = useRouter();
    const isEditing = Boolean(id);

    const [loadingInit, setLoadingInit] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [almacenes, setAlmacenes] = useState([]);
    const [catalogRows, setCatalogRows] = useState([]);
    const [catalogSearch, setCatalogSearch] = useState("");

    const [idAlmacen, setIdAlmacen] = useState("");
    const [metodoPago, setMetodoPago] = useState("efectivo");
    const [estado, setEstado] = useState("pagada");
    const [fecha, setFecha] = useState(today());
    const [detalles, setDetalles] = useState([]);

    const loadCatalog = useCallback(async (almacenId, searchTerm = catalogSearch) => {
        if (!almacenId) {
            setCatalogRows([]);
            return;
        }

        try {
            const rows = await getVentasCatalog({ id_almacen: almacenId, search: searchTerm });
            setCatalogRows(Array.isArray(rows) ? rows : []);
        } catch (e) {
            setCatalogRows([]);
            setError(e.message || "No se pudo cargar el catálogo de venta");
        }
    }, [catalogSearch]);

    useEffect(() => {
        async function init() {
            try {
                setLoadingInit(true);
                const almacenesData = await getAlmacenes();
                const almacenesList = Array.isArray(almacenesData) ? almacenesData : [];
                setAlmacenes(almacenesList);

                if (isEditing) {
                    const venta = await getVentaById(id);
                    setIdAlmacen(String(venta.id_almacen || ""));
                    setMetodoPago(venta.metodo_pago || "efectivo");
                    setEstado(venta.estado || "pagada");
                    setFecha((venta.created_at || today()).slice(0, 10) || today());
                    setDetalles((venta.detalles || []).map((item) => ({
                        id_presentacion: item.id_presentacion,
                        producto_nombre: item.producto_nombre,
                        presentacion_nombre: item.presentacion_nombre,
                        codigo_barras: item.codigo_barras,
                        stock: 0,
                        cantidad: Number(item.cantidad || 1),
                        precio_unitario: Number(item.precio_unitario || 0),
                    })));
                } else if (almacenesList.length > 0) {
                    setIdAlmacen(String(almacenesList[0].id_almacen));
                }

                setError("");
            } catch (e) {
                setError(e.message || "No se pudo cargar el formulario");
            } finally {
                setLoadingInit(false);
            }
        }

        init();
    }, [id, isEditing]);

    useEffect(() => {
        loadCatalog(idAlmacen, catalogSearch);
    }, [idAlmacen, catalogSearch, loadCatalog]);

    const catalogMap = useMemo(() => {
        const map = new Map();
        for (const row of catalogRows) {
            map.set(String(row.id_presentacion), row);
        }
        return map;
    }, [catalogRows]);

    const lineas = useMemo(() => {
        return detalles.map((item) => {
            const catalogItem = catalogMap.get(String(item.id_presentacion));
            return {
                ...item,
                producto_nombre: item.producto_nombre || catalogItem?.producto_nombre || "-",
                presentacion_nombre: item.presentacion_nombre || catalogItem?.presentacion_nombre || "-",
                codigo_barras: item.codigo_barras || catalogItem?.codigo_barras || "-",
                stock: catalogItem?.stock ?? item.stock ?? 0,
            };
        });
    }, [detalles, catalogMap]);

    const total = useMemo(() => {
        return lineas.reduce((acc, item) => acc + Number(item.cantidad || 0) * Number(item.precio_unitario || 0), 0);
    }, [lineas]);

    const filteredCatalog = useMemo(() => {
        const q = catalogSearch.trim().toLowerCase();
        if (!q) return catalogRows;
        return catalogRows.filter((row) =>
            String(row.producto_nombre || "").toLowerCase().includes(q)
            || String(row.presentacion_nombre || "").toLowerCase().includes(q)
            || String(row.codigo_barras || "").toLowerCase().includes(q)
        );
    }, [catalogRows, catalogSearch]);

    function addCatalogItem(row) {
        setDetalles((prev) => {
            const idx = prev.findIndex((item) => String(item.id_presentacion) === String(row.id_presentacion));
            if (idx >= 0) {
                return prev.map((item, index) => (
                    index === idx ? { ...item, cantidad: Number(item.cantidad || 0) + 1 } : item
                ));
            }

            return [
                ...prev,
                {
                    id_presentacion: row.id_presentacion,
                    producto_nombre: row.producto_nombre,
                    presentacion_nombre: row.presentacion_nombre,
                    codigo_barras: row.codigo_barras,
                    stock: Number(row.stock || 0),
                    cantidad: 1,
                    precio_unitario: Number(row.precio_sugerido || row.precio_nivel_1 || row.costo || 0),
                },
            ];
        });
    }

    function updateItem(idx, field, value) {
        setDetalles((prev) => prev.map((item, index) => {
            if (index !== idx) return item;
            if (field === "cantidad") {
                const n = Number(value);
                if (!Number.isInteger(n) || n < 1) return item;
                return { ...item, cantidad: n };
            }
            if (field === "precio_unitario") {
                const n = Number(value);
                if (Number.isNaN(n) || n < 0) return item;
                return { ...item, precio_unitario: n };
            }
            return { ...item, [field]: value };
        }));
    }

    function removeItem(idx) {
        setDetalles((prev) => prev.filter((_, index) => index !== idx));
    }

    async function handleSave() {
        if (!idAlmacen) {
            setError("Selecciona un almacén");
            return;
        }

        if (detalles.length === 0) {
            setError("Agrega al menos una partida");
            return;
        }

        try {
            setSaving(true);
            const payload = {
                id_almacen: Number(idAlmacen),
                metodo_pago: metodoPago,
                estado,
                fecha,
                detalles: detalles.map((item) => ({
                    id_presentacion: Number(item.id_presentacion),
                    cantidad: Number(item.cantidad),
                    precio_unitario: Number(item.precio_unitario),
                })),
            };

            const result = isEditing
                ? await updateVenta(id, payload)
                : await createVenta(payload);

            router.replace(isEditing ? `/ventas?mode=view&id=${id}` : `/ventas?mode=view&id=${result.id}`);
        } catch (e) {
            setError(e.message || "No se pudo guardar la venta");
        } finally {
            setSaving(false);
        }
    }

    if (loadingInit) {
        return <div className="flex items-center justify-center h-64"><Loader className="animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-5">
            <PageTitle
                title={isEditing ? "Editar Venta" : "Nueva Venta"}
                subtitle={isEditing ? `Modificando venta #${id}` : "Captura una venta rápida y descuenta stock automáticamente"}
                icon={<ShoppingCart size={22} />}
                actions={
                    <Link href="/ventas">
                        <Button variant="outline" className="gap-2"><ChevronLeft size={16} /> Volver</Button>
                    </Link>
                }
            />

            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

            <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-5">
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl shadow-card border border-border p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Select
                                label="Almacén"
                                value={idAlmacen}
                                onChange={(e) => setIdAlmacen(e.target.value)}
                                options={almacenes.map((a) => ({ value: a.id_almacen, label: a.nombre }))}
                                placeholder="Seleccionar almacén"
                            />
                            <Select
                                label="Método de pago"
                                value={metodoPago}
                                onChange={(e) => setMetodoPago(e.target.value)}
                                options={METODOS_PAGO}
                                placeholder="Método"
                            />
                            <Select
                                label="Estado"
                                value={estado}
                                onChange={(e) => setEstado(e.target.value)}
                                options={ESTADOS_VENTA}
                                placeholder="Estado"
                            />
                        </div>

                    </div>

                    <div className="bg-white rounded-2xl shadow-card border border-border p-4 space-y-3">
                        <div className="flex flex-col md:flex-row md:items-end gap-3">
                            <div className="relative w-full md:w-[420px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                                <Input
                                    label="Buscar en catálogo"
                                    placeholder="Producto, presentación o código"
                                    value={catalogSearch}
                                    onChange={(e) => setCatalogSearch(e.target.value)}
                                    inputClassName="pl-10"
                                />
                            </div>
                            <Button variant="outline" onClick={() => loadCatalog(idAlmacen, catalogSearch)}>Actualizar catálogo</Button>
                        </div>

                        <div className="max-h-[420px] overflow-auto rounded-xl border border-border">
                            <table className="w-full text-sm min-w-[760px]">
                                <thead className="bg-background text-primary sticky top-0 z-10">
                                    <tr>
                                        <th className="text-left p-3">Producto</th>
                                        <th className="text-left p-3">Presentación</th>
                                        <th className="text-left p-3">Código</th>
                                        <th className="text-right p-3">Stock</th>
                                        <th className="text-right p-3">Precio</th>
                                        <th className="text-center p-3">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCatalog.length === 0 ? (
                                        <tr><td colSpan={6} className="p-6 text-center text-muted">Sin artículos disponibles</td></tr>
                                    ) : filteredCatalog.map((row) => (
                                        <tr key={row.id_presentacion} className="border-t border-border hover:bg-background/40">
                                            <td className="p-3">{row.producto_nombre}</td>
                                            <td className="p-3">{row.presentacion_nombre}</td>
                                            <td className="p-3">{row.codigo_barras || "-"}</td>
                                            <td className="p-3 text-right font-medium">{row.stock}</td>
                                            <td className="p-3 text-right">{fmtMoney(row.precio_sugerido)}</td>
                                            <td className="p-3 text-center">
                                                <Button variant="ghost" size="sm" onClick={() => addCatalogItem(row)}>
                                                    <Plus size={14} /> Agregar
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-white rounded-2xl shadow-card border border-border p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold text-primary">Partidas</h2>
                            <span className="text-xs text-muted">{lineas.length} artículo(s)</span>
                        </div>

                        <div className="space-y-3">
                            {lineas.length === 0 ? (
                                <div className="text-sm text-muted bg-background rounded-xl p-4 text-center">Aún no agregas artículos</div>
                            ) : lineas.map((item, idx) => (
                                <div key={`${item.id_presentacion}-${idx}`} className="rounded-xl border border-border p-3 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium text-primary">{item.producto_nombre}</p>
                                            <p className="text-sm text-muted">{item.presentacion_nombre} · {item.codigo_barras}</p>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <Input
                                            label="Cantidad"
                                            type="number"
                                            min="1"
                                            value={item.cantidad}
                                            onChange={(e) => updateItem(idx, "cantidad", e.target.value)}
                                        />
                                        <Input
                                            label="Precio"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.precio_unitario}
                                            onChange={(e) => updateItem(idx, "precio_unitario", e.target.value)}
                                        />
                                        <Input
                                            label="Stock"
                                            value={item.stock}
                                            readOnly
                                        />
                                    </div>

                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted">Subtotal</span>
                                        <span className="font-semibold text-primary">{fmtMoney(Number(item.cantidad || 0) * Number(item.precio_unitario || 0))}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-border pt-4 flex items-center justify-between text-lg font-semibold text-primary">
                            <span>Total</span>
                            <span>{fmtMoney(total)}</span>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Link href="/ventas">
                                <Button variant="outline">Cancelar</Button>
                            </Link>
                            <Button onClick={handleSave} disabled={saving} className="gap-2">
                                {saving ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
                                Guardar
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}