import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { getPresentacionesByProducto } from "@/services/productosService";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

export default function PresentacionForm({ mode, item, productos, marcas, lineas, familias, racks, niveles, secciones, almacenes, proveedores, selectedProductoId, onClose, onSave, }) {
    const ensureOption = (options, currentValue) => {
        const value = currentValue === undefined || currentValue === null ? "" : String(currentValue);
        if (!value) return options;
        if (options.some((option) => String(option.value) === value)) return options;
        return [...options, { value, label: value }];
    };

    const calcularPrecio = (costo, utilidad) => {
        if (!costo || !utilidad) return "";
        const costoNum = Number(costo);
        const utilidadNum = Number(utilidad);
        if (Number.isNaN(costoNum) || Number.isNaN(utilidadNum)) return "";
        return (costoNum * (1 + utilidadNum / 100)).toFixed(2);
    };

    const calcularUtilidad = (costo, precio) => {
        if (!costo || !precio) return "";
        const costoNum = Number(costo);
        const precioNum = Number(precio);
        if (Number.isNaN(costoNum) || Number.isNaN(precioNum) || costoNum === 0) return "";
        return ((((precioNum - costoNum) / costoNum) * 100)).toFixed(2);
    };

    const [form, setForm] = useState({
        id_producto: item?.id_producto ? String(item.id_producto) : String(selectedProductoId || ""),
        nombre: item?.nombre || "",
        tipo_presentacion: item?.tipo_presentacion || "pieza",
        piezas_por_presentacion: item?.piezas_por_presentacion || 1,
        codigo_barras: item?.codigo_barras || "",
        costo: item?.costo || "",
        id_proveedor: item?.id_proveedor ? String(item.id_proveedor) : "",
        precio_nivel_1: item?.precio_nivel_1 || "",
        cantidad_nivel_1: item?.cantidad_nivel_1 || "",
        utilidad_nivel_1: item?.utilidad_nivel_1 || "",
        precio_nivel_2: item?.precio_nivel_2 || "",
        cantidad_nivel_2: item?.cantidad_nivel_2 || "",
        utilidad_nivel_2: item?.utilidad_nivel_2 || "",
        precio_nivel_3: item?.precio_nivel_3 || "",
        cantidad_nivel_3: item?.cantidad_nivel_3 || "",
        utilidad_nivel_3: item?.utilidad_nivel_3 || "",
        precio_nivel_4: item?.precio_nivel_4 || "",
        cantidad_nivel_4: item?.cantidad_nivel_4 || "",
        utilidad_nivel_4: item?.utilidad_nivel_4 || "",
        precio_nivel_5: item?.precio_nivel_5 || "",
        cantidad_nivel_5: item?.cantidad_nivel_5 || "",
        utilidad_nivel_5: item?.utilidad_nivel_5 || "",
        id_marca: item?.id_marca ? String(item.id_marca) : "",
        id_linea: item?.id_linea ? String(item.id_linea) : "",
        id_familia: item?.id_familia ? String(item.id_familia) : "",
        ubicacion: item?.ubicacion || "tienda",
        id_almacen: item?.id_almacen ? String(item.id_almacen) : "",
        id_rack: item?.id_rack ? String(item.id_rack) : "",
        id_nivel: item?.id_nivel ? String(item.id_nivel) : "",
        id_seccion: item?.id_seccion ? String(item.id_seccion) : "",
        activo: item ? (item.activo === 1 || item.activo === true || item.activo === "1") : true,
    });

    const [referenciaCosto, setReferenciaCosto] = useState({ costo: null, fecha: null, loading: false });

    useEffect(() => {
        const run = async () => {
            if (mode !== "create") {
                setReferenciaCosto({
                    costo: item?.ultimo_costo ?? item?.costo ?? null,
                    fecha: item?.fecha_ultimo_costo ?? null,
                    loading: false,
                });
                return;
            }

            if (!form.id_producto) {
                setReferenciaCosto({ costo: null, fecha: null, loading: false });
                return;
            }

            try {
                setReferenciaCosto((prev) => ({ ...prev, loading: true }));
                const data = await getPresentacionesByProducto(form.id_producto);
                const arr = Array.isArray(data) ? data : [];
                const candidates = arr.filter((p) => p?.ultimo_costo !== null || p?.costo !== null);

                if (candidates.length === 0) {
                    setReferenciaCosto({ costo: null, fecha: null, loading: false });
                    return;
                }

                const sorted = [...candidates].sort((a, b) => {
                    const da = new Date(a?.fecha_ultimo_costo || 0).getTime();
                    const db = new Date(b?.fecha_ultimo_costo || 0).getTime();
                    return db - da;
                });

                const latest = sorted[0];
                setReferenciaCosto({
                    costo: latest?.ultimo_costo ?? latest?.costo ?? null,
                    fecha: latest?.fecha_ultimo_costo ?? null,
                    loading: false,
                });
            } catch {
                setReferenciaCosto({ costo: null, fecha: null, loading: false });
            }
        };

        run();
    }, [mode, item, form.id_producto]);

    const costoAnteriorLabel = useMemo(() => {
        if (referenciaCosto.loading) return "Costo anterior (cargando...)";
        if (referenciaCosto.costo === null || referenciaCosto.costo === undefined) return "Costo anterior";
        const costoTxt = `$${Number(referenciaCosto.costo).toFixed(2)}`;
        const fechaTxt = referenciaCosto.fecha ? ` (${new Date(referenciaCosto.fecha).toLocaleDateString()})` : "";
        return `Costo anterior: ${costoTxt}${fechaTxt}`;
    }, [referenciaCosto]);

    const costoAnteriorValue =
        referenciaCosto.costo === null || referenciaCosto.costo === undefined
            ? "Sin registro"
            : `$${Number(referenciaCosto.costo).toFixed(2)}`;

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

    const proveedoresOptions = ensureOption(
        proveedores.map((pv) => ({ value: pv.id_proveedor, label: pv.nombre })),
        form.id_proveedor
    );

    const almacenOptions = ensureOption(
        almacenes.map((a) => ({ value: a.id_almacen, label: a.nombre })),
        form.id_almacen
    );

    const rackOptions = useMemo(() => {
        const source = Array.isArray(racks) ? racks : [];
        const filtered = form.id_almacen
            ? source.filter((item) => item.parent_id === undefined || item.parent_id === null || String(item.parent_id) === String(form.id_almacen))
            : source;
        return ensureOption(filtered, form.id_rack);
    }, [racks, form.id_almacen, form.id_rack]);

    const nivelOptions = useMemo(() => {
        const source = Array.isArray(niveles) ? niveles : [];
        const filtered = form.id_rack
            ? source.filter((item) => item.parent_id === undefined || item.parent_id === null || String(item.parent_id) === String(form.id_rack))
            : source;
        return ensureOption(filtered, form.id_nivel);
    }, [niveles, form.id_rack, form.id_nivel]);

    const seccionOptions = useMemo(() => {
        const source = Array.isArray(secciones) ? secciones : [];
        const filtered = form.id_nivel
            ? source.filter((item) => item.parent_id === undefined || item.parent_id === null || String(item.parent_id) === String(form.id_nivel))
            : source;
        return ensureOption(filtered, form.id_seccion);
    }, [secciones, form.id_nivel, form.id_seccion]);

    const submit = (e) => {
        e.preventDefault();
        const payload = {
            id_producto: Number(form.id_producto),
            nombre: String(form.nombre || "").trim(),
            tipo_presentacion: String(form.tipo_presentacion || "").trim(),
            codigo_barras: String(form.codigo_barras || "").trim(),
            piezas_por_presentacion: Number(form.piezas_por_presentacion),
            costo: form.costo ? Number(form.costo) : null,
            id_proveedor: form.id_proveedor ? Number(form.id_proveedor) : null,
            id_marca: form.id_marca ? Number(form.id_marca) : null,
            id_linea: form.id_linea ? Number(form.id_linea) : null,
            id_familia: form.id_familia ? Number(form.id_familia) : null,
            ubicacion: String(form.ubicacion || "").trim(),
            id_almacen: form.id_almacen ? Number(form.id_almacen) : null,
            id_rack: form.id_rack ? Number(form.id_rack) : null,
            id_nivel: form.id_nivel ? Number(form.id_nivel) : null,
            id_seccion: form.id_seccion ? Number(form.id_seccion) : null,
            activo: Boolean(form.activo),
        };

        for (let i = 1; i <= 5; i++) {
            payload[`precio_nivel_${i}`] = form[`precio_nivel_${i}`] ? Number(form[`precio_nivel_${i}`]) : null;
            payload[`cantidad_nivel_${i}`] = form[`cantidad_nivel_${i}`] ? Number(form[`cantidad_nivel_${i}`]) : null;
            payload[`utilidad_nivel_${i}`] = form[`utilidad_nivel_${i}`] ? Number(form[`utilidad_nivel_${i}`]) : null;
        }

        onSave?.(payload);
    };

    return (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-border shadow-card w-full max-w-4xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-semibold text-primary">{mode === "create" ? "Agregar presentacion" : "Editar presentacion"}</h3>
                <Button variant="ghost" className="p-0 h-auto" onClick={onClose}><X size={18} className="text-muted hover:text-primary" /></Button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto">
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
                    label="Costo ($)"
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.costo}
                    onChange={(e) => setForm((p) => ({ ...p, costo: e.target.value }))}
                    inputClassName="py-2"
                />

                <Select
                    label="Proveedor"
                    value={form.id_proveedor}
                    onChange={(e) => setForm((p) => ({ ...p, id_proveedor: e.target.value }))}
                    options={proveedoresOptions}
                    placeholder="Selecciona proveedor"
                />

                <Input
                    label={costoAnteriorLabel}
                    disabled
                    value={costoAnteriorValue}
                    inputClassName="py-2 bg-background"
                />

                <div className="md:col-span-2 border-t border-b border-border pt-4 pb-8 mt-4">
                    <h4 className="text-sm font-semibold text-primary mb-4">Niveles de Precios</h4>
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((nivel) => (
                            <div key={`nivel-${nivel}`} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border border-background shadow-sm rounded-lg">
                                <div className="md:col-span-3">
                                    <p className="text-sm font-medium text-primary mb-2">Precio {nivel}</p>
                                </div>
                                <Input
                                    label="Precio ($)"
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={form[`precio_nivel_${nivel}`]}
                                    placeholder="0.00"
                                    onChange={(e) => {
                                        const precio = e.target.value;
                                        setForm((p) => ({
                                            ...p,
                                            [`precio_nivel_${nivel}`]: precio,
                                            [`utilidad_nivel_${nivel}`]: precio ? calcularUtilidad(form.costo, precio) : "",
                                        }));
                                    }}
                                    inputClassName="py-2"
                                />
                                <Input
                                    label="Cantidad"
                                    type="number"
                                    min={0}
                                    value={form[`cantidad_nivel_${nivel}`]}
                                    placeholder="0"
                                    onChange={(e) => setForm((p) => ({ ...p, [`cantidad_nivel_${nivel}`]: e.target.value }))}
                                    inputClassName="py-2"
                                />
                                <Input
                                    label="Utilidad (%)"
                                    type="number"
                                    step="0.01"
                                    value={form[`utilidad_nivel_${nivel}`]}
                                    placeholder="0.00"
                                    onChange={(e) => {
                                        const utilidad = e.target.value;
                                        setForm((p) => ({
                                            ...p,
                                            [`utilidad_nivel_${nivel}`]: utilidad,
                                            [`precio_nivel_${nivel}`]: utilidad ? calcularPrecio(form.costo, utilidad) : "",
                                        }));
                                    }}
                                    inputClassName="py-2"
                                />
                            </div>
                        ))}
                    </div>
                </div>

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
                    label="Almacen"
                    value={form.id_almacen}
                    onChange={(e) => setForm((p) => ({ ...p, id_almacen: e.target.value, id_rack: "", id_nivel: "", id_seccion: "" }))}
                    options={almacenOptions}
                    placeholder="Selecciona almacen"
                />

                <Select
                    label="Rack"
                    value={form.id_rack}
                    onChange={(e) => setForm((p) => ({ ...p, id_rack: e.target.value, id_nivel: "", id_seccion: "" }))}
                    options={rackOptions}
                    placeholder="Selecciona rack"
                />


                <Select
                    label="Nivel"
                    value={form.id_nivel}
                    onChange={(e) => setForm((p) => ({ ...p, id_nivel: e.target.value, id_seccion: "" }))}
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
