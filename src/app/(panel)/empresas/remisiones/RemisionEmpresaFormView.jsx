"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader, Save, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageTitle from "@/components/ui/PageTitle";
import { getAuthToken, getAuthUserFromToken, isTokenExpired } from "@/services/auth";
import { getInventario } from "@/services/almacenesService";
import {
    createRemisionEmpresa,
    getRemisionEmpresaById,
    updateRemisionEmpresa,
} from "@/services/remisionesEmpresasService";
import { getCotizacionEmpresaById } from "@/services/cotizacionesEmpresasService";

async function getAlmacenes() {
    const response = await fetch("/api/almacenes");
    if (!response.ok) throw new Error("No se pudo cargar almacenes");
    return response.json();
}

async function getCotizacionesEmpresas(params = {}) {
    const url = new URL("/api/cotizaciones-empresas", typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
    Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, String(value));
    });
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error("No se pudo cargar cotizaciones");
    return res.json();
}

async function searchPresentacionesEmpresa(query = "", limit = 20) {
    const url = new URL("/api/presentaciones", typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
    url.searchParams.set("search", String(query || ""));
    url.searchParams.set("limit", String(limit));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error("No se pudo buscar presentaciones");
    return res.json();
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

function formatCotizacionFolio(cotizacion) {
    if (!cotizacion) return "";

    const rawFolio = String(cotizacion.folio || cotizacion.folio_cotizacion || cotizacion.folio_cotizacion_empresa || "").trim();
    if (rawFolio) return rawFolio;

    const id = Number(cotizacion.id_cotizacion_empresa || 0);
    if (Number.isInteger(id) && id > 0) {
        return `COT-E-${String(id).padStart(6, "0")}`;
    }

    return "Sin folio";
}

function formatPresentacionLabel(item) {
    if (!item) return "Sin presentacion";

    const nombrePresentacion = String(item.presentacion_nombre || item.nombre || item.descripcion || "").trim();
    const nombreProducto = String(item.producto_nombre || item.producto || "").trim();
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

function mapCotizacionDetalleToRemision(detalle, index, defaultAlmacenId = null) {
    const cantidad = Number(detalle.cantidad || 1);
    const precioSinIva = Number(detalle.precio_sin_iva || 0);
    const precioCon = Number(detalle.precio_con_iva || 0);

    return {
        uid: `${Date.now()}-${index}`,
        id_presentacion: Number(detalle.id_presentacion || 0),
        id_almacen: Number(defaultAlmacenId || 0),
        presentacion_nombre: detalle.presentacion_nombre || detalle.nombre || "",
        producto_nombre: detalle.producto_nombre || detalle.nombre_producto || detalle.descripcion || detalle.nombre || "",
        cantidad,
        precio_sin_iva: precioSinIva,
        precio_con_iva: precioCon,
        subtotal_sin_iva: round6(cantidad * precioSinIva),
        subtotal_con_iva: round6(cantidad * precioCon),
        unidad: String(detalle.unidad || "pieza").toLowerCase(),
        requerimiento: detalle.requerimiento || "",
    };
}

function mapRemisionLineaEmpresa(line, index) {
    const cantidad = Number(line.cantidad || 1);
    const precioSinIva = Number(line.precio_sin_iva || 0);
    const precioCon = Number(line.precio_con_iva || 0);

    return {
        uid: `${Date.now()}-${index}`,
        id_presentacion: Number(line.id_presentacion || 0),
        id_almacen: Number(line.id_almacen || 0),
        almacen_nombre: line.almacen_nombre || "",
        presentacion_nombre: line.presentacion_nombre || "",
        producto_nombre: line.producto_nombre || line.descripcion || "",
        cantidad,
        precio_sin_iva: precioSinIva,
        precio_con_iva: precioCon,
        subtotal_sin_iva: round6(cantidad * precioSinIva),
        subtotal_con_iva: round6(cantidad * precioCon),
        unidad: String(line.unidad || "pieza").toLowerCase(),
        requerimiento: line.requerimiento || "",
    };
}

export default function RemisionEmpresaFormView({ id, idCotizacionEmpresa }) {
    const router = useRouter();
    const isEditing = Boolean(id);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [idEmpresa, setIdEmpresa] = useState("");
    const [empresaNombre, setEmpresaNombre] = useState("");
    const [empresaRfc, setEmpresaRfc] = useState("");

    const [cotizacionQuery, setCotizacionQuery] = useState("");
    const [cotizacionOptions, setCotizacionOptions] = useState([]);
    const [selectedCotizacion, setSelectedCotizacion] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);
    const [loadingCotizacion, setLoadingCotizacion] = useState(false);

    const [presentacionQuery, setPresentacionQuery] = useState("");
    const [presentacionOptions, setPresentacionOptions] = useState([]);
    const [almacenes, setAlmacenes] = useState([]);
    const [inventarioRows, setInventarioRows] = useState([]);
    const almacenesRef = useRef([]);
    const inventarioRef = useRef([]);
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
                const rows = await getCotizacionesEmpresas({ search: query });
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
                const rows = await searchPresentacionesEmpresa(presentacionQuery, 20);
                setPresentacionOptions(Array.isArray(rows) ? rows : []);
            } catch {
                setPresentacionOptions([]);
            }
        }, 220);

        return () => clearTimeout(timeoutId);
    }, [presentacionQuery]);

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
                    const data = await getRemisionEmpresaById(id);
                    setIdEmpresa(String(data.id_empresa));
                    setEmpresaNombre(data.empresa_nombre_fiscal || data.empresa_nombre || "");
                    setEmpresaRfc(data.empresa_rfc || "");
                    const inventarioIndex = buildInventarioIndex(inventarioData);
                    setLineas((data.detalles || []).map((line, index) => attachInventarioData(mapRemisionLineaEmpresa(line, index), inventarioIndex)));
                    setError("");
                    return;
                }

                if (idCotizacionEmpresa) {
                    const cot = await getCotizacionEmpresaById(idCotizacionEmpresa);
                    setIdEmpresa(String(cot.id_empresa || ""));
                    setEmpresaNombre(cot.empresa_nombre_fiscal || cot.empresa_nombre || "");
                    setEmpresaRfc(cot.empresa_rfc || "");
                    const defaultAlmacen = almacenesData && almacenesData.length > 0 ? almacenesData[0].id_almacen : null;
                    const inventarioIndex = buildInventarioIndex(inventarioData);
                    setLineas((cot.detalles || []).map((line, index) => attachInventarioData(mapCotizacionDetalleToRemision(line, index, defaultAlmacen), inventarioIndex)));
                }

                setError("");
            } catch (e) {
                setError(e.message || "No se pudo inicializar la remision");
            } finally {
                setLoading(false);
            }
        }

        init();
    }, [isEditing, id, idCotizacionEmpresa]);

    async function loadCotizacion(cotizacionId) {
        setLoadingCotizacion(true);
        try {
            const data = await getCotizacionEmpresaById(cotizacionId);
            const folio = formatCotizacionFolio(data);
            setSelectedCotizacion({
                id_cotizacion_empresa: data.id_cotizacion_empresa,
                folio,
                total: Number(data.total || 0),
                fecha_emision: data.fecha_emision,
                estado: data.estado,
            });
            setSelectedOption({
                value: data.id_cotizacion_empresa,
                label: `${folio} - ${data.empresa_nombre}`,
            });
            setIdEmpresa(String(data.id_empresa || ""));
            setEmpresaNombre(data.empresa_nombre_fiscal || data.empresa_nombre || "");
            setEmpresaRfc(data.empresa_rfc || "");
            setCotizacionQuery(folio);
            setCotizacionOptions([]);
            const almacenesActuales = almacenesRef.current;
            const defaultAlmacen = almacenesActuales.length > 0 ? almacenesActuales[0].id_almacen : null;
            const inventarioIndex = buildInventarioIndex(inventarioRef.current);
            setLineas((data.detalles || []).map((line, index) => attachInventarioData(mapCotizacionDetalleToRemision(line, index, defaultAlmacen), inventarioIndex)));
            setError("");
        } catch (e) {
            setError(e.message || "No se pudo cargar la cotizacion");
            throw e;
        } finally {
            setLoadingCotizacion(false);
        }
    }

    function clearCotizacionSelection() {
        setSelectedCotizacion(null);
        setSelectedOption(null);
        setCotizacionQuery("");
        setCotizacionOptions([]);
        setLineas([]);
        setIdEmpresa("");
        setEmpresaNombre("");
        setEmpresaRfc("");
    }

    const totalSinIva = useMemo(() => lineas.reduce((acc, line) => acc + Number(line.subtotal_sin_iva || 0), 0), [lineas]);
    const totalConIva = useMemo(() => lineas.reduce((acc, line) => acc + Number(line.subtotal_con_iva || 0), 0), [lineas]);
    const canEditPartidas = isEditing || Boolean(selectedCotizacion);
    const referenciaCotizacion = selectedCotizacion?.folio || "";

    function addLineaFromPresentacion(item) {
        const defaultAlmacen = almacenes.length > 0 ? almacenes[0] : null;
        const presentacionNombre = String(item.presentacion_nombre || item.nombre || item.descripcion || "").trim();
        const productoNombre = String(item.producto_nombre || item.nombre_producto || item.nombre || "").trim();

        const inventarioIndex = buildInventarioIndex(inventarioRef.current);
        const newLine = {
            uid: `${Date.now()}-${Math.random()}`,
            id_presentacion: Number(item.id_presentacion),
            id_almacen: defaultAlmacen ? Number(defaultAlmacen.id_almacen) : 0,
            almacen_nombre: defaultAlmacen ? defaultAlmacen.nombre : "",
            presentacion_nombre: presentacionNombre,
            producto_nombre: productoNombre,
            cantidad: 1,
            precio_sin_iva: Number(item.manual_price_net ?? item.precio_sin_iva ?? item.costo ?? 0),
            precio_con_iva: Number(item.manual_price ?? item.precio_con_iva ?? item.precio ?? 0),
            subtotal_sin_iva: Number(item.manual_price_net ?? item.precio_sin_iva ?? item.costo ?? 0),
            subtotal_con_iva: Number(item.manual_price ?? item.precio_con_iva ?? item.precio ?? 0),
            unidad: "pieza",
            requerimiento: "",
        };

        setLineas((prev) => ([
            ...prev,
            attachInventarioData(newLine, inventarioIndex),
        ]));
        setPresentacionQuery("");
        setPresentacionOptions([]);
    }

    function updateLinea(uid, patch) {
        setLineas((prev) => prev.map((line) => {
            if (line.uid !== uid) return line;

            const next = { ...line, ...patch };

            next.cantidad = Number(next.cantidad || 0);
            next.precio_sin_iva = Number(next.precio_sin_iva || 0);
            next.precio_con_iva = Number(next.precio_con_iva || 0);
            next.subtotal_sin_iva = round6(Number(next.cantidad) * Number(next.precio_sin_iva));
            next.subtotal_con_iva = round6(Number(next.cantidad) * Number(next.precio_con_iva));
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

        const authUser = getAuthUserFromToken(token);
        const idUsuario = authUser?.id_usuario || authUser?.id;

        if (!idUsuario) {
            setError("No se pudo identificar al usuario autenticado");
            return;
        }

        if (!idEmpresa) {
            setError("Falta empresa para guardar remision");
            return;
        }

        if (!lineas.length) {
            setError("La remision debe tener al menos una partida");
            return;
        }

        const payload = {
            id_cotizacion_empresa: idCotizacionEmpresa || undefined,
            id_empresa: Number(idEmpresa),
            id_usuario: Number(idUsuario),
            fecha_remision: new Date().toISOString().slice(0, 10),
            observaciones: "",
            detalles: lineas.map((line) => ({
                id_presentacion: Number(line.id_presentacion),
                id_almacen: Number(line.id_almacen),
                descripcion: String(line.producto_nombre || line.presentacion_nombre || "").trim(),
                requerimiento: String(line.requerimiento || "").trim(),
                cantidad_sistema: Number(line.cantidad || 1),
                cantidad_factura: Number(line.cantidad || 1),
                unidad: String(line.unidad || "pieza"),
                precio_sin_iva: Number(line.precio_sin_iva || 0),
                precio_con_iva: Number(line.precio_con_iva || 0),
            })),
        };

        try {
            setSaving(true);
            setError("");

            if (isEditing) {
                await updateRemisionEmpresa(id, payload);
            } else {
                await createRemisionEmpresa(payload);
            }

            router.push("/empresas/remisiones");
            router.refresh();
        } catch (e) {
            setError(e.message || "No se pudo guardar la remision");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <Loader className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div>
            <PageTitle
                title={isEditing ? "Editar Remision de Empresa" : "Nueva Remision de Empresa"}
                subtitle={isEditing ? "Edita la remision existente" : "Captura los productos y ajusta los detalles finales"}
                actions={(
                    <Link href="/empresas/remisiones">
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
                                        value: item.id_cotizacion_empresa,
                                        label: `${formatCotizacionFolio(item)} - ${item.empresa_nombre}`,
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
                                        <p className="text-xs text-muted">{empresaNombre || "-"} | {empresaRfc || "Sin RFC"}</p>
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
                                    <p className="text-xs text-muted mt-1">Edicion de remision existente.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Fecha remision *" type="date" value={today()} readOnly />
                                <Input label="Referencia cotizacion" value={selectedCotizacion?.folio || "Sin cotizacion base"} readOnly />
                            </div>
                        </div>
                    )}

                    <div className="bg-white border border-border rounded-2xl shadow-card p-5 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-semibold text-primary">Información de la Empresa</h2>
                                <p className="text-xs text-muted mt-1">Datos tomados desde la cotización seleccionada.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Empresa" value={empresaNombre || "-"} disabled />
                            <Input label="RFC" value={empresaRfc || "-"} disabled />
                        </div>
                    </div>

                    {canEditPartidas ? (
                        <div className="bg-white border border-border rounded-2xl shadow-card p-5 space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-semibold text-primary">Productos</h2>
                                    <p className="text-xs text-muted mt-1">Edita cantidades, precios y tipos de presentación antes de efectuar la remisión.</p>
                                </div>
                            </div>

                            <div className="relative">
                                <label className="text-sm text-muted block mb-1 ml-1-"> Buscar producto</label>
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
                                            {/* <th className="text-left p-3">Producto</th> */}
                                            <th className="text-left p-3">Presentacion</th>
                                            <th className="text-center p-3">Almacén</th>
                                            <th className="text-right p-3">Stock disponible</th>
                                            <th className="text-right p-3">Cantidad</th>
                                            <th className="text-left p-3">Unidad</th>
                                            <th className="text-right p-3">Precio Unitario s/IVA</th>
                                            <th className="text-right p-3">Total s/IVA</th>
                                            <th className="text-center p-3">Accion</th>
                                        </tr>
                                    </thead>
                                    <tbody >
                                        {lineas.length === 0 ? (
                                            <tr><td colSpan={10} className="p-6 text-center text-muted">Sin productos</td></tr>
                                        ) : lineas.map((line) => (
                                            <tr key={line.uid} className="border-t border-border">
                                                {/* <td className="p-3">{line.producto_nombre}</td> */}
                                                <td className="p-3">{line.presentacion_nombre}</td>
                                                <td className="p-3 w-[160px]">
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
                                                <td className="p-3 text-right">
                                                    {line.almacenes_stock && Array.isArray(line.almacenes_stock)
                                                        ? (line.almacenes_stock.find((a) => Number(a.id_almacen) === Number(line.id_almacen))?.stock || "-")
                                                        : "-"
                                                    }
                                                </td>
                                                <td className="p-3 text-right">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className="w-20 rounded-lg border border-border px-2 py-1 text-right text-sm"
                                                        value={line.cantidad}
                                                        onChange={(e) => updateLinea(line.uid, { cantidad: Number(e.target.value) })}
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <select
                                                        className="w-full rounded-lg border border-border px-2 py-1 text-sm"
                                                        value={line.unidad || "pieza"}
                                                        onChange={(e) => updateLinea(line.uid, { unidad: e.target.value })}
                                                    >
                                                        <option value="pieza">Pieza</option>
                                                        <option value="paquete">Paquete</option>
                                                        <option value="caja">Caja</option>
                                                    </select>
                                                </td>
                                                <td className="p-3 text-right">{fmtMoney(line.precio_sin_iva)}</td>
                                                <td className="p-3 text-right font-semibold text-primary">{fmtMoney(line.subtotal_sin_iva || (line.precio_sin_iva * line.cantidad))}</td>
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
                            <span>Total s/IVA</span>
                            <span className="font-semibold text-primary">{fmtMoney(totalSinIva)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted">
                            <span>Total c/IVA</span>
                            <span className="font-semibold text-primary">{fmtMoney(totalConIva)}</span>
                        </div>

                        <div className="pt-2 space-y-2">
                            <Button type="submit" className="w-full gap-2" disabled={saving || !lineas.length}>
                                <Save size={16} /> {saving ? "Guardando..." : "Guardar Remision"}
                            </Button>
                            <Link href="/empresas/remisiones">
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
                            <span className="font-semibold text-primary text-lg">{fmtMoney(totalConIva)}</span>
                        </div>

                        <hr className="border-border mb-4" />

                        <div className="pl-2 text-sm text-muted space-y-2 mb-4">
                            <div className="flex justify-between gap-4"><span>Cotización</span><span className="font-medium text-primary text-right">{referenciaCotizacion || "-"}</span></div>
                            <div className="flex justify-between gap-4"><span>Empresa</span><span className="font-medium text-primary text-right">{empresaNombre || "-"}</span></div>
                            <div className="flex justify-between gap-4"><span>RFC</span><span className="font-medium text-primary text-right">{empresaRfc || "-"}</span></div>
                            <div className="flex justify-between gap-4"><span>Productos</span><span className="font-medium text-primary text-right">{lineas.length}</span></div>
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
                            <Button type="submit" variant="accent" className="w-full h-[50px] gap-2" disabled={saving || !lineas.length}>
                                <Save size={20} />
                                <p className="text-lg">{saving ? "Guardando..." : "Guardar Remision"}</p>
                            </Button>

                            <Link href="/empresas/remisiones">
                                <Button type="button" className="w-full bg-slate-100 hover:bg-slate-200">
                                    <p className="text-primary text-lg">Cancelar</p>
                                </Button>
                            </Link>
                        </div>

                        <hr className="border-border mt-6" />

                        <p className="text-xs text-center text-muted">Los cambios quedarán listos para revisar antes de facturar.</p>
                    </div>
                </aside>
            </form >
        </div >
    );
}
