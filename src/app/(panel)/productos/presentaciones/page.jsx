"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader, Search, Plus, Pencil, Trash2, AlertTriangle, Funnel } from "lucide-react";
import {
    getProductos,
    getPresentacionesByProducto,
    createPresentacion,
    updatePresentacion,
    deletePresentacion,
    getMarcas,
    getLineas,
    getFamilias,
    getPresentacionCatalogoItems,
    getProveedores,
} from "@/services/productosService";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PageTitle from "@/components/ui/PageTitle";
import { getAlmacenes } from "@/services/almacenesService";
import DualRangeFilter from "./DualRangeFilter";
import PresentacionForm from "./PresentacionForm";
import GestionUbicaciones from "./GestionUbicaciones";

export default function ProductosPresentacionesPage() {
    const MAX_COSTO = 300;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    const [productos, setProductos] = useState([]);
    const [marcas, setMarcas] = useState([]);
    const [lineas, setLineas] = useState([]);
    const [familias, setFamilias] = useState([]);
    const [racks, setRacks] = useState([]);
    const [niveles, setNiveles] = useState([]);
    const [secciones, setSecciones] = useState([]);
    const [almacenes, setAlmacenes] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [selectedProductoId, setSelectedProductoId] = useState("");
    const [rows, setRows] = useState([]);

    const [filterMarca, setFilterMarca] = useState("");
    const [filterFamilia, setFilterFamilia] = useState("");
    const [filterLinea, setFilterLinea] = useState("");
    const [filterRack, setFilterRack] = useState("");
    const [filterNivel, setFilterNivel] = useState("");
    const [filterSeccion, setFilterSeccion] = useState("");
    const [filtersOpen, setFiltersOpen] = useState(false);

    const [costoMin, setCostoMin] = useState(0);
    const [costoMax, setCostoMax] = useState(MAX_COSTO);

    const [formModal, setFormModal] = useState({ open: false, mode: "create", item: null });
    const [deleteItem, setDeleteItem] = useState(null);
    const [catalogModalOpen, setCatalogModalOpen] = useState(false);
    const filtersAnchorRef = useRef(null);
    const filtersPanelRef = useRef(null);

    const loadRows = useCallback(async (idProducto = "") => {
        try {
            const r = await getPresentacionesByProducto(idProducto);
            setRows(Array.isArray(r) ? r : []);
            setError("");
        } catch (err) {
            setError(err.message || "No se pudieron cargar presentaciones");
        }
    }, []);

    useEffect(() => {
        if (!selectedProductoId) {
            loadRows();
            return;
        }
        loadRows(selectedProductoId);
    }, [selectedProductoId, loadRows]);

    useEffect(() => {
        const handlePointerDown = (event) => {
            const anchor = filtersAnchorRef.current;
            const panel = filtersPanelRef.current;

            if (anchor?.contains(event.target) || panel?.contains(event.target)) {
                return;
            }

            setFiltersOpen(false);
        };

        document.addEventListener("pointerdown", handlePointerDown);
        return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, []);

    const loadUbicacionOpciones = useCallback(async () => {
        const [racksData, nivelesData, seccionesData] = await Promise.all([
            getPresentacionCatalogoItems("rack"),
            getPresentacionCatalogoItems("nivel"),
            getPresentacionCatalogoItems("seccion"),
        ]);

        const toOption = (item) => ({
            value: item.id,
            label: item.label || item.nombre || item.clave || String(item.id),
            parent_id: item.parent_id ?? null,
        });

        setRacks(Array.isArray(racksData) ? racksData.map(toOption) : []);
        setNiveles(Array.isArray(nivelesData) ? nivelesData.map(toOption) : []);
        setSecciones(Array.isArray(seccionesData) ? seccionesData.map(toOption) : []);
    }, []);

    const init = useCallback(async () => {
        try {
            setLoading(true);
            const [productosData, marcasData, lineasData, familiasData, proveedoresData, almacenesData] = await Promise.all([
                getProductos(),
                getMarcas(),
                getLineas(),
                getFamilias(),
                getProveedores(),
                getAlmacenes(),
            ]);

            setProductos(Array.isArray(productosData) ? productosData : []);
            setMarcas(Array.isArray(marcasData) ? marcasData : []);
            setLineas(Array.isArray(lineasData) ? lineasData : []);
            setFamilias(Array.isArray(familiasData) ? familiasData : []);
            setProveedores(Array.isArray(proveedoresData) ? proveedoresData : []);
            setAlmacenes(Array.isArray(almacenesData) ? almacenesData : []);

            await loadUbicacionOpciones();
            setError("");
        } catch (err) {
            setError(err.message || "No se pudo cargar catalogos");
        } finally {
            setLoading(false);
        }
    }, [loadUbicacionOpciones]);

    useEffect(() => {
        init();
    }, [init]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();

        return rows.filter((r) => {
            const n = String(r.nombre || "").toLowerCase();
            if (q && !n.includes(q)) return false;

            if (filterMarca && String(r.id_marca || "") !== String(filterMarca)) return false;
            if (filterFamilia && String(r.id_familia || "") !== String(filterFamilia)) return false;
            if (filterLinea && String(r.id_linea || "") !== String(filterLinea)) return false;
            if (filterRack && String(r.id_rack || "") !== String(filterRack)) return false;
            if (filterNivel && String(r.id_nivel || "") !== String(filterNivel)) return false;
            if (filterSeccion && String(r.id_seccion || "") !== String(filterSeccion)) return false;

            const costo = Number(r.costo || 0);
            if (costo < costoMin || costo > costoMax) return false;

            return true;
        });
    }, [
        rows,
        search,
        filterMarca,
        filterFamilia,
        filterLinea,
        filterRack,
        filterNivel,
        filterSeccion,
        costoMin,
        costoMax,
    ]);

    const onSave = async (payload) => {
        if (formModal.mode === "create") {
            await createPresentacion(payload.id_producto, payload);
        } else {
            await updatePresentacion(formModal.item.id_presentacion, payload);
        }

        setFormModal({ open: false, mode: "create", item: null });

        if (String(payload.id_producto) !== String(selectedProductoId)) {
            setSelectedProductoId(String(payload.id_producto));
        } else {
            await loadRows(selectedProductoId || payload.id_producto);
        }
    };

    const onDelete = async () => {
        await deletePresentacion(deleteItem.id_presentacion);
        setDeleteItem(null);
        await loadRows(selectedProductoId);
    };

    const resetFilters = () => {
        setFilterMarca("");
        setFilterFamilia("");
        setFilterLinea("");
        setFilterRack("");
        setFilterNivel("");
        setFilterSeccion("");
        setCostoMin(0);
        setCostoMax(MAX_COSTO);
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
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <PageTitle title="Presentaciones" subtitle="Catalogo de presentaciones para productos." />

                <Button variant="outline" onClick={() => setCatalogModalOpen(true)}>
                    Gestion de Ubicaciones
                </Button>

                <Button
                    onClick={() => setFormModal({ open: true, mode: "create", item: null })}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 md:ml-auto rounded-xl shadow-sm"
                >
                    <Plus size={16} /> Agregar presentacion
                </Button>
            </div>

            {error && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

            <div className="relative p-4 rounded-2xl flex flex-col md:flex-row mb-4 gap-3 md:items-center">
                <div className="relative inline-block w-full md:w-[460px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <Input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        inputClassName="bg-white text-primary w-full py-2.5 pl-10 pr-4 rounded-full"
                    />
                </div>

                <div ref={filtersAnchorRef} className="relative flex justify-end md:ml-auto">
                    <Button variant="ghost" onClick={() => setFiltersOpen((value) => !value)}>
                        <span className="flex items-center gap-2"><Funnel size={16} /></span>
                    </Button>

                    {filtersOpen && (
                        <div
                            ref={filtersPanelRef}
                            className="absolute right-0 top-full mt-2 z-30 w-[min(22vw,520px)] rounded-2xl border border-border bg-white shadow-card"
                        >
                            <div className="max-h-[40vh] overflow-y-auto p-4 space-y-4">
                                <Select
                                    label="Producto"
                                    value={selectedProductoId}
                                    onChange={(e) => setSelectedProductoId(e.target.value)}
                                    options={productos.map((p) => ({ value: p.id_producto, label: p.nombre }))}
                                    placeholder="Todas las presentaciones"
                                    selectClassName="bg-white"
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Select
                                        label="Marca"
                                        value={filterMarca}
                                        onChange={(e) => setFilterMarca(e.target.value)}
                                        options={marcas.map((m) => ({ value: m.id_marca, label: m.nombre }))}
                                        placeholder="--"
                                        selectClassName="bg-white"
                                    />

                                    <Select
                                        label="Familia"
                                        value={filterFamilia}
                                        onChange={(e) => setFilterFamilia(e.target.value)}
                                        options={familias.map((f) => ({ value: f.id_familia, label: f.nombre }))}
                                        placeholder="--"
                                        selectClassName="bg-white"
                                    />

                                    <Select
                                        label="Linea"
                                        value={filterLinea}
                                        onChange={(e) => setFilterLinea(e.target.value)}
                                        options={lineas.map((l) => ({ value: l.id_linea, label: l.nombre }))}
                                        placeholder="--"
                                        selectClassName="bg-white"
                                    />

                                    <Select
                                        label="Rack"
                                        value={filterRack}
                                        onChange={(e) => setFilterRack(e.target.value)}
                                        options={racks}
                                        placeholder="--"
                                        selectClassName="bg-white"
                                    />

                                    <Select
                                        label="Nivel"
                                        value={filterNivel}
                                        onChange={(e) => setFilterNivel(e.target.value)}
                                        options={niveles}
                                        placeholder="--"
                                        selectClassName="bg-white"
                                    />

                                    <Select
                                        label="Seccion"
                                        value={filterSeccion}
                                        onChange={(e) => setFilterSeccion(e.target.value)}
                                        options={secciones}
                                        placeholder="--"
                                        selectClassName="bg-white"
                                    />
                                </div>

                                <DualRangeFilter
                                    label="Costo"
                                    min={costoMin}
                                    max={costoMax}
                                    minLimit={0}
                                    maxLimit={MAX_COSTO}
                                    onChangeMin={setCostoMin}
                                    onChangeMax={setCostoMax}
                                />
                            </div>

                            <div className="p-4 border-t border-border flex items-center justify-between gap-2">
                                <Button variant="outline" onClick={resetFilters}>Limpiar</Button>
                                <Button variant="primary" onClick={() => setFiltersOpen(false)}>Aplicar</Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[1400px] text-sm">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-2">ID</th>
                            <th className="text-left p-3">CodigoBarras</th>
                            <th className="text-left p-3">Nombre</th>
                            <th className="text-left p-2">Tipo</th>
                            <th className="text-left p-2">Piezas</th>
                            <th className="text-left p-3">Costo</th>
                            <th className="text-left p-3">Precio</th>
                            <th className="text-left p-2">Ubicacion</th>
                            <th className="text-left p-3">Linea</th>
                            <th className="text-left p-3">Familia</th>
                            <th className="text-left p-3">Marca</th>
                            <th className="text-center p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={12} className="p-6 text-center text-muted">No hay presentaciones para mostrar.</td>
                            </tr>
                        )}

                        {filtered.map((p) => (
                            <tr key={p.id_presentacion} className="border-t border-border hover:bg-background/50">
                                <td className="p-2">{p.id_presentacion}</td>
                                <td className="p-3">{p.codigo_barras}</td>
                                <td className="p-3">{p.nombre}</td>
                                <td className="p-2">{p.tipo_presentacion || "-"}</td>
                                <td className="p-2">{p.piezas_por_presentacion}</td>
                                <td className="p-3">${Number(p.costo || 0).toFixed(2)}</td>
                                <td className="p-3">${Number(p.precio_nivel_1 || 0).toFixed(2)}</td>
                                <td className="p-2">{p.codigo_ubicacion || "-"}</td>
                                <td className="p-3">{p.linea_nombre || "-"}</td>
                                <td className="p-3">{p.familia_nombre || "-"}</td>
                                <td className="p-3">{p.marca_nombre || "-"}</td>
                                <td className="p-3">
                                    <div className="flex justify-center text-muted">
                                        <Button variant="ghost" className="p-0 h-auto" onClick={() => setFormModal({ open: true, mode: "edit", item: p })}>
                                            <Pencil size={18} className="hover:text-yellow-700" />
                                        </Button>
                                        <Button variant="ghost" className="p-0 h-auto" onClick={() => setDeleteItem(p)}>
                                            <Trash2 size={18} className="hover:text-red-700" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {formModal.open && (
                <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
                    <PresentacionForm
                        mode={formModal.mode}
                        item={formModal.item}
                        productos={productos}
                        marcas={marcas}
                        lineas={lineas}
                        familias={familias}
                        racks={racks}
                        niveles={niveles}
                        secciones={secciones}
                        almacenes={almacenes}
                        proveedores={proveedores}
                        selectedProductoId={selectedProductoId}
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
                                <h3 className="text-lg font-semibold text-primary">Eliminar presentacion</h3>
                                <p className="text-sm text-muted mt-1">Se eliminara {deleteItem.nombre}. Esta accion no se puede deshacer.</p>
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancelar</Button>
                            <Button variant="accent" onClick={onDelete}>Confirmar</Button>
                        </div>
                    </div>
                </div>
            )}

            {catalogModalOpen && (
                <GestionUbicaciones
                    onClose={() => setCatalogModalOpen(false)}
                    onUpdated={async () => {
                        await loadUbicacionOpciones();
                    }}
                />
            )}
        </div>
    );
}
