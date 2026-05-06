"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Loader2, ArrowRightLeft, SlidersHorizontal, Warehouse, Funnel } from "lucide-react";
import PageTitle from "@/components/ui/PageTitle";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { FilterPopover } from "@/components/ui/FilterPopover";
import { getAlmacenes, getInventario, ajusteInventario, traspasoInventario } from "@/services/almacenesService";
import { getPresentacionesByProducto } from "@/services/productosService";

export default function AlmacenesInventarioPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [almacenes, setAlmacenes] = useState([]);
    const [rows, setRows] = useState([]);

    const [search, setSearch] = useState("");
    const [idAlmacen, setIdAlmacen] = useState("");
    const [soloBajoMinimo, setSoloBajoMinimo] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);

    const [ajusteModal, setAjusteModal] = useState({ open: false, item: null });
    const [traspasoModal, setTraspasoModal] = useState({ open: false, item: null });

    const loadBase = useCallback(async () => {
        try {
            setLoading(true);
            const [a, i] = await Promise.all([
                getAlmacenes(),
                getInventario({ id_almacen: idAlmacen, search, soloBajoMinimo }),
            ]);
            setAlmacenes(Array.isArray(a) ? a : []);
            setRows(Array.isArray(i) ? i : []);
            setError("");
        } catch (e) {
            setError(e.message || "Error al cargar inventario");
        } finally {
            setLoading(false);
        }
    }, [idAlmacen, search, soloBajoMinimo]);

    const loadInventario = useCallback(async () => {
        try {
            const i = await getInventario({ id_almacen: idAlmacen, search, soloBajoMinimo });
            setRows(Array.isArray(i) ? i : []);
            setError("");
        } catch (e) {
            setError(e.message || "Error al cargar inventario");
        }
    }, [idAlmacen, search, soloBajoMinimo]);

    useEffect(() => {
        loadBase();
    }, [loadBase]);

    useEffect(() => {
        if (!loading) loadInventario();
    }, [idAlmacen, soloBajoMinimo, loadInventario, loading]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) =>
            String(r.producto_nombre || "").toLowerCase().includes(q) ||
            String(r.presentacion_nombre || "").toLowerCase().includes(q) ||
            String(r.codigo_barras || "").toLowerCase().includes(q)
        );
    }, [rows, search]);

    const generateOrigenId = () => Number(`${Date.now()}`.slice(-9));

    async function onSubmitAjuste({ id_presentacion_destino, cantidad_destino, nota }) {
        try {
            setSaving(true);
            await ajusteInventario({
                id_almacen: ajusteModal.item.id_almacen,
                id_presentacion: ajusteModal.item.id_presentacion,
                id_presentacion_destino,
                cantidad_destino,
                nota,
                origen: "ajuste",
                id_origen: generateOrigenId(),
            });
            setAjusteModal({ open: false, item: null });
            await loadInventario();
        } catch (e) {
            setError(e.message || "Error al ajustar inventario");
        } finally {
            setSaving(false);
        }
    }

    async function onSubmitTraspaso({ id_almacen_destino, cantidad, nota }) {
        try {
            setSaving(true);
            await traspasoInventario({
                id_almacen_origen: traspasoModal.item.id_almacen,
                id_almacen_destino,
                id_presentacion: traspasoModal.item.id_presentacion,
                cantidad,
                nota,
                id_origen: generateOrigenId(),
            });
            setTraspasoModal({ open: false, item: null });
            await loadInventario();
        } catch (e) {
            setError(e.message || "Error al traspasar inventario");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="h-56 flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <PageTitle title="Inventario" subtitle="Control de inventario, movimientos y alertas." icon={<Warehouse />} />
            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

            {/* Controles de filtro y acciones */}
            <div className="p-4">
                <div className="flex flex-col md:flex-row gap-3 md:items-center">
                    <div className="relative inline-block w-full md:w-[420px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar producto, presentacion o codigo..."
                            inputClassName="bg-white text-primary py-2.5 pl-10 pr-4 rounded-full"
                        />
                    </div>

                    <div className="md:ml-auto flex items-center gap-2">
                        <FilterPopover
                            open={filtersOpen}
                            onOpenChange={setFiltersOpen}
                            triggerVariant="ghost"
                            triggerClassName="px-3 py-2"
                            triggerContent={<span className="flex items-center gap-2"><Funnel size={16} /></span>}
                            panelClassName="w-[340px]"
                            panelPositionClassName="right-0 top-full"
                            onClear={() => {
                                setIdAlmacen("");
                                setSoloBajoMinimo(false);
                                setFiltersOpen(false);
                                loadInventario();
                            }}
                            onApply={() => {
                                setFiltersOpen(false);
                                loadInventario();
                            }}
                        >
                            <Select
                                label="Almacén"
                                value={idAlmacen}
                                onChange={(e) => setIdAlmacen(e.target.value)}
                                placeholder="Todos los almacenes"
                                options={almacenes.map((a) => ({ value: a.id_almacen, label: `${a.nombre} (${a.tipo})` }))}
                                selectClassName="bg-white"
                            />

                            <div>
                                <p className="text-xs text-muted mb-2">Stock</p>
                                <Button variant={soloBajoMinimo ? "tabActive" : "tabIdle"} className="border rounded-xl" onClick={() => setSoloBajoMinimo((v) => !v)}>
                                    <SlidersHorizontal size={16} /> {soloBajoMinimo ? "Ver todos" : "Solo bajo minimo"}
                                </Button>
                            </div>
                        </FilterPopover>

                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-x-auto">
                <table className="w-full text-sm min-w-[860px]">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">Producto</th>
                            <th className="text-left p-3">Presentacion</th>
                            <th className="text-left p-3">Codigo</th>
                            <th className="text-left p-3">Almacen</th>
                            <th className="text-left p-3">Stock</th>
                            <th className="text-left p-3">Minimo</th>
                            <th className="text-center p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-6 text-center text-muted">Sin datos de inventario</td>
                            </tr>
                        ) : (
                            filtered.map((r) => {
                                const bajo = Number(r.stock) <= Number(r.stock_minimo);
                                return (
                                    <tr key={r.id_inventario} className="border-t border-border hover:bg-background/50">
                                        <td className="p-3">{r.producto_nombre}</td>
                                        <td className="p-3">{r.presentacion_nombre}</td>
                                        <td className="p-3">{r.codigo_barras || "-"}</td>
                                        <td className="p-3">{r.almacen_nombre}</td>
                                        <td className="p-3 font-medium">{r.stock}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 text-xs rounded-full ${bajo ? "bg-red-600 text-white" : "bg-green-600 text-white"}`}>
                                                {r.stock_minimo}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex justify-center gap-2">
                                                <Button variant="outline" size="sm" onClick={() => setAjusteModal({ open: true, item: r })}>Ajustar</Button>
                                                <Button variant="ghost" size="sm" onClick={() => setTraspasoModal({ open: true, item: r })}>
                                                    <ArrowRightLeft size={15} /> Traspasar
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {ajusteModal.open && (
                <AjusteModal
                    item={ajusteModal.item}
                    saving={saving}
                    onCancel={() => setAjusteModal({ open: false, item: null })}
                    onSubmit={onSubmitAjuste}
                />
            )}

            {traspasoModal.open && (
                <TraspasoModal
                    item={traspasoModal.item}
                    saving={saving}
                    almacenes={almacenes}
                    onCancel={() => setTraspasoModal({ open: false, item: null })}
                    onSubmit={onSubmitTraspaso}
                />
            )}
        </div>
    );
}

function AjusteModal({ item, onCancel, onSubmit, saving }) {
    const [presentaciones, setPresentaciones] = useState([]);
    const [loadingPresentaciones, setLoadingPresentaciones] = useState(false);
    const [idPresentacionDestino, setIdPresentacionDestino] = useState("");
    const [cantidad, setCantidad] = useState("");
    const [nota, setNota] = useState("");
    const [localError, setLocalError] = useState("");

    useEffect(() => {
        let active = true;

        async function loadPresentaciones() {
            if (!item?.id_producto) return;

            try {
                setLoadingPresentaciones(true);
                const data = await getPresentacionesByProducto(item.id_producto);
                const opciones = (Array.isArray(data) ? data : []).filter((p) => String(p.id_presentacion) !== String(item.id_presentacion));

                if (!active) return;

                setPresentaciones(opciones);
                setIdPresentacionDestino(String(opciones[0]?.id_presentacion || ""));
                setLocalError(opciones.length > 0 ? "" : "Este producto no tiene otra presentacion para convertir");
            } catch (error) {
                if (active) {
                    setLocalError(error.message || "No se pudieron cargar las presentaciones del producto");
                }
            } finally {
                if (active) setLoadingPresentaciones(false);
            }
        }

        loadPresentaciones();

        return () => {
            active = false;
        };
    }, [item?.id_producto, item?.id_presentacion]);

    const destino = presentaciones.find((p) => String(p.id_presentacion) === String(idPresentacionDestino));
    const piezasOrigen = Number(item?.piezas_por_presentacion || 1) || 1;
    const piezasDestino = Number(destino?.piezas_por_presentacion || 0) || 0;
    const cantidadDestino = Number(cantidad || 0);
    const cantidadOrigenExacta = piezasOrigen > 0 ? (cantidadDestino * piezasDestino) / piezasOrigen : 0;
    const conversionValida = Boolean(destino) && piezasDestino > 0 && Number.isInteger(cantidadDestino) && cantidadDestino > 0 && Number.isInteger(cantidadOrigenExacta) && cantidadOrigenExacta > 0;
    const cantidadOrigen = conversionValida ? cantidadOrigenExacta : 0;
    const submitDisabled = saving || loadingPresentaciones || !destino || !conversionValida;

    return (
        <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit({
                        id_presentacion_destino: Number(idPresentacionDestino),
                        cantidad_destino: Number(cantidad),
                        nota: nota.trim(),
                    });
                }}
                className="bg-white rounded-2xl border border-border shadow-card w-full max-w-xl p-5 space-y-4"
            >
                <h3 className="text-lg font-semibold text-primary">Ajuste por conversión</h3>
                <p className="text-sm text-muted">{item?.producto_nombre} / {item?.presentacion_nombre}</p>

                <Select
                    label="Presentacion destino"
                    value={idPresentacionDestino}
                    onChange={(e) => setIdPresentacionDestino(e.target.value)}
                    options={presentaciones.map((p) => ({
                        value: p.id_presentacion,
                        label: `${p.nombre} (${p.piezas_por_presentacion} piezas)`,
                    }))}
                    placeholder={loadingPresentaciones ? "Cargando presentaciones..." : "Seleccionar destino"}
                />

                <Input
                    label={`Cantidad destino (${destino?.nombre || "presentacion"})`}
                    type="number"
                    step="1"
                    min="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                />

                <Input
                    label="Motivo / nota (opcional)"
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    placeholder="Describe por que se realiza la conversion"
                />

                <div className="rounded-xl border border-border bg-background p-3 text-sm text-primary space-y-1">
                    <p><strong>Origen:</strong> {item?.presentacion_nombre} = {piezasOrigen} piezas</p>
                    <p><strong>Destino:</strong> {destino ? `${destino.nombre} = ${piezasDestino} piezas` : "Selecciona una presentacion destino"}</p>
                    <p><strong>Equivalencia:</strong> {conversionValida ? `Se descuentan ${cantidadOrigen} ${item?.presentacion_nombre} y se agregan ${cantidadDestino} ${destino?.nombre}` : "No se puede convertir exactamente con esta cantidad destino"}</p>
                </div>

                {localError ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{localError}</div> : null}

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onCancel}>Cancelar</Button>
                    <Button type="submit" variant="accent" disabled={submitDisabled}>{saving ? "Guardando..." : "Aplicar"}</Button>
                </div>
            </form>
        </div>
    );
}

function TraspasoModal({ item, almacenes, onCancel, onSubmit, saving }) {
    const [idDestino, setIdDestino] = useState("");
    const [cantidad, setCantidad] = useState("");
    const [nota, setNota] = useState("");
    const destinos = almacenes.filter((a) => String(a.id_almacen) !== String(item?.id_almacen));
    const submitDisabled = saving || !idDestino || !cantidad || !nota.trim();

    return (
        <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit({ id_almacen_destino: Number(idDestino), cantidad: Number(cantidad), nota: nota.trim() });
                }}
                className="bg-white rounded-2xl border border-border shadow-card w-full max-w-lg p-5 space-y-4"
            >
                <h3 className="text-lg font-semibold text-primary">Traspaso de inventario</h3>
                <p className="text-sm text-muted">{item?.producto_nombre} / {item?.presentacion_nombre}</p>

                <Select
                    label="Almacen destino"
                    value={idDestino}
                    onChange={(e) => setIdDestino(e.target.value)}
                    options={destinos.map((d) => ({ value: d.id_almacen, label: `${d.nombre} (${d.tipo})` }))}
                    placeholder="Seleccionar destino"
                />

                <Input label="Cantidad" type="number" step="1" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
                <Input label="Motivo / nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Describe por que se realiza el traspaso" />

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onCancel}>Cancelar</Button>
                    <Button type="submit" variant="accent" disabled={submitDisabled}>{saving ? "Guardando..." : "Traspasar"}</Button>
                </div>
            </form>
        </div>
    );
}


