"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader, Package, Plus, Search, ShoppingCart, Trash2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PageTitle from "@/components/ui/PageTitle";
import {
    createOrdenCompra,
    getOrdenCompraById,
    getPresentacionesParaOrden,
    getProveedoresActivos,
    updateOrdenCompra,
} from "@/services/ordenesCompraService";
import { getAlmacenes, getInventario } from "@/services/almacenesService";

function fmt(n) {
    return Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

export default function OrdenForm({ id }) {
    const router = useRouter();
    const isEditing = Boolean(id);

    const [proveedores, setProveedores] = useState([]);
    const [almacenes, setAlmacenes] = useState([]);
    const [presentaciones, setPresentaciones] = useState([]);
    const [loadingInit, setLoadingInit] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [idProveedor, setIdProveedor] = useState("");
    const [idAlmacen, setIdAlmacen] = useState("");
    const [giroAuto, setGiroAuto] = useState("");
    const [fecha, setFecha] = useState(today());
    const [notas, setNotas] = useState("");
    const [partidas, setPartidas] = useState([]);
    const [stockMap, setStockMap] = useState({});

    const [selectorOpen, setSelectorOpen] = useState(false);
    const [selectorSearch, setSelectorSearch] = useState("");

    useEffect(() => {
        async function init() {
            try {
                setLoadingInit(true);
                const [provData, presData, almData] = await Promise.all([
                    getProveedoresActivos(),
                    getPresentacionesParaOrden(),
                    getAlmacenes(),
                ]);

                const proveedoresList = Array.isArray(provData) ? provData : [];
                const presentacionesList = Array.isArray(presData) ? presData : [];
                const almacenesList = Array.isArray(almData) ? almData : [];

                setProveedores(proveedoresList);
                setPresentaciones(presentacionesList);
                setAlmacenes(almacenesList);

                if (isEditing) {
                    const orden = await getOrdenCompraById(id);
                    setIdProveedor(String(orden.id_proveedor || ""));
                    setIdAlmacen(String(orden.id_almacen || ""));
                    setFecha((orden.fecha || "").slice(0, 10) || today());
                    setNotas(orden.notas || "");
                    setPartidas(
                        (orden.detalles || []).map((d) => ({
                            id_presentacion: d.id_presentacion,
                            origen_linea: d.origen_linea || (d.id_presentacion ? "catalogo" : "manual"),
                            descripcion_manual: d.descripcion_manual || d.presentacion_nombre || "",
                            codigo_manual: d.codigo_manual || d.codigo_barras || "",
                            nombre: d.presentacion_nombre,
                            producto_nombre: d.producto_nombre,
                            codigo_barras: d.codigo_barras,
                            cantidad: Number(d.cantidad || 1),
                            costo_unitario: Number(d.costo_unitario || 0),
                        }))
                    );
                }

                setError("");
            } catch (err) {
                setError(err.message || "No se pudo cargar el formulario");
            } finally {
                setLoadingInit(false);
            }
        }

        init();
    }, [id, isEditing]);

    useEffect(() => {
        if (!idProveedor) {
            setGiroAuto("");
            return;
        }

        const prov = proveedores.find((p) => String(p.id_proveedor) === String(idProveedor));
        setGiroAuto(prov?.giro || "");
    }, [idProveedor, proveedores]);

    useEffect(() => {
        async function loadInventarioAlmacen() {
            if (!idAlmacen) {
                setStockMap({});
                return;
            }

            try {
                const inventario = await getInventario({ id_almacen: idAlmacen });
                const nextMap = {};
                (Array.isArray(inventario) ? inventario : []).forEach((item) => {
                    nextMap[String(item.id_presentacion)] = Number(item.stock || 0);
                });
                setStockMap(nextMap);
            } catch {
                setStockMap({});
            }
        }

        loadInventarioAlmacen();
    }, [idAlmacen]);

    const subtotal = useMemo(
        () => partidas.reduce((acc, p) => acc + p.cantidad * p.costo_unitario, 0),
        [partidas]
    );

    const filteredPres = useMemo(() => {
        const q = selectorSearch.trim().toLowerCase();
        if (!q) return presentaciones.slice(0, 80);

        return presentaciones
            .filter((p) =>
                String(p.nombre || "").toLowerCase().includes(q)
                || String(p.producto_nombre || "").toLowerCase().includes(q)
                || String(p.codigo_barras || "").toLowerCase().includes(q)
            )
            .slice(0, 80);
    }, [presentaciones, selectorSearch]);

    function addPartida(pres) {
        setPartidas((prev) => {
            const idx = prev.findIndex((p) => String(p.id_presentacion) === String(pres.id_presentacion));
            if (idx >= 0) {
                return prev.map((p, i) => (i === idx ? { ...p, cantidad: p.cantidad + 1 } : p));
            }

            return [
                ...prev,
                {
                    origen_linea: "catalogo",
                    id_presentacion: pres.id_presentacion,
                    nombre: pres.nombre,
                    producto_nombre: pres.producto_nombre || `Producto #${pres.id_producto}`,
                    codigo_barras: pres.codigo_barras,
                    descripcion_manual: pres.nombre,
                    codigo_manual: pres.codigo_barras || "",
                    cantidad: 1,
                    costo_unitario: Number(pres.costo ?? pres.ultimo_costo ?? 0),
                },
            ];
        });
        setSelectorOpen(false);
        setSelectorSearch("");
    }

    function updateCantidad(idx, val) {
        const n = Number(val);
        if (!Number.isInteger(n) || n < 1) return;
        setPartidas((prev) => prev.map((p, i) => (i === idx ? { ...p, cantidad: n } : p)));
    }

    function updateCosto(idx, val) {
        const n = Number(val);
        if (Number.isNaN(n) || n < 0) return;
        setPartidas((prev) => prev.map((p, i) => (i === idx ? { ...p, costo_unitario: n } : p)));
    }

    function removePartida(idx) {
        setPartidas((prev) => prev.filter((_, i) => i !== idx));
    }

    function addManualPartida() {
        setPartidas((prev) => ([
            ...prev,
            {
                origen_linea: "manual",
                id_presentacion: null,
                nombre: "",
                producto_nombre: "Producto manual",
                codigo_barras: "",
                descripcion_manual: "",
                codigo_manual: "",
                cantidad: 1,
                costo_unitario: 0,
            },
        ]));
    }

    function updateManualField(idx, field, value) {
        setPartidas((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
    }

    async function handleSave() {
        if (!idProveedor) {
            setError("Selecciona un proveedor");
            return;
        }

        if (!idAlmacen) {
            setError("Selecciona un almacen");
            return;
        }

        if (partidas.length === 0) {
            setError("Agrega al menos una partida");
            return;
        }

        try {
            setSaving(true);
            const payload = {
                id_proveedor: Number(idProveedor),
                id_almacen: Number(idAlmacen),
                fecha,
                notas,
                detalles: partidas.map((p) => ({
                    id_presentacion: p.id_presentacion ? Number(p.id_presentacion) : null,
                    origen_linea: p.origen_linea || (p.id_presentacion ? "catalogo" : "manual"),
                    descripcion_manual: p.descripcion_manual || p.nombre || p.producto_nombre,
                    codigo_manual: p.codigo_manual || p.codigo_barras || "",
                    cantidad: Number(p.cantidad),
                    costo_unitario: Number(p.costo_unitario),
                })),
            };

            if (isEditing) {
                await updateOrdenCompra(id, payload);
            } else {
                await createOrdenCompra(payload);
            }

            router.replace("/proveedores/ordenes");
        } catch (err) {
            setError(err.message || "No se pudo guardar la orden");
        } finally {
            setSaving(false);
        }
    }

    if (loadingInit) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="animate-spin text-primary" />
            </div>
        );
    }

    const proveedorOptions = proveedores.map((p) => ({
        value: p.id_proveedor,
        label: p.nombre,
    }));

    const almacenOptions = almacenes.map((a) => ({
        value: a.id_almacen,
        label: a.nombre,
    }));

    return (
        <div className="space-y-5">
            <PageTitle
                title={isEditing ? "Editar Orden de Compra" : "Nueva Orden de Compra"}
                subtitle={isEditing ? `Modificando orden #${id}` : "Crea una nueva orden de compra para un proveedor"}
                icon={<ShoppingCart size={22} />}
                actions={
                    <Link href="/proveedores/ordenes">
                        <Button variant="outline" className="gap-2">
                            <ChevronLeft size={16} /> Volver
                        </Button>
                    </Link>
                }
            />

            {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
            )}

            <div className="flex flex-col xl:flex-row gap-5 items-start">
                <div className="flex-1 space-y-5 min-w-0">
                    <div className="bg-white rounded-2xl border border-border shadow-card p-5">
                        <h2 className="text-base font-semibold text-primary mb-4">Datos de la Orden</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="sm:col-span-1">
                                <Select
                                    label="Proveedor *"
                                    name="id_proveedor"
                                    value={idProveedor}
                                    onChange={(e) => setIdProveedor(e.target.value)}
                                    options={proveedorOptions}
                                    placeholder="Seleccionar proveedor..."
                                />
                            </div>

                            <div className="sm:col-span-1">
                                <Select
                                    label="Almacen *"
                                    name="id_almacen"
                                    value={idAlmacen}
                                    onChange={(e) => setIdAlmacen(e.target.value)}
                                    options={almacenOptions}
                                    placeholder="Seleccionar almacen..."
                                />
                            </div>

                            <Input
                                label="Giro del Proveedor"
                                name="giro"
                                value={giroAuto}
                                readOnly
                                inputClassName="bg-background/60 cursor-not-allowed text-muted"
                            />

                            <Input
                                label="Fecha *"
                                name="fecha"
                                type="date"
                                value={fecha}
                                onChange={(e) => setFecha(e.target.value)}
                            />

                            <div className="sm:col-span-3">
                                <label className="text-sm text-muted block mb-1">Notas / Observaciones</label>
                                <textarea
                                    rows={2}
                                    value={notas}
                                    onChange={(e) => setNotas(e.target.value)}
                                    placeholder="Opcional..."
                                    className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-background/40 focus:outline-none focus:ring-2 focus:ring-secondary resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-border shadow-card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-base font-semibold text-primary">Productos</h2>
                                <p className="text-xs text-muted">{partidas.length} producto{partidas.length !== 1 ? "s" : ""} agregado{partidas.length !== 1 ? "s" : ""}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-end">
                                <Button variant="outline" className="gap-2 rounded-xl" onClick={addManualPartida}>
                                    <Plus size={15} /> Producto manual
                                </Button>
                                <Button variant="primary" className="gap-2 rounded-xl" onClick={() => setSelectorOpen(true)}>
                                    <Plus size={15} /> Agregar Producto
                                </Button>
                            </div>
                        </div>

                        {partidas.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted gap-2">
                                <Package size={32} className="opacity-30" />
                                <p className="text-sm">Sin productos. Haz clic en &quot;Agregar Producto&quot; para comenzar.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[850px]">
                                    <thead className="bg-background text-primary">
                                        <tr>
                                            <th className="text-left p-2 pl-3">Producto / Presentacion</th>
                                            <th className="text-left p-2">Codigo</th>
                                            <th className="text-right p-2">Cantidad</th>
                                            <th className="text-right p-2">Costo Unit.</th>
                                            <th className="text-right p-2">Importe</th>
                                            <th className="p-2 w-10" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {partidas.map((p, idx) => (
                                            <tr key={`${p.id_presentacion}-${idx}`} className="border-t border-border hover:bg-background/40">
                                                <td className="p-2 pl-3">
                                                    {p.origen_linea === "manual" ? (
                                                        <div className="space-y-2 min-w-[260px]">
                                                            <Input
                                                                label="Descripción"
                                                                value={p.descripcion_manual || ""}
                                                                onChange={(e) => updateManualField(idx, "descripcion_manual", e.target.value)}
                                                                inputClassName="py-2"
                                                            />
                                                            <Input
                                                                label="Código (opcional)"
                                                                value={p.codigo_manual || ""}
                                                                onChange={(e) => updateManualField(idx, "codigo_manual", e.target.value)}
                                                                inputClassName="py-2"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <p className="font-medium text-primary">{p.nombre}</p>
                                                            <p className="text-xs text-muted">{p.producto_nombre || "-"}</p>
                                                        </>
                                                    )}
                                                </td>
                                                <td className="p-2 font-mono text-xs text-muted">{p.origen_linea === "manual" ? (p.codigo_manual || "-") : (p.codigo_barras || "-")}</td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={p.cantidad}
                                                        onChange={(e) => updateCantidad(idx, e.target.value)}
                                                        className="w-20 text-right rounded-lg border border-border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-secondary ml-auto block"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step="0.01"
                                                        value={p.costo_unitario}
                                                        onChange={(e) => updateCosto(idx, e.target.value)}
                                                        className="w-28 text-right rounded-lg border border-border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-secondary ml-auto block"
                                                    />
                                                </td>
                                                <td className="p-2 text-right font-medium text-primary">
                                                    {fmt(p.cantidad * p.costo_unitario)}
                                                </td>
                                                <td className="p-2">
                                                    <button onClick={() => removePartida(idx)} className="text-muted hover:text-red-600 transition p-1">
                                                        <Trash2 size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-full xl:w-72 shrink-0">
                    <div className="xl:sticky xl:top-6 bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
                        <h3 className="text-base font-semibold text-primary">Resumen de la Orden</h3>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-muted">
                                <span>Productos</span>
                                <span>{partidas.length}</span>
                            </div>
                            <div className="flex justify-between text-muted">
                                <span>Piezas totales</span>
                                <span>{partidas.reduce((a, p) => a + p.cantidad, 0)}</span>
                            </div>

                            <div className="border-t border-border pt-2 mt-2 space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-muted">Subtotal</span>
                                    <span className="font-medium text-primary">{fmt(subtotal)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <Button
                                variant="primary"
                                className="w-full rounded-xl"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? "Guardando..." : isEditing ? "Actualizar Orden" : "Guardar Orden"}
                            </Button>
                            <Link href="/proveedores/ordenes">
                                <Button variant="outline" className="w-full rounded-xl">Cancelar</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {selectorOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 px-4">
                    <div className="w-full max-w-2xl bg-white rounded-2xl border border-border shadow-card flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                            <h3 className="text-base font-semibold text-primary">Seleccionar Presentacion</h3>
                            <button onClick={() => { setSelectorOpen(false); setSelectorSearch(""); }} className="text-muted hover:text-primary">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-4 border-b border-border shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Buscar por nombre, producto o codigo de barras..."
                                    value={selectorSearch}
                                    onChange={(e) => setSelectorSearch(e.target.value)}
                                    className="w-full rounded-xl border border-border pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                                />
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            {filteredPres.length === 0 ? (
                                <div className="p-8 text-center text-muted text-sm">No se encontraron presentaciones.</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-background text-primary sticky top-0">
                                        <tr>
                                            <th className="text-left p-3">Producto / Presentacion</th>
                                            <th className="text-left p-3">Codigo</th>
                                            <th className="text-right p-3">Costo</th>
                                            <th className="text-right p-3">Stock</th>
                                            <th className="p-3 w-24" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPres.map((pres) => {
                                            const yaAgregado = partidas.some((p) => String(p.id_presentacion) === String(pres.id_presentacion));

                                            return (
                                                <tr key={pres.id_presentacion} className="border-t border-border hover:bg-background/40">
                                                    <td className="p-3">
                                                        <p className="font-medium text-primary">{pres.nombre}</p>
                                                        <p className="text-xs text-muted">{pres.producto_nombre || `Producto #${pres.id_producto}`}</p>
                                                    </td>
                                                    <td className="p-3 text-xs text-muted font-mono">{pres.codigo_barras || "-"}</td>
                                                    <td className="p-3 text-right">{fmt(pres.costo ?? pres.ultimo_costo ?? 0)}</td>
                                                    <td className="p-3 text-right font-medium text-primary">{stockMap[String(pres.id_presentacion)] ?? 0}</td>
                                                    <td className="p-3 text-right">
                                                        <Button variant="outline" size="sm" disabled={yaAgregado} onClick={() => addPartida(pres)}>
                                                            {yaAgregado ? "Agregado" : "Agregar"}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="p-4 border-t border-border shrink-0 flex justify-end">
                            <Button variant="outline" onClick={() => { setSelectorOpen(false); setSelectorSearch(""); }}>
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
