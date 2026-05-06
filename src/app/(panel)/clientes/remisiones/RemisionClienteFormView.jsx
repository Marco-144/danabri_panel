"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader, Save, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageTitle from "@/components/ui/PageTitle";
import { getAuthToken, getAuthUserFromToken, isTokenExpired } from "@/services/auth";
import { getInventario } from "@/services/almacenesService";
import { getCotizacionClienteById, getCotizacionesClientes, searchPresentacionesCliente } from "@/services/cotizacionesClientesService";
import { createRemisionCliente, getRemisionClienteById, updateRemisionCliente } from "@/services/remisionesClientesService";

async function getAlmacenes() {
    const response = await fetch("/api/almacenes");
    if (!response.ok) throw new Error("No se pudo cargar almacenes");
    return response.json();
}

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fmtDate(value) {
    if (!value) return "-";
    return new Date(String(value).slice(0, 10)).toLocaleDateString("es-MX");
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

function round6(value) {
    return Math.round(Number(value || 0) * 1000000) / 1000000;
}

function formatPresentacionLabel(item) {
    if (!item) return "Sin presentacion";

    const nombreProducto = String(item.producto_nombre || item.nombre_producto || item.producto || "").trim();
    const nombrePresentacion = String(item.presentacion_nombre || item.nombre || item.descripcion || "").trim();
    const codigo = String(item.codigo_barras || item.codigo_ubicacion || item.codigo || "").trim();

    const principal = nombreProducto || nombrePresentacion || `Presentacion ${item.id_presentacion || ""}`;
    const secondary = nombreProducto && nombrePresentacion ? nombrePresentacion : codigo;

    if (secondary) {
        return `${principal} - ${secondary}`;
    }

    return principal;
}

function buildInventarioIndex(rows = []) {
    const index = new Map();

    for (const row of rows) {
        const idPresentacion = Number(row?.id_presentacion || 0);
        if (!Number.isInteger(idPresentacion) || idPresentacion <= 0) continue;

        const entry = {
            id_almacen: Number(row?.id_almacen || 0),
            almacen_nombre: String(row?.almacen_nombre || "").trim(),
            stock: Number(row?.stock || 0),
        };

        if (!index.has(idPresentacion)) {
            index.set(idPresentacion, []);
        }

        index.get(idPresentacion).push(entry);
    }

    return index;
}

function attachInventarioData(item, inventarioIndex) {
    const idPresentacion = Number(item?.id_presentacion || 0);
    const inventarioItem = inventarioIndex.get(idPresentacion) || [];
    const almacenesStock = Array.isArray(item?.almacenes_stock) && item.almacenes_stock.length ? item.almacenes_stock : inventarioItem;
    const stockTotal = almacenesStock.reduce((acc, entry) => acc + Number(entry?.stock || 0), 0);

    return {
        ...item,
        almacenes_stock: almacenesStock,
        stock_total: Number.isFinite(Number(item?.stock_total)) ? Number(item.stock_total) : stockTotal,
    };
}

function getLineaStockDisponible(line) {
    const almacenesStock = Array.isArray(line?.almacenes_stock) ? line.almacenes_stock : [];
    const idAlmacen = Number(line?.id_almacen || 0);

    if (idAlmacen > 0) {
        const matched = almacenesStock.find((entry) => Number(entry.id_almacen) === idAlmacen);
        if (matched) return Number(matched.stock || 0);
    }

    return Number(line?.stock_total || almacenesStock.reduce((acc, entry) => acc + Number(entry?.stock || 0), 0) || 0);
}

function buildPriceLevels(item) {
    const levelsSource = Array.isArray(item?.niveles_precio)
        ? item.niveles_precio
        : Array.isArray(item?.price_levels)
            ? item.price_levels
            : [];

    if (levelsSource.length) {
        return levelsSource
            .map((entry) => {
                const withTax = Number(entry?.priceWithTax ?? entry?.price_with_tax ?? entry?.price ?? 0);
                if (!Number.isFinite(withTax) || withTax <= 0) return null;

                return {
                    level: Number(entry.level || 1),
                    label: `Precio ${Number(entry.level || 1)}`,
                    priceWithTax: round6(withTax),
                    priceWithoutTax: round6(Number(entry?.priceWithoutTax ?? entry?.price_without_tax ?? (withTax / 1.16))),
                };
            })
            .filter(Boolean);
    }

    const withTax = Number(item?.manual_price || item?.precio || 0);
    if (!Number.isFinite(withTax) || withTax <= 0) return [];

    return [{
        level: 1,
        label: "Precio 1",
        priceWithTax: round6(withTax),
        priceWithoutTax: round6(Number(item?.manual_price_net ?? item?.precio_sin_iva ?? (withTax / 1.16))),
    }];
}

function resolveClienteNivelPrecio(cliente) {
    const nivel = Number(cliente?.nivel_precio || 0);
    return Number.isInteger(nivel) && nivel >= 1 && nivel <= 5 ? nivel : 1;
}

function resolveInitialPriceLevel(item, clienteNivelPrecio) {
    const levels = buildPriceLevels(item);
    const selectedLevel = levels.find((entry) => Number(entry.level) === Number(clienteNivelPrecio))
        || levels.find((entry) => Number(entry.level) === 1)
        || levels[0]
        || { level: 1, label: "Precio 1", priceWithTax: round6(item?.manual_price || item?.precio || 0), priceWithoutTax: round6(item?.manual_price_net || 0) };

    return { levels, selectedLevel };
}

function applyClientePriceLevelToLine(line, clienteNivelPrecio) {
    const levels = Array.isArray(line?.niveles_precio) ? line.niveles_precio : [];
    if (!levels.length) return line;

    const selectedLevel = levels.find((entry) => Number(entry.level) === Number(clienteNivelPrecio))
        || levels.find((entry) => Number(entry.level) === 1)
        || levels[0];

    if (!selectedLevel) return line;

    const precio = round6(selectedLevel.priceWithTax || 0);
    const cantidad = Number(line.cantidad || 0);

    return {
        ...line,
        nivel_precio: Number(selectedLevel.level || 1),
        precio,
        subtotal: round6(cantidad * precio),
    };
}

function mapCotizacionLineaToRemision(line, clienteNivelPrecio, index, defaultAlmacenId = null) {
    const { levels, selectedLevel } = resolveInitialPriceLevel(line, clienteNivelPrecio);
    const cantidad = Number(line.cantidad || 1);
    const precio = round6(selectedLevel.priceWithTax || line.precio || 0);
    const idPresentacion = Number(line.id_presentacion_default || line.id_presentacion);

    if (!idPresentacion) {
        throw new Error(`Producto "${line.producto_nombre}" sin presentación válida`);
    }

    return {
        uid: `${Date.now()}-${index}`,
        id_presentacion: idPresentacion,
        id_almacen: Number(defaultAlmacenId || 0),
        presentacion_nombre: line.presentacion_nombre_default || line.presentacion_nombre || "",
        producto_nombre: line.producto_nombre || "",
        cantidad,
        precio,
        subtotal: round6(cantidad * precio),
        nivel_precio: Number(selectedLevel.level || 1),
        niveles_precio: levels,
    };
}

function mapRemisionLinea(line, index) {
    const levels = buildPriceLevels(line);
    const cantidad = Number(line.cantidad || 1);
    const precio = Number(line.precio || 0);
    const selectedLevel = levels.find((entry) => Number(entry.level) === Number(line.nivel_precio)) || levels[0] || { level: 1 };

    return {
        uid: `${Date.now()}-${index}`,
        id_presentacion: Number(line.id_presentacion || 0),
        id_almacen: Number(line.id_almacen || 0),
        almacen_nombre: line.almacen_nombre || "",
        presentacion_nombre: line.presentacion_nombre || "",
        producto_nombre: line.producto_nombre || "",
        cantidad,
        precio,
        subtotal: Number(line.subtotal || cantidad * precio),
        nivel_precio: Number(selectedLevel.level || 1),
        niveles_precio: levels,
    };
}

export default function RemisionClienteFormView({ id, idCotizacion }) {
    const router = useRouter();
    const isEditing = Boolean(id);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadingCotizacion, setLoadingCotizacion] = useState(false);
    const [error, setError] = useState("");
    const [selectedOption, setSelectedOption] = useState(null);

    const [cotizacionQuery, setCotizacionQuery] = useState("");
    const [cotizacionOptions, setCotizacionOptions] = useState([]);
    const [selectedCotizacion, setSelectedCotizacion] = useState(null);

    const [presentacionQuery, setPresentacionQuery] = useState("");
    const [presentacionOptions, setPresentacionOptions] = useState([]);

    const [almacenes, setAlmacenes] = useState([]);
    const [inventarioRows, setInventarioRows] = useState([]);
    const almacenesRef = useRef([]);
    const inventarioRef = useRef([]);
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [lineas, setLineas] = useState([]);

    useEffect(() => {
        almacenesRef.current = almacenes;
    }, [almacenes]);

    useEffect(() => {
        inventarioRef.current = inventarioRows;
    }, [inventarioRows]);

    useEffect(() => {
        if (isEditing) return;

        const query = String(cotizacionQuery || "").trim();

        const timeoutId = setTimeout(async () => {
            try {
                const rows = await getCotizacionesClientes({ search: query });
                setCotizacionOptions(Array.isArray(rows) ? rows : []);
            } catch {
                setCotizacionOptions([]);
            }
        }, 220);

        return () => clearTimeout(timeoutId);
    }, [cotizacionQuery, isEditing]);

    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            try {
                const rows = await searchPresentacionesCliente(presentacionQuery, 20);
                setPresentacionOptions(Array.isArray(rows) ? rows : []);
            } catch {
                setPresentacionOptions([]);
            }
        }, 220);

        return () => clearTimeout(timeoutId);
    }, [presentacionQuery]);

    const loadCotizacion = useCallback(async (cotizacionId) => {
        setLoadingCotizacion(true);
        try {
            const data = await getCotizacionClienteById(cotizacionId);
            const clienteNivelPrecio = resolveClienteNivelPrecio(data);

            setSelectedCotizacion({
                id_cotizacion: data.id_cotizacion,
                folio: data.folio,
                total: Number(data.total || 0),
                fecha_emision: data.fecha_emision,
                estado: data.estado,
            });
            setSelectedOption({
                value: data.id_cotizacion,
                label: `${data.folio} - ${data.cliente_nombre}`,
            });
            setSelectedCliente({
                id_cliente: data.id_cliente,
                nombre: data.cliente_nombre,
                rfc: data.cliente_rfc,
                nivel_precio: clienteNivelPrecio,
                tipo_cliente: data.tipo_cliente || "",
            });
            setCotizacionQuery(data.folio || "");
            setCotizacionOptions([]);
            const almacenesActuales = almacenesRef.current;
            const defaultAlmacen = almacenesActuales.length > 0 ? almacenesActuales[0].id_almacen : null;
            const inventarioIndex = buildInventarioIndex(inventarioRef.current);
            setLineas((data.detalles || []).map((line, index) => attachInventarioData(mapCotizacionLineaToRemision(line, clienteNivelPrecio, index, defaultAlmacen), inventarioIndex)));
            setError("");
        } catch (e) {
            setError(e.message || "No se pudo cargar la cotizacion");
            throw e;
        } finally {
            setLoadingCotizacion(false);
        }
    }, []);

    useEffect(() => {
        async function init() {
            try {
                setLoading(true);

                const almacenesData = await getAlmacenes();
                setAlmacenes(Array.isArray(almacenesData) ? almacenesData : []);

                // Cargar inventario para todos los almacenes
                let inventarioData = [];
                for (const almacen of almacenesData) {
                    try {
                        const almacenInventario = await getInventario({ id_almacen: almacen.id_almacen });
                        inventarioData = inventarioData.concat(almacenInventario || []);
                    } catch {
                        // Ignorar errores al cargar inventario de almacenes individuales
                    }
                }
                setInventarioRows(inventarioData);

                if (isEditing) {
                    const data = await getRemisionClienteById(id);
                    setSelectedCotizacion(null);
                    setSelectedOption(null);
                    setCotizacionQuery("");
                    setSelectedCliente({
                        id_cliente: data.id_cliente,
                        nombre: data.cliente_nombre,
                        rfc: data.cliente_rfc,
                        nivel_precio: data.cliente_nivel_precio || 1,
                        tipo_cliente: data.cliente_tipo_cliente || "",
                    });
                    const inventarioIndex = buildInventarioIndex(inventarioData);
                    setLineas((data.detalles || []).map((line, index) => attachInventarioData(mapRemisionLinea(line, index), inventarioIndex)));
                    setError("");
                    return;
                }

                if (idCotizacion) {
                    await loadCotizacion(idCotizacion);
                    return;
                }

                setError("");
            } catch (e) {
                setError(e.message || "No se pudo inicializar la remision");
            } finally {
                setLoading(false);
            }
        }

        init();
    }, [id, idCotizacion, isEditing, loadCotizacion]);

    useEffect(() => {
        if (!selectedCliente?.nivel_precio) return;
        const clienteNivelPrecio = resolveClienteNivelPrecio(selectedCliente);
        setLineas((prev) => prev.map((line) => applyClientePriceLevelToLine(line, clienteNivelPrecio)));
    }, [selectedCliente]);

    const total = useMemo(() => lineas.reduce((acc, line) => acc + Number(line.subtotal || 0), 0), [lineas]);
    const canEditPartidas = isEditing || Boolean(selectedCotizacion);
    const referenciaCotizacion = selectedCotizacion?.folio || "";

    function clearCotizacionSelection() {
        setSelectedCotizacion(null);
        setSelectedCliente(null);
        setCotizacionQuery("");
        setSelectedOption(null);
        setCotizacionOptions([]);
        setLineas([]);
    }

    function addLineaFromPresentacion(item) {
        const clienteNivelPrecio = resolveClienteNivelPrecio(selectedCliente);
        const { levels, selectedLevel } = resolveInitialPriceLevel(item, clienteNivelPrecio);
        const price = Number(selectedLevel.priceWithTax || item.manual_price || 0);
        const defaultAlmacen = almacenes.length > 0 ? almacenes[0] : null;
        const presentacionNombre = String(item.presentacion_nombre || item.nombre || item.descripcion || "").trim();
        const productoNombre = String(item.producto_nombre || item.nombre_producto || item.producto || "").trim();

        const inventarioIndex = buildInventarioIndex(inventarioRef.current);
        const newLine = {
            uid: `${Date.now()}-${Math.random()}`,
            id_presentacion: Number(item.id_presentacion),
            id_almacen: defaultAlmacen ? Number(defaultAlmacen.id_almacen) : 0,
            almacen_nombre: defaultAlmacen ? defaultAlmacen.nombre : "",
            presentacion_nombre: presentacionNombre,
            producto_nombre: productoNombre,
            cantidad: 1,
            precio: price,
            subtotal: price,
            nivel_precio: Number(selectedLevel.level || 1),
            niveles_precio: levels,
        };

        setLineas((prev) => ([
            ...prev,
            attachInventarioData(newLine, inventarioIndex),
        ]));
    }

    function updateLinea(uid, patch) {
        setLineas((prev) => prev.map((line) => {
            if (line.uid !== uid) return line;

            const next = { ...line, ...patch };

            if (Object.prototype.hasOwnProperty.call(patch, "nivel_precio")) {
                const selectedLevel = (line.niveles_precio || []).find((entry) => Number(entry.level) === Number(patch.nivel_precio));
                if (selectedLevel) {
                    next.precio = Number(selectedLevel.priceWithTax || 0);
                    next.nivel_precio = Number(selectedLevel.level || patch.nivel_precio || 1);
                }
            }

            next.cantidad = Number(next.cantidad || 0);
            next.precio = Number(next.precio || 0);
            next.subtotal = Number(next.cantidad) * Number(next.precio);
            return next;
        }));
    }

    function removeLinea(uid) {
        setLineas((prev) => prev.filter((line) => line.uid !== uid));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const token = getAuthToken();
        if (!token || isTokenExpired(token)) {
            setError("Sesion expirada. Inicia sesion nuevamente");
            return;
        }

        const user = getAuthUserFromToken(token);
        const idUsuario = user?.id_usuario || user?.id;

        if (!idUsuario) {
            setError("No se pudo identificar al usuario autenticado");
            return;
        }

        if (!isEditing && !selectedCotizacion?.id_cotizacion) {
            setError("Selecciona una cotizacion base");
            return;
        }

        if (!selectedCliente?.id_cliente) {
            setError("Selecciona una cotizacion o cliente valido");
            return;
        }

        if (!lineas.length) {
            setError("La remision debe tener al menos una partida");
            return;
        }

        for (const [index, line] of lineas.entries()) {
            if (!line.id_presentacion || line.id_presentacion <= 0) {
                setError(`La partida ${index + 1} no tiene presentación válida`);
                return;
            }
        }

        const payload = {
            id_cliente: Number(selectedCliente.id_cliente),
            id_usuario: Number(idUsuario),
            detalles: lineas.map((line) => ({
                id_presentacion: Number(line.id_presentacion),
                id_almacen: Number(line.id_almacen),
                cantidad: Number(line.cantidad),
                precio: Number(line.precio),
            })),
        };

        try {
            setSaving(true);
            setError("");

            if (isEditing) {
                await updateRemisionCliente(id, payload);
            } else {
                await createRemisionCliente(payload);
            }

            router.push("/clientes/remisiones");
            router.refresh();
        } catch (e) {
            setError(e.message || "No se pudo guardar la remision");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="h-64 flex items-center justify-center"><Loader className="animate-spin text-primary" /></div>;
    }

    return (
        <div>
            <PageTitle
                title={isEditing ? "Editar Remision Cliente" : "Nueva Remision Cliente"}
                subtitle={isEditing ? "Edita la remision existente" : "Captura los productos y ajusta los detalles finales"}
                actions={(
                    <Link href="/clientes/remisiones">
                        <Button variant="outline" className="gap-2"><ChevronLeft size={16} />Volver</Button>
                    </Link>
                )}
            />

            <form className="space-y-5 mt-6 xl:pr-[360px]" onSubmit={handleSubmit}>

                {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

                <div className="space-y-5 min-w-0">
                    {!isEditing ? (
                        <div className="bg-white border border-border rounded-2xl shadow-card p-5 space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-semibold text-primary">Datos de Remision</h2>
                                    <p className="text-xs text-muted mt-1">Elige una cotizacion base y ajusta sus partidas antes de guardar.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Fecha remision *" type="date" value={today()} disabled />
                                <Input label="Referencia cotizacion" value={referenciaCotizacion || "Sin cotizacion base"} disabled />
                            </div>

                            <div className="relative">
                                <label className="text-sm text-muted block mb-1">Cotizacion base *</label>
                                <Select
                                    value={selectedOption}
                                    onChange={(option) => {
                                        setSelectedOption(option || null);
                                        if (!option?.value) {
                                            clearCotizacionSelection();
                                            return;
                                        }
                                        loadCotizacion(option.value).catch(() => { });
                                    }}
                                    onInputChange={(value) => setCotizacionQuery(value)}
                                    options={cotizacionOptions.map((item) => ({
                                        value: item.id_cotizacion,
                                        label: `${item.folio} - ${item.cliente_nombre}`
                                    }))}
                                    isSearchable={true}
                                    isClearable={true}
                                    placeholder="Selecciona una cotizacion"
                                />
                            </div>

                            {/* {selectedCotizacion ? (
                                <div className="text-sm rounded-lg border border-border p-3 bg-background/30 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                    <div>
                                        <p className="text-xs text-muted">Cotizacion seleccionada</p>
                                        <p className="font-medium text-primary">{selectedCotizacion.folio}</p>
                                        <p className="text-xs text-muted">{selectedCliente?.nombre || "-"} | {selectedCliente?.rfc || "Sin RFC"}</p>
                                        <p className="text-xs text-muted">Emitida: {fmtDate(selectedCotizacion.fecha_emision)} | Estado: {selectedCotizacion.estado || "pendiente"}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm rounded-lg border border-dashed border-border p-3 bg-background/20 text-muted">
                                    Escribe el folio de la cotizacion para cargar sus productos y poder editar cantidades o precios antes de crear la remision.
                                </div>
                            )} */}

                            {loadingCotizacion ? <div className="text-xs text-muted">Cargando cotizacion...</div> : null}
                        </div>
                    ) : (
                        <div className="bg-white border border-border rounded-2xl shadow-card p-5 space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-semibold text-primary">Datos de Remision</h2>
                                    <p className="text-xs text-muted mt-1">Edición de remisión existente.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Fecha remision *" type="date" value={today()} disabled />
                                <Input label="Referencia cotizacion" value={selectedCotizacion?.folio || "Sin cotizacion base"} disabled />
                            </div>
                        </div>
                    )}

                    <div className="bg-white border border-border rounded-2xl shadow-card p-5 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-semibold text-primary">Información del Cliente</h2>
                                <p className="text-xs text-muted mt-1">Datos tomados desde la cotización seleccionada.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Cliente" value={selectedCliente?.nombre || "-"} disabled />
                            <Input label="RFC" value={selectedCliente?.rfc || "-"} disabled />
                        </div>
                    </div>

                    {canEditPartidas ? (
                        <div className="bg-white border border-border rounded-2xl shadow-card p-5 space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-semibold text-primary">Productos</h2>
                                    <p className="text-xs text-muted mt-1">Edita cantidades, precios y niveles antes de efectuar la remisión.</p>
                                </div>
                            </div>

                            <div className="relative">
                                <label className="text-sm text-muted block mb-1 ml-1">Buscar producto</label>
                                <Select
                                    inputValue={presentacionQuery}
                                    onInputChange={setPresentacionQuery}
                                    options={presentacionOptions.map((item) => ({
                                        value: item.id_presentacion,
                                        label: formatPresentacionLabel(item),
                                        data: item,
                                    }))}
                                    onChange={(option) => {
                                        if (option?.data) {
                                            addLineaFromPresentacion(option.data);
                                        }
                                    }}
                                    isSearchable={true}
                                    isClearable={true}
                                    placeholder=" "
                                />
                            </div>

                            <div className="overflow-x-auto rounded-tl-xl rounded-tr-xl">
                                <table className="w-full min-w-[900px] text-sm">
                                    <thead className="bg-primary text-white">
                                        <tr>
                                            <th className="text-left p-3">Producto</th>
                                            <th className="text-left p-3">Presentacion</th>
                                            <th className="text-center p-3">Almacén</th>
                                            <th className="text-center p-3">Stock</th>
                                            <th className="text-center p-3">Nivel</th>
                                            <th className="text-center p-3">Cantidad</th>
                                            <th className="text-center p-3">Precio</th>
                                            <th className="text-right p-3">Subtotal</th>
                                            <th className="text-center p-3">Accion</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lineas.length === 0 ? (
                                            <tr><td colSpan={9} className="p-6 text-center text-muted">Sin productos</td></tr>
                                        ) : lineas.map((line) => (
                                            <tr key={line.uid} className="border-t border-border">
                                                <td className="p-3">{line.producto_nombre}</td>
                                                <td className="p-3">{line.presentacion_nombre}</td>
                                                <td className="p-3 w-[150px]">
                                                    <select
                                                        className="w-full rounded-lg border border-border px-2 py-1 text-sm"
                                                        value={line.id_almacen || 0}
                                                        onChange={(e) => {
                                                            const selectedAlmacen = almacenes.find((a) => a.id_almacen === Number(e.target.value));
                                                            updateLinea(line.uid, {
                                                                id_almacen: Number(e.target.value),
                                                                almacen_nombre: selectedAlmacen?.nombre || "",
                                                            });
                                                        }}
                                                    >
                                                        <option value={0}>- Selecciona -</option>
                                                        {almacenes.map((almacen) => (
                                                            <option key={almacen.id_almacen} value={almacen.id_almacen}>{almacen.nombre}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-3 text-center">
                                                    {line.almacenes_stock && Array.isArray(line.almacenes_stock)
                                                        ? (line.almacenes_stock.find((a) => Number(a.id_almacen) === Number(line.id_almacen))?.stock || "-")
                                                        : "-"
                                                    }
                                                </td>
                                                <td className="p-3 w-[120px]">
                                                    <select
                                                        className="w-full rounded-lg border border-border px-2 py-1 text-sm"
                                                        value={line.nivel_precio || 1}
                                                        onChange={(e) => updateLinea(line.uid, { nivel_precio: Number(e.target.value) })}
                                                    >
                                                        {(line.niveles_precio || []).map((nivel) => (
                                                            <option key={nivel.level} value={nivel.level}>{nivel.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className="w-24 rounded-lg border border-border px-2 py-1 text-right"
                                                        value={line.cantidad}
                                                        onChange={(e) => updateLinea(line.uid, { cantidad: Number(e.target.value) })}
                                                    />
                                                </td>
                                                <td className="p-3 text-right">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        className="w-28 rounded-lg border border-border px-2 py-1 text-right"
                                                        value={line.precio}
                                                        onChange={(e) => updateLinea(line.uid, { precio: Number(e.target.value) })}
                                                    />
                                                </td>
                                                <td className="p-3 text-right font-semibold text-primary">{fmtMoney(line.subtotal)}</td>
                                                <td className="p-3 text-center">
                                                    <Button type="button" variant="lightghost" className="p-1.5 h-auto text-red-600" onClick={() => removeLinea(line.uid)}>
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : null}

                    {!canEditPartidas ? (
                        <div className="bg-white border border-dashed border-border rounded-2xl shadow-card p-6 text-sm text-muted">
                            Selecciona una cotizacion para cargar sus productos y poder editarla antes de crear la remision.
                        </div>
                    ) : null}

                    <div className="xl:hidden bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
                        <h3 className="text-base font-semibold text-primary">Resumen</h3>
                        <div className="flex justify-between text-sm text-muted">
                            <span>Total remision</span>
                            <span className="font-semibold text-primary">{fmtMoney(total)}</span>
                        </div>

                        <div className="pt-2 space-y-2">
                            <Button type="submit" className="w-full gap-2" disabled={saving || (!canEditPartidas && !isEditing)}>
                                <Save size={16} /> {saving ? "Guardando..." : "Guardar Remision"}
                            </Button>
                            <Link href="/clientes/remisiones">
                                <Button type="button" variant="outline" className="w-full">Cancelar</Button>
                            </Link>
                        </div>
                    </div>
                </div>

                <aside className="mt-6 hidden xl:block fixed right-6 top-20 w-[340px] z-20 bg-primary rounded-xl shadow-card">
                    <h3 className="rounded-lg p-4 text-base font-semibold text-white">Resumen</h3>

                    <div className="bg-white rounded-b-xl border border-border shadow-card p-5 space-y-3 h-[480px]">
                        <div className="pl-2 flex justify-between items-end text-md text-muted mb-4">
                            <span>Total remision</span>
                            <span className="font-semibold text-primary text-lg">{fmtMoney(total)}</span>
                        </div>

                        <hr className="border-border mb-4" />

                        <div className="pl-2 text-sm text-muted space-y-2 mb-4">
                            <div className="flex justify-between gap-4"><span>Cotización</span><span className="font-medium text-primary text-right">{selectedCotizacion?.folio || "-"}</span></div>
                            <div className="flex justify-between gap-4"><span>Cliente</span><span className="font-medium text-primary text-right">{selectedCliente?.nombre || "-"}</span></div>
                            <div className="flex justify-between gap-4"><span>RFC</span><span className="font-medium text-primary text-right">{selectedCliente?.rfc || "-"}</span></div>
                            <div className="flex justify-between gap-4"><span>Productos</span><span className="font-medium text-primary text-right">{lineas.length || 0}</span></div>
                            {selectedCotizacion ? (
                                <div className="space-y-2">
                                    <div className="flex justify-between gap-4">
                                        <span>Emitida: </span>
                                        <span className="font-medium text-primary text-right">{fmtDate(selectedCotizacion.fecha_emision)}</span>
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <span>Estado: </span>
                                        <span className="font-medium text-primary text-right">{selectedCotizacion.estado || "pendiente"}</span>
                                    </div>
                                </div>
                            ) : (
                                <div></div>
                            )}
                        </div>

                        <hr className="border-border mb-6" />

                        <div className="pt-2 space-y-2">
                            <Button type="submit" variant="accent" className="w-full h-[50px] gap-2" disabled={saving || (!canEditPartidas && !isEditing)}>
                                <Save size={20} />
                                <p className="text-lg">{saving ? "Guardando..." : "Guardar Remision"}</p>
                            </Button>

                            <Link href="/clientes/remisiones">
                                <Button type="button" className="w-full bg-slate-100 hover:bg-slate-200">
                                    <p className="text-primary text-lg">Cancelar</p>
                                </Button>
                            </Link>
                        </div>

                        <hr className="border-border mt-6" />

                        <p className="text-xs text-center text-muted">Los cambios quedarán listos para revisar antes de facturar.</p>
                    </div>
                </aside>
            </form>
        </div>
    );
}
