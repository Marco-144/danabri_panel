"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader, Search, Plus, Pencil, Trash2, X, AlertTriangle, Funnel } from "lucide-react";
import {
    getProductos,
    getPresentacionesByProducto,
    createPresentacion,
    updatePresentacion,
    deletePresentacion,
    getMarcas,
    getLineas,
    getFamilias,
    getPresentacionOpciones,
    getPresentacionCatalogoItems,
    createPresentacionCatalogoItem,
    updatePresentacionCatalogoItem,
    deletePresentacionCatalogoItem,
} from "@/services/productosService";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PageTitle from "@/components/ui/PageTitle";
import { getAlmacenes } from "@/services/almacenesService";

function DualRangeFilter({ label, min, max, minLimit, maxLimit, onChangeMin, onChangeMax }) {
    const minPercent = ((min - minLimit) / (maxLimit - minLimit)) * 100;
    const maxPercent = ((max - minLimit) / (maxLimit - minLimit)) * 100;

    return (
        <div className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-sm text-primary font-medium">{label}</p>
                <p className="text-xs text-muted">{min} - {max}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
                <Input
                    label="Desde"
                    type="number"
                    min={minLimit}
                    max={maxLimit}
                    value={min}
                    onChange={(e) => {
                        const value = Number(e.target.value || 0);
                        onChangeMin(Math.max(minLimit, Math.min(value, max)));
                    }}
                    inputClassName="bg-white"
                />
                <Input
                    label="Hasta"
                    type="number"
                    min={minLimit}
                    max={maxLimit}
                    value={max}
                    onChange={(e) => {
                        const value = Number(e.target.value || 0);
                        onChangeMax(Math.min(maxLimit, Math.max(value, min)));
                    }}
                    inputClassName="bg-white"
                />
            </div>

            <div className="relative pt-4 pb-1">
                <div className="h-2 rounded-full bg-background border border-border relative">
                    <div
                        className="absolute h-full rounded-full bg-accent/30"
                        style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
                    />
                </div>

                <input
                    type="range"
                    min={minLimit}
                    max={maxLimit}
                    value={min}
                    onChange={(e) => {
                        const value = Number(e.target.value);
                        onChangeMin(Math.min(value, max));
                    }}
                    className="absolute inset-x-0 top-0 w-full h-8 bg-transparent appearance-none pointer-events-auto"
                />

                <input
                    type="range"
                    min={minLimit}
                    max={maxLimit}
                    value={max}
                    onChange={(e) => {
                        const value = Number(e.target.value);
                        onChangeMax(Math.max(value, min));
                    }}
                    className="absolute inset-x-0 top-0 w-full h-8 bg-transparent appearance-none pointer-events-auto"
                />
            </div>
        </div>
    );
}

export default function ProductosPresentacionesPage() {
    const MAX_COSTO_MENUDEO = 300;
    const MAX_COSTO_MAYOREO = 300;

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
    const [selectedProductoId, setSelectedProductoId] = useState("");
    const [rows, setRows] = useState([]);

    const [filterMarca, setFilterMarca] = useState("");
    const [filterFamilia, setFilterFamilia] = useState("");
    const [filterLinea, setFilterLinea] = useState("");
    const [filterRack, setFilterRack] = useState("");
    const [filterNivel, setFilterNivel] = useState("");
    const [filterSeccion, setFilterSeccion] = useState("");
    const [filtersOpen, setFiltersOpen] = useState(false);

    const [menudeoMin, setMenudeoMin] = useState(0);
    const [menudeoMax, setMenudeoMax] = useState(MAX_COSTO_MENUDEO);
    const [mayoreoMin, setMayoreoMin] = useState(0);
    const [mayoreoMax, setMayoreoMax] = useState(MAX_COSTO_MAYOREO);

    const [formModal, setFormModal] = useState({ open: false, mode: "create", item: null });
    const [deleteItem, setDeleteItem] = useState(null);
    const [catalogModalOpen, setCatalogModalOpen] = useState(false);
    const filtersAnchorRef = useRef(null);
    const filtersPanelRef = useRef(null);

    useEffect(() => {
        if (!selectedProductoId) {
            loadRows();
            return;
        }
        loadRows(selectedProductoId);
    }, [selectedProductoId]);

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
            getPresentacionOpciones("rack"),
            getPresentacionOpciones("nivel"),
            getPresentacionOpciones("seccion"),
        ]);

        setRacks(Array.isArray(racksData) ? racksData : []);
        setNiveles(Array.isArray(nivelesData) ? nivelesData : []);
        setSecciones(Array.isArray(seccionesData) ? seccionesData : []);
    }, []);

    const init = useCallback(async () => {
        try {
            setLoading(true);
            const [productosData, marcasData, lineasData, familiasData] = await Promise.all([
                getProductos(),
                getMarcas(),
                getLineas(),
                getFamilias(),
            ]);

            const productosArr = Array.isArray(productosData) ? productosData : [];
            setProductos(productosArr);
            setMarcas(Array.isArray(marcasData) ? marcasData : []);
            setLineas(Array.isArray(lineasData) ? lineasData : []);
            setFamilias(Array.isArray(familiasData) ? familiasData : []);

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

    const loadRows = async (idProducto = "") => {
        try {
            const r = await getPresentacionesByProducto(idProducto);
            setRows(Array.isArray(r) ? r : []);
            setError("");
        } catch (err) {
            setError(err.message || "No se pudieron cargar presentaciones");
        }
    };

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

            const costoMenudeo = Number(r.precio_menudeo || 0);
            const costoMayoreo = Number(r.precio_mayoreo || 0);

            if (costoMenudeo < menudeoMin || costoMenudeo > menudeoMax) return false;
            if (costoMayoreo < mayoreoMin || costoMayoreo > mayoreoMax) return false;

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
        menudeoMin,
        menudeoMax,
        mayoreoMin,
        mayoreoMax,
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
        setMenudeoMin(0);
        setMenudeoMax(MAX_COSTO_MENUDEO);
        setMayoreoMin(0);
        setMayoreoMax(MAX_COSTO_MAYOREO);
    };

    if (loading) return <div className="h-56 flex items-center justify-center"><Loader className="animate-spin text-primary" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <PageTitle title="Presentaciones" subtitle="Catalogo de presentaciones para productos." />

                <Button variant="outline" onClick={() => setCatalogModalOpen(true)}>
                    Gestión de Ubicaciones
                </Button>

                <Button onClick={() => setFormModal({ open: true, mode: "create", item: null })} className="bg-primary text-primary-foreground hover:bg-primary/90 md:ml-auto rounded-xl shadow-sm">
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
                            className="absolute right-0 top-full mt-2 z-30 w-[min(22vw,520px)] rounded-2xl border border-border bg-white shadow-card">


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
                                    label="Costo menudeo"
                                    min={menudeoMin}
                                    max={menudeoMax}
                                    minLimit={0}
                                    maxLimit={MAX_COSTO_MENUDEO}
                                    onChangeMin={setMenudeoMin}
                                    onChangeMax={setMenudeoMax}
                                />

                                <DualRangeFilter
                                    label="Costo mayoreo"
                                    min={mayoreoMin}
                                    max={mayoreoMax}
                                    minLimit={0}
                                    maxLimit={MAX_COSTO_MAYOREO}
                                    onChangeMin={setMayoreoMin}
                                    onChangeMax={setMayoreoMax}
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
                            <th className="text-left p-3">ID</th>
                            <th className="text-left p-3">Codigo de Barras</th>
                            <th className="text-left p-3">Nombre</th>
                            <th className="text-left p-3">Tipo</th>
                            <th className="text-left p-3">Piezas</th>
                            <th className="text-left p-3">Costo Menudeo</th>
                            <th className="text-left p-3">Costo Mayoreo</th>
                            <th className="text-left p-3">Codigo de Ubicacion</th>
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
                                <td className="p-3">{p.id_presentacion}</td>
                                <td className="p-3">{p.codigo_barras}</td>
                                <td className="p-3">{p.nombre}</td>
                                <td className="p-3">{p.tipo_presentacion || "-"}</td>
                                <td className="p-3">{p.piezas_por_presentacion}</td>
                                <td className="p-3">${Number(p.precio_menudeo || 0).toFixed(2)}</td>
                                <td className="p-3">${Number(p.precio_mayoreo || 0).toFixed(2)}</td>
                                <td className="p-3">{p.codigo_ubicacion || "-"}</td>
                                <td className="p-3">{p.linea_nombre || "-"}</td>
                                <td className="p-3">{p.familia_nombre || "-"}</td>
                                <td className="p-3">{p.marca_nombre || "-"}</td>
                                <td className="p-3">
                                    <div className="flex justify-center text-muted">
                                        <Button variant="ghost" className="p-0 h-auto" onClick={() => setFormModal({ open: true, mode: "edit", item: p })}><Pencil size={18} className="hover:text-yellow-700" /></Button>
                                        <Button variant="ghost" className="p-0 h-auto" onClick={() => setDeleteItem(p)}><Trash2 size={18} className="hover:text-red-700" /></Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {formModal.open && (
                <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
                    <PresentacionFormModalInline
                        mode={formModal.mode}
                        item={formModal.item}
                        productos={productos}
                        marcas={marcas}
                        lineas={lineas}
                        familias={familias}
                        racks={racks}
                        niveles={niveles}
                        secciones={secciones}
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

            {catalogModalOpen && (
                <CatalogoUbicacionCrudModal
                    onClose={() => setCatalogModalOpen(false)}
                    onUpdated={async () => {
                        await loadUbicacionOpciones();
                    }}
                />
            )}
        </div>
    );
}

function CatalogoUbicacionCrudModal({ onClose, onUpdated }) {
    const [campo, setCampo] = useState("rack");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [items, setItems] = useState([]);
    const [nuevoNombre, setNuevoNombre] = useState("");
    const [editId, setEditId] = useState(null);
    const [editNombre, setEditNombre] = useState("");
    const [nuevoParentId, setNuevoParentId] = useState("");
    const [editParentId, setEditParentId] = useState("");
    const [parentOptions, setParentOptions] = useState([]);

    const parentLabelByCampo = {
        rack: "Almacen",
        nivel: "Rack",
        seccion: "Nivel",
    };

    const loadItems = useCallback(async (targetCampo = campo) => {
        try {
            setLoading(true);
            const data = await getPresentacionCatalogoItems(targetCampo);
            setItems(Array.isArray(data) ? data : []);
            setError("");
        } catch (err) {
            setError(err.message || "No se pudo cargar el catalogo");
        } finally {
            setLoading(false);
        }
    }, [campo]);

    const loadParentOptions = useCallback(async (targetCampo = campo) => {
        if (targetCampo === "rack") {
            const data = await getAlmacenes();
            setParentOptions(
                (Array.isArray(data) ? data : []).map((a) => ({
                    value: a.id_almacen,
                    label: a.nombre,
                }))
            );
            return;
        }

        if (targetCampo === "nivel") {
            const data = await getPresentacionCatalogoItems("rack");
            setParentOptions(
                (Array.isArray(data) ? data : []).map((item) => ({
                    value: item.id,
                    label: item.label,
                }))
            );
            return;
        }

        const data = await getPresentacionCatalogoItems("nivel");
        setParentOptions(
            (Array.isArray(data) ? data : []).map((item) => ({
                value: item.id,
                label: item.label,
            }))
        );
    }, [campo]);

    useEffect(() => {
        const run = async () => {
            await Promise.all([loadItems(campo), loadParentOptions(campo)]);
            setNuevoParentId("");
            setEditId(null);
            setEditNombre("");
            setEditParentId("");
        };
        run();
    }, [campo, loadItems, loadParentOptions]);

    const onCreate = async () => {
        const nombre = String(nuevoNombre || "").trim();
        if (!nombre) return;

        try {
            if (!nuevoParentId) {
                setError(`Selecciona ${parentLabelByCampo[campo].toLowerCase()} antes de agregar`);
                return;
            }

            await createPresentacionCatalogoItem(campo, { nombre, parent_id: Number(nuevoParentId) });
            setNuevoNombre("");
            setNuevoParentId("");
            await loadItems(campo);
            await onUpdated?.();
            setError("");
        } catch (err) {
            setError(err.message || "No se pudo crear");
        }
    };

    const onSaveEdit = async () => {
        const nombre = String(editNombre || "").trim();
        if (!editId || !nombre) return;

        try {
            await updatePresentacionCatalogoItem(campo, editId, {
                nombre,
                parent_id: editParentId ? Number(editParentId) : undefined,
            });
            setEditId(null);
            setEditNombre("");
            setEditParentId("");
            await loadItems(campo);
            await onUpdated?.();
            setError("");
        } catch (err) {
            setError(err.message || "No se pudo actualizar");
        }
    };

    const onDelete = async (id) => {
        if (!confirm("Deseas eliminar este registro?")) return;

        try {
            await deletePresentacionCatalogoItem(campo, id);
            await loadItems(campo);
            await onUpdated?.();
            setError("");
        } catch (err) {
            setError(err.message || "No se pudo eliminar");
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-border shadow-card w-full max-w-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="text-lg font-semibold text-primary">CRUD de ubicaciones</h3>
                    <Button variant="ghost" className="p-0 h-auto" onClick={onClose}><X size={18} className="text-muted hover:text-primary" /></Button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {[
                            { value: "rack", label: "Rack" },
                            { value: "nivel", label: "Nivel" },
                            { value: "seccion", label: "Seccion" },
                        ].map((tab) => (
                            <Button
                                key={tab.value}
                                variant={campo === tab.value ? "primary" : "outline"}
                                onClick={() => setCampo(tab.value)}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </div>

                    {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

                    <div className="flex gap-2">
                        <div className="w-full max-w-[220px]">
                            <Select
                                value={nuevoParentId}
                                onChange={(e) => setNuevoParentId(e.target.value)}
                                options={parentOptions}
                                placeholder={`Seleccionar ${parentLabelByCampo[campo].toLowerCase()}`}
                                selectClassName="bg-white"
                            />
                        </div>
                        <Input
                            placeholder="Nombre"
                            value={nuevoNombre}
                            onChange={(e) => setNuevoNombre(e.target.value)}
                            inputClassName="bg-white"
                        />
                        <Button onClick={onCreate}><Plus size={16} /> Agregar</Button>
                    </div>

                    <div className="border border-border rounded-xl max-h-[40vh] overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-muted text-sm">Cargando...</div>
                        ) : items.length === 0 ? (
                            <div className="p-4 text-center text-muted text-sm">Sin registros</div>
                        ) : (
                            <div className="divide-y divide-border">
                                {items.map((item) => {
                                    const isEditing = editId === item.id;
                                    return (
                                        <div key={item.id} className="p-3 flex items-center gap-2">
                                            <span className="text-xs text-muted w-12">#{item.id}</span>

                                            {isEditing ? (
                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    <Select
                                                        value={editParentId}
                                                        onChange={(e) => setEditParentId(e.target.value)}
                                                        options={parentOptions}
                                                        placeholder={parentLabelByCampo[campo]}
                                                        selectClassName="bg-white"
                                                    />
                                                    <Input
                                                        value={editNombre}
                                                        onChange={(e) => setEditNombre(e.target.value)}
                                                        inputClassName="bg-white"
                                                    />
                                                </div>
                                            ) : (
                                                <p className="text-sm text-primary flex-1">{item.label}</p>
                                            )}

                                            {isEditing ? (
                                                <>
                                                    <Button variant="primary" onClick={onSaveEdit}>Guardar</Button>
                                                    <Button variant="outline" onClick={() => { setEditId(null); setEditNombre(""); }}>Cancelar</Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        className="p-0 h-auto"
                                                        onClick={() => {
                                                            setEditId(item.id);
                                                            setEditNombre(item.nombre || item.label || "");
                                                            setEditParentId(item.parent_id ? String(item.parent_id) : "");
                                                        }}
                                                    >
                                                        <Pencil size={16} />
                                                    </Button>
                                                    <Button variant="ghost" className="p-0 h-auto" onClick={() => onDelete(item.id)}>
                                                        <Trash2 size={16} className="hover:text-red-700" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function PresentacionFormModalInline({
    mode,
    item,
    productos,
    marcas,
    lineas,
    familias,
    racks,
    niveles,
    secciones,
    selectedProductoId,
    onClose,
    onSave,
}) {
    const ensureOption = (options, currentValue) => {
        const value = currentValue === undefined || currentValue === null ? "" : String(currentValue);
        if (!value) return options;
        if (options.some((option) => String(option.value) === value)) return options;
        return [...options, { value, label: value }];
    };
    const [form, setForm] = useState({
        id_producto: item?.id_producto ? String(item.id_producto) : String(selectedProductoId || ""),
        nombre: item?.nombre || "",
        tipo_presentacion: item?.tipo_presentacion || "pieza",
        piezas_por_presentacion: item?.piezas_por_presentacion || 1,
        codigo_barras: item?.codigo_barras || "",
        precio_menudeo: item?.precio_menudeo || "",
        precio_mayoreo: item?.precio_mayoreo || "",
        id_marca: item?.id_marca ? String(item.id_marca) : "",
        id_linea: item?.id_linea ? String(item.id_linea) : "",
        id_familia: item?.id_familia ? String(item.id_familia) : "",
        ubicacion: item?.ubicacion || "tienda",
        id_rack: item?.id_rack ? String(item.id_rack) : "",
        id_nivel: item?.id_nivel ? String(item.id_nivel) : "",
        id_seccion: item?.id_seccion ? String(item.id_seccion) : "",
        activo: item ? (item.activo === 1 || item.activo === true || item.activo === "1") : true,
    });

    const productoOptions = ensureOption(
        productos.map((p) => ({ value: p.id_producto, label: p.nombre })),
        form.id_producto
    );

    const marcaOptions = ensureOption(
        marcas.map((m) => ({ value: m.id_marca, label: m.nombre })),
        form.id_marca
    );

    const lineaOptions = ensureOption(
        lineas.map((l) => ({ value: l.id_linea, label: l.nombre })),
        form.id_linea
    );

    const familiaOptions = ensureOption(
        familias.map((f) => ({ value: f.id_familia, label: f.nombre })),
        form.id_familia
    );

    const rackOptions = ensureOption(racks, form.id_rack);
    const nivelOptions = ensureOption(niveles, form.id_nivel);
    const seccionOptions = ensureOption(secciones, form.id_seccion);

    const submit = (e) => {
        e.preventDefault();
        onSave?.({
            id_producto: Number(form.id_producto),
            nombre: String(form.nombre || "").trim(),
            tipo_presentacion: String(form.tipo_presentacion || "").trim(),
            codigo_barras: String(form.codigo_barras || "").trim(),
            piezas_por_presentacion: Number(form.piezas_por_presentacion),
            precio_menudeo: Number(form.precio_menudeo),
            precio_mayoreo: Number(form.precio_mayoreo),
            id_marca: form.id_marca ? Number(form.id_marca) : null,
            id_linea: form.id_linea ? Number(form.id_linea) : null,
            id_familia: form.id_familia ? Number(form.id_familia) : null,
            ubicacion: String(form.ubicacion || "").trim(),
            id_rack: form.id_rack ? Number(form.id_rack) : null,
            id_nivel: form.id_nivel ? Number(form.id_nivel) : null,
            id_seccion: form.id_seccion ? Number(form.id_seccion) : null,
            activo: Boolean(form.activo),
        });
    };

    return (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-border shadow-card w-full max-w-4xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-semibold text-primary">{mode === "create" ? "Agregar presentacion" : "Editar presentacion"}</h3>
                <Button variant="ghost" className="p-0 h-auto" onClick={onClose}><X size={18} className="text-muted hover:text-primary" /></Button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label="Producto"
                        value={form.id_producto}
                        onChange={(e) => setForm((p) => ({ ...p, id_producto: e.target.value }))}
                        options={productoOptions}
                        placeholder="Selecciona producto"
                    />

                    <Input
                        label="Nombre"
                        value={form.nombre}
                        onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                        inputClassName="py-2"
                    />
                </div>

                <Select
                    label="Tipo de presentacion"
                    value={form.tipo_presentacion}
                    onChange={(e) => setForm((p) => ({ ...p, tipo_presentacion: e.target.value }))}
                    options={[
                        { value: "pieza", label: "Pieza" },
                        { value: "caja", label: "Caja" },
                        { value: "paquete", label: "Paquete" },
                    ]}
                    placeholder="Selecciona tipo"
                />

                <Input
                    label="Piezas"
                    type="number"
                    min={1}
                    value={form.piezas_por_presentacion}
                    onChange={(e) => setForm((p) => ({ ...p, piezas_por_presentacion: e.target.value }))}
                    inputClassName="py-2"
                />

                <Input
                    label="Codigo de barras"
                    value={form.codigo_barras}
                    onChange={(e) => setForm((p) => ({ ...p, codigo_barras: e.target.value }))}
                    inputClassName="py-2"
                />

                <Input
                    label="Costo menudeo"
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.precio_menudeo}
                    onChange={(e) => setForm((p) => ({ ...p, precio_menudeo: e.target.value }))}
                    inputClassName="py-2"
                />

                <Input
                    label="Costo mayoreo"
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.precio_mayoreo}
                    onChange={(e) => setForm((p) => ({ ...p, precio_mayoreo: e.target.value }))}
                    inputClassName="py-2"
                />

                <Select
                    label="Marca"
                    value={form.id_marca}
                    onChange={(e) => setForm((p) => ({ ...p, id_marca: e.target.value }))}
                    options={marcaOptions}
                    placeholder="Selecciona marca"
                />

                <Select
                    label="Linea"
                    value={form.id_linea}
                    onChange={(e) => setForm((p) => ({ ...p, id_linea: e.target.value }))}
                    options={lineaOptions}
                    placeholder="Selecciona linea"
                />

                <Select
                    label="Familia"
                    value={form.id_familia}
                    onChange={(e) => setForm((p) => ({ ...p, id_familia: e.target.value }))}
                    options={familiaOptions}
                    placeholder="Selecciona familia"
                />

                <Select
                    label="Ubicacion"
                    value={form.ubicacion}
                    onChange={(e) => setForm((p) => ({ ...p, ubicacion: e.target.value }))}
                    options={[
                        { value: "tienda", label: "Tienda" },
                        { value: "almacen", label: "Almacen" },
                    ]}
                    placeholder="Selecciona ubicacion"
                />

                <Select
                    label="Rack"
                    value={form.id_rack}
                    onChange={(e) => setForm((p) => ({ ...p, id_rack: e.target.value }))}
                    options={rackOptions}
                    placeholder="Selecciona rack"
                />

                <Select
                    label="Nivel"
                    value={form.id_nivel}
                    onChange={(e) => setForm((p) => ({ ...p, id_nivel: e.target.value }))}
                    options={nivelOptions}
                    placeholder="Selecciona nivel"
                />

                <Select
                    label="Seccion"
                    value={form.id_seccion}
                    onChange={(e) => setForm((p) => ({ ...p, id_seccion: e.target.value }))}
                    options={seccionOptions}
                    placeholder="Selecciona seccion"
                />

                <label className="md:col-span-2 flex items-center gap-2 text-sm text-primary mt-1">
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
