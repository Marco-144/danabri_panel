"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, GripVertical, Loader, Plus, Search, ShoppingCart, Trash2, X, FileDown } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageTitle from "@/components/ui/PageTitle";
import { getAuthToken, getAuthUserFromToken, isTokenExpired } from "@/services/auth";
import {
    createCotizacionCliente,
    getCotizacionClienteById,
    searchClientesCotizacion,
    searchProductosCotizacionCliente,
    updateCotizacionCliente,
} from "@/services/cotizacionesClientesService";

const IVA_RATE = 0.16;

function to6(value) {
    return Math.round(Number(value || 0) * 100) / 100;
}

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

function addDays(dateIso, days) {
    const date = new Date(dateIso);
    date.setDate(date.getDate() + Number(days || 0));
    return date.toISOString().slice(0, 10);
}

function diffDays(startIso, endIso) {
    const start = new Date(`${String(startIso || "").slice(0, 10)}T00:00:00Z`);
    const end = new Date(`${String(endIso || "").slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return NaN;
    return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function getQtyValidationFlags({ cantidadSistema, cantidadFactura, idAlmacen, stockAlmacen }) {
    const factura = Number(cantidadFactura);
    const isValidFacturaQty = Number.isInteger(factura) && factura > 0;
    const isInvalidQty = !isValidFacturaQty;
    const hasSelectedAlmacen = Number(idAlmacen || 0) > 0;
    const stock = Number(stockAlmacen || 0);
    const exceedsStock = hasSelectedAlmacen && isValidFacturaQty && factura > stock;
    return {
        is_invalid_qty: isInvalidQty,
        exceeds_stock_almacen: exceedsStock,
    };
}

function buildPriceLevels(item) {
    const levelsSource = Array.isArray(item?.price_levels) ? item.price_levels : [];
    if (levelsSource.length) {
        return levelsSource
            .map((entry) => {
                const withTax = Number(entry?.price_with_tax ?? 0);
                if (!Number.isFinite(withTax) || withTax <= 0) return null;
                return {
                    level: Number(entry.level || 1),
                    label: `Precio ${Number(entry.level || 1)}`,
                    priceWithTax: to6(withTax),
                    priceWithoutTax: to6(Number(entry?.price_without_tax ?? (withTax / (1 + IVA_RATE)))),
                };
            })
            .filter(Boolean);
    }
    const withTax = Number(item?.manual_price || 0);
    if (!Number.isFinite(withTax) || withTax <= 0) return [];
    return [{
        level: 1,
        label: "Precio 1",
        priceWithTax: to6(withTax),
        priceWithoutTax: to6(Number(item?.manual_price_net ?? (withTax / (1 + IVA_RATE)))),
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
        || { level: 1, label: "Precio 1", priceWithTax: to6(item?.manual_price || 0), priceWithoutTax: to6(item?.manual_price_net || 0) };

    return { levels, selectedLevel };
}

function applyClientePriceLevelToLine(line, clienteNivelPrecio) {
    const levels = Array.isArray(line?.niveles_precio) ? line.niveles_precio : [];
    if (!levels.length) return line;

    const selectedLevel = levels.find((entry) => Number(entry.level) === Number(clienteNivelPrecio))
        || levels.find((entry) => Number(entry.level) === 1)
        || levels[0];

    if (!selectedLevel) return line;

    const precioSinIva = to6(selectedLevel.priceWithoutTax || 0);
    const precioConIva = to6(selectedLevel.priceWithTax || 0);
    const cantidadFactura = Number(line.cantidad_factura || 0);

    return {
        ...line,
        nivel_precio: Number(selectedLevel.level || 1),
        precio_manual_sin_iva: precioSinIva,
        precio_manual_con_iva: precioConIva,
        total_neto: to6(cantidadFactura * precioSinIva),
        total_bruto: to6(cantidadFactura * precioConIva),
    };
}

export default function CotizacionClienteFormView({ id }) {
    const router = useRouter();
    const isEditing = Boolean(id);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [clienteQuery, setClienteQuery] = useState("");
    const [clienteOptions, setClienteOptions] = useState([]);
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);
    const clienteAutocompleteRef = useRef(null);

    const [productoQuery, setProductoQuery] = useState("");
    const [productoOptions, setProductoOptions] = useState([]);
    const [selectorOpen, setSelectorOpen] = useState(false);

    const [fechaEmision, setFechaEmision] = useState(today());
    const [vigenciaDias, setVigenciaDias] = useState("0");
    const [vigenciaMode, setVigenciaMode] = useState("dias");
    const [fechaVencimientoManual, setFechaVencimientoManual] = useState("");

    const [lineas, setLineas] = useState([]);
    const [draggingUid, setDraggingUid] = useState(null);

    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            try {
                const rows = await searchClientesCotizacion(clienteQuery, 15);
                setClienteOptions(Array.isArray(rows) ? rows : []);
            } catch {
                setClienteOptions([]);
            }
        }, 220);
        return () => clearTimeout(timeoutId);
    }, [clienteQuery]);

    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            try {
                const rows = await searchProductosCotizacionCliente(productoQuery, 20);
                setProductoOptions(Array.isArray(rows) ? rows : []);
            } catch {
                setProductoOptions([]);
            }
        }, 220);
        return () => clearTimeout(timeoutId);
    }, [productoQuery]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (!clienteAutocompleteRef.current) return;
            if (!clienteAutocompleteRef.current.contains(event.target)) {
                setClienteDropdownOpen(false);
            }
        }
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    useEffect(() => {
        async function init() {
            try {
                setLoading(true);
                if (!isEditing) { setLoading(false); return; }
                const data = await getCotizacionClienteById(id);
                setSelectedCliente({ id_cliente: data.id_cliente, nombre: data.cliente_nombre, rfc: data.cliente_rfc, nivel_precio: data.nivel_precio || 1, tipo_cliente: data.tipo_cliente || "" });
                setClienteQuery(data.cliente_nombre || "");
                setFechaEmision(String(data.fecha_emision || "").slice(0, 10));
                const vigenciaLoaded = String(data.vigencia_dias || "30");
                setVigenciaDias(vigenciaLoaded);
                setFechaVencimientoManual(addDays(String(data.fecha_emision || "").slice(0, 10), Number(data.vigencia_dias || 0)));
                setVigenciaMode("dias");

                setLineas((data.detalles || []).map((line, index) => ({
                    uid: `${Date.now()}-${index}`,
                    id_producto: line.id_producto,
                    producto_nombre: line.producto_nombre || line.descripcion_personalizada || line.descripcion || "",
                    presentacion_nombre: line.presentacion_nombre || "",
                    descripcion_personalizada: line.descripcion_personalizada || line.descripcion || "",
                    requerimiento: line.requerimiento || "",
                    cantidad_sistema: Number(line.cantidad_sistema || line.cantidad_factura || line.cantidad || 1),
                    cantidad_factura: Number(line.cantidad_factura || line.cantidad || 1),
                    cantidad_factura_input: String(Number(line.cantidad_factura || line.cantidad || 1)),
                    unidad: (line.unidad || "pieza"),
                    piezas_por_presentacion: Number(line.piezas_por_presentacion || line.cantidad_sistema || line.cantidad_factura || line.cantidad || 1),
                    nivel_precio: 1,
                    niveles_precio: [{ level: 1, label: "Precio 1", priceWithTax: to6(line.precio_con_iva || 0), priceWithoutTax: to6(line.precio_sin_iva || 0) }],
                    precio_manual_sin_iva: to6(line.precio_sin_iva || 0),
                    precio_manual_con_iva: to6(line.precio_con_iva || 0),
                    total_neto: to6(line.total || 0),
                    total_bruto: to6(Number(line.cantidad_factura || line.cantidad || 1) * Number(line.precio_con_iva || 0)),
                    almacenes_stock: Array.isArray(line.almacenes_stock) ? line.almacenes_stock : [],
                    id_almacen: line.id_almacen || "",
                    stock_almacen: Number(line.stock_almacen || 0),
                    ...getQtyValidationFlags({ cantidadSistema: Number(line.cantidad_sistema || line.cantidad_factura || line.cantidad || 1), cantidadFactura: Number(line.cantidad_factura || line.cantidad || 1), idAlmacen: line.id_almacen || "", stockAlmacen: Number(line.stock_almacen || 0) })
                })));
                setError("");
            } catch (loadError) {
                setError(loadError.message || "No se pudo cargar la cotizacion");
            } finally { setLoading(false); }
        }
        init();
    }, [id, isEditing]);

    const totalSinIva = useMemo(() => to6(lineas.reduce((acc, line) => acc + Number(line.total_neto || 0), 0)), [lineas]);
    const totalConIva = useMemo(() => to6(lineas.reduce((acc, line) => acc + Number(line.total_bruto || 0), 0)), [lineas]);

    const fechaExpiracionPorDias = useMemo(() => {
        if (!fechaEmision) return "";
        const dias = Number(vigenciaDias || 0);
        if (!Number.isInteger(dias) || dias <= 0) return "";
        return addDays(fechaEmision, dias);
    }, [fechaEmision, vigenciaDias]);

    const fechaExpiracion = useMemo(() => {
        if (!vigenciaMode) return "";
        if (vigenciaMode === "manual") return String(fechaVencimientoManual || "").trim();
        return fechaExpiracionPorDias;
    }, [vigenciaMode, fechaVencimientoManual, fechaExpiracionPorDias]);

    const diasRestantes = useMemo(() => { if (!fechaExpiracion) return NaN; return diffDays(today(), fechaExpiracion); }, [fechaExpiracion]);

    useEffect(() => {
        if (!selectedCliente?.nivel_precio) return;
        const clienteNivelPrecio = resolveClienteNivelPrecio(selectedCliente);
        setLineas((prev) => prev.map((line) => applyClientePriceLevelToLine(line, clienteNivelPrecio)));
    }, [selectedCliente]);

    function handleClienteInputChange(value) { setClienteQuery(value); setSelectedCliente(null); setClienteDropdownOpen(true); }
    function handleClienteOptionSelect(item) { setSelectedCliente({ ...item, nivel_precio: resolveClienteNivelPrecio(item) }); setClienteQuery(String(item?.nombre || "")); setClienteDropdownOpen(false); }

    function addProducto(item) {
        const clienteNivelPrecio = resolveClienteNivelPrecio(selectedCliente);
        const { levels: nivelesPrecio, selectedLevel: nivelInicial } = resolveInitialPriceLevel(item, clienteNivelPrecio);
        const precioSinIva = to6(nivelInicial.priceWithoutTax || 0);
        const precioConIva = to6(nivelInicial.priceWithTax || (precioSinIva * (1 + IVA_RATE)));
        const cantidadFactura = 1;
        const cantidadSistema = Number(item.quantity || 1) || 1;
        const almacenesStock = Array.isArray(item.almacenes_stock) ? item.almacenes_stock : [];
        const almacenesSorted = [...almacenesStock].sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
        const almacenPreferido = almacenesSorted[0] || null;
        const idAlmacen = almacenPreferido ? Number(almacenPreferido.id_almacen) : "";
        const stockAlmacen = almacenPreferido ? Number(almacenPreferido.stock || 0) : 0;
        const qtyFlags = getQtyValidationFlags({ cantidadSistema, cantidadFactura, idAlmacen, stockAlmacen });

        setLineas((prev) => ([...prev, {
            uid: `${Date.now()}-${Math.random()}`,
            id_producto: item.id_producto,
            id_presentacion: item.id_presentacion,
            producto_nombre: item.producto_nombre || item.name || "",
            presentacion_nombre: item.presentacion_nombre || "",
            descripcion_personalizada: item.custom_description || item.name,
            requerimiento: "",
            cantidad_sistema: cantidadSistema,
            cantidad_factura: cantidadFactura,
            cantidad_factura_input: String(cantidadFactura),
            unidad: (item.tipo_presentacion || item.tax_unit) || "pieza",
            piezas_por_presentacion: Number(item.piezas_por_presentacion || item.quantity || 1) || 1,
            nivel_precio: Number(nivelInicial.level || 1),
            niveles_precio: nivelesPrecio,
            precio_manual_sin_iva: precioSinIva,
            precio_manual_con_iva: precioConIva,
            total_neto: to6(cantidadFactura * precioSinIva),
            total_bruto: to6(cantidadFactura * precioConIva),
            almacenes_stock: almacenesStock,
            id_almacen: idAlmacen,
            stock_almacen: stockAlmacen,
            ...qtyFlags,
        }]));

        setProductoQuery("");
        setSelectorOpen(false);
    }

    function updateLinea(uid, field, value) {
        setLineas((prev) => prev.map((line) => {
            if (line.uid !== uid) return line;
            if (field === "descripcion_personalizada") return { ...line, descripcion_personalizada: value };
            if (field === "requerimiento") return { ...line, requerimiento: value };
            if (field === "unidad") return { ...line, unidad: String(value || "").toLowerCase() };
            if (field === "id_almacen") {
                const nextAlmacen = Number(value || 0);
                const selectedAlmacen = (line.almacenes_stock || []).find(a => Number(a.id_almacen) === nextAlmacen);
                const nextStock = selectedAlmacen ? Number(selectedAlmacen.stock || 0) : 0;
                const qtyFlags = getQtyValidationFlags({ cantidadSistema: line.cantidad_sistema, cantidadFactura: line.cantidad_factura, idAlmacen: nextAlmacen || "", stockAlmacen: nextStock });
                return { ...line, id_almacen: nextAlmacen || "", stock_almacen: nextStock, ...qtyFlags };
            }
            if (field === "nivel_precio") {
                const nextLevel = Number(value || 0);
                const selectedLevel = (line.niveles_precio || []).find((lvl) => Number(lvl.level) === nextLevel);
                if (!selectedLevel) return line;
                const precioSinIva = to6(selectedLevel.priceWithoutTax || 0);
                const precioConIva = to6(selectedLevel.priceWithTax || 0);
                const cantidadFactura = Number(line.cantidad_factura || 0);
                return { ...line, nivel_precio: nextLevel, precio_manual_sin_iva: precioSinIva, precio_manual_con_iva: precioConIva, total_neto: to6(cantidadFactura * precioSinIva), total_bruto: to6(cantidadFactura * precioConIva) };
            }
            if (field === "cantidad_factura") {
                const inputValue = String(value ?? "");
                if (!/^\d*$/.test(inputValue)) return line;
                if (inputValue === "") {
                    const qtyFlags = getQtyValidationFlags({ cantidadSistema: line.cantidad_sistema, cantidadFactura: 0, idAlmacen: line.id_almacen, stockAlmacen: line.stock_almacen });
                    return { ...line, cantidad_factura_input: "", cantidad_factura: 0, total_neto: 0, total_bruto: 0, ...qtyFlags };
                }
                const cantidadFactura = Number(inputValue);
                if (!Number.isInteger(cantidadFactura)) return line;
                const qtyFlags = getQtyValidationFlags({ cantidadSistema: line.cantidad_sistema, cantidadFactura, idAlmacen: line.id_almacen, stockAlmacen: line.stock_almacen });
                const totalNeto = to6(cantidadFactura * Number(line.precio_manual_sin_iva || 0));
                const totalBruto = to6(cantidadFactura * Number(line.precio_manual_con_iva || 0));
                return { ...line, cantidad_factura_input: inputValue, cantidad_factura: cantidadFactura, total_neto: totalNeto, total_bruto: totalBruto, ...qtyFlags };
            }
            if (field === "precio_manual_sin_iva") {
                const precioNeto = Number(value);
                if (!Number.isFinite(precioNeto) || precioNeto < 0) return line;
                const precioBruto = to6(precioNeto * (1 + IVA_RATE));
                const totalNeto = to6(Number(line.cantidad_factura || 0) * precioNeto);
                const totalBruto = to6(Number(line.cantidad_factura || 0) * precioBruto);
                return { ...line, precio_manual_sin_iva: to6(precioNeto), precio_manual_con_iva: precioBruto, total_neto: totalNeto, total_bruto: totalBruto };
            }
            if (field === "precio_manual_con_iva") {
                const precioBruto = Number(value);
                if (!Number.isFinite(precioBruto) || precioBruto < 0) return line;
                const precioNeto = to6(precioBruto / (1 + IVA_RATE));
                const totalNeto = to6(Number(line.cantidad_factura || 0) * precioNeto);
                const totalBruto = to6(Number(line.cantidad_factura || 0) * precioBruto);
                return { ...line, precio_manual_sin_iva: precioNeto, precio_manual_con_iva: to6(precioBruto), total_neto: totalNeto, total_bruto: totalBruto };
            }
            return line;
        }));
    }

    function removeLinea(uid) { setLineas((prev) => prev.filter((line) => line.uid !== uid)); }

    function moveLinea(uid, direction) {
        setLineas((prev) => {
            const idx = prev.findIndex((line) => line.uid === uid);
            if (idx < 0) return prev;
            const target = direction === "up" ? idx - 1 : idx + 1;
            if (target < 0 || target >= prev.length) return prev;
            const next = [...prev];
            const [item] = next.splice(idx, 1);
            next.splice(target, 0, item);
            return next;
        });
    }

    function onDragStart(uid) { setDraggingUid(uid); }
    function onDrop(uid) {
        setLineas((prev) => {
            const from = prev.findIndex((line) => line.uid === draggingUid);
            const to = prev.findIndex((line) => line.uid === uid);
            if (from < 0 || to < 0 || from === to) return prev;
            const next = [...prev];
            const [item] = next.splice(from, 1);
            next.splice(to, 0, item);
            return next;
        });
        setDraggingUid(null);
    }

    function buildPrintableHtml({ includeIva }) {
        const totalValue = includeIva ? totalConIva : totalSinIva;
        const rowsHtml = lineas.map((line, index) => {
            const unitPrice = includeIva ? line.precio_manual_con_iva : line.precio_manual_sin_iva;
            const amount = includeIva ? line.total_bruto : line.total_neto;
            const almacenSeleccionado = (line.almacenes_stock || []).find((almacen) => Number(almacen.id_almacen) === Number(line.id_almacen));
            const descripcionBase = `${line.producto_nombre || ""}${line.presentacion_nombre ? `, ${line.presentacion_nombre}` : ""}`.trim() || line.descripcion_personalizada || "-";
            const descripcion = `${descripcionBase} | Tipo: ${String(line.unidad || "pieza").toUpperCase()}${almacenSeleccionado ? ` | Almacen: ${almacenSeleccionado.nombre}` : ""}`;
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${descripcion}</td>
                    <td style="text-align:right;">${line.cantidad_factura}</td>
                    <td style="text-align:right;">$${Number(unitPrice || 0).toFixed(2)}</td>
                    <td style="text-align:right;">$${Number(amount || 0).toFixed(2)}</td>
                </tr>
            `;
        }).join("");
        return `
            <html>
            <head>
                <title>Cotizacion Clientes</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
                    h1 { text-align: center; margin-bottom: 20px; }
                    .meta { margin-bottom: 20px; line-height: 1.8; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #d1d5db; padding: 8px; }
                    th { background: #f3f4f6; text-align: left; }
                    .total-wrap { margin-top: 16px; text-align: right; font-size: 20px; font-weight: 700; }
                </style>
            </head>
            <body>
                <h1>COTIZACION DE CLIENTES</h1>
                <div class="meta">
                    <div><strong>Cliente:</strong> ${selectedCliente?.nombre || "-"}</div>
                    <div><strong>Fecha de emision:</strong> ${fechaEmision || "-"}</div>
                    <div><strong>Fecha de vencimiento:</strong> ${fechaExpiracion || "-"}</div>
                </div>
                <h3>Productos</h3>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Descripcion</th>
                            <th>Cantidad (factura)</th>
                            <th>Precio unitario</th>
                            <th>Importe</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
                <div class="total-wrap">Total: $${Number(totalValue || 0).toFixed(2)}</div>
            </body>
            </html>
        `;
    }

    function openPrintPreview(includeIva) {
        const popup = window.open("", "_blank", "width=1000,height=800");
        if (!popup) return;
        popup.document.write(buildPrintableHtml({ includeIva }));
        popup.document.close();
        popup.focus();
    }

    async function handleSave() {
        if (!selectedCliente?.id_cliente) { setError("Selecciona un cliente"); return; }
        if (!fechaEmision) { setError("Ingresa la fecha de emision"); return; }
        if (vigenciaMode === "manual" && !fechaVencimientoManual) { setError("Ingresa una fecha de vencimiento manual"); return; }
        const vigencia = diffDays(fechaEmision, fechaExpiracion);
        if (!Number.isInteger(vigencia) || vigencia <= 0) { setError("La fecha de vencimiento debe ser mayor a la fecha de emision"); return; }
        if (!lineas.length) { setError("Agrega al menos un producto o partida"); return; }
        const invalidQty = lineas.find((line) => line.is_invalid_qty);
        if (invalidQty) { setError("Hay partidas con cantidad invalida. Debe ser un entero mayor a cero."); return; }
        const exceedsStock = lineas.find((line) => line.exceeds_stock_almacen);
        if (exceedsStock) { setError("Hay partidas cuya cantidad factura supera el stock del almacen seleccionado."); return; }
        const token = getAuthToken();
        if (!token || isTokenExpired(token)) { setError("Tu sesion expiro, vuelve a iniciar sesion"); return; }
        const authUser = getAuthUserFromToken(token);
        if (!authUser?.id) { setError("No se pudo identificar al usuario actual"); return; }

        const payload = {
            id_cliente: Number(selectedCliente.id_cliente),
            id_usuario: Number(authUser.id),
            tipo_presentacion: (lineas[0]?.unidad || "pieza"),
            fecha_emision: fechaEmision,
            vigencia_dias: vigencia,
            detalles: lineas.map((line) => ({
                id_producto: Number(line.id_producto || 0),
                cantidad: Number(line.cantidad_factura || 0),
                precio: Number(line.precio_manual_sin_iva || 0),
                descripcion_personalizada: String(line.descripcion_personalizada || "").trim(),
                requerimiento: String(line.requerimiento || "").trim(),
                cantidad_sistema: Number(line.cantidad_sistema || 0),
                cantidad_factura: Number(line.cantidad_factura || 0),
                unidad: String(line.unidad || "pieza"),
                precio_sin_iva: Number(line.precio_manual_sin_iva || 0),
                precio_con_iva: Number(line.precio_manual_con_iva || 0),
            })),
        };

        try {
            setSaving(true);
            setError("");
            const result = isEditing ? await updateCotizacionCliente(id, payload) : await createCotizacionCliente(payload);
            const nextId = isEditing ? id : result?.id_cotizacion_cliente || result?.id_cotizacion;
            router.replace(`/clientes/cotizaciones?mode=view&id=${nextId}`);
        } catch (saveError) {
            setError(saveError.message || "No se pudo guardar la cotizacion");
        } finally { setSaving(false); }
    }

    if (loading) {
        return (<div className="flex items-center justify-center h-64"><Loader className="animate-spin text-primary" /></div>);
    }

    return (
        <div className="space-y-5">
            <PageTitle
                title={isEditing ? "Editar Cotizacion Cliente" : "Nueva Cotizacion Cliente"}
                subtitle="Define cliente, productos y vigencia"
                icon={<ShoppingCart size={22} />}
                actions={(
                    <Link href="/clientes/cotizaciones"><Button variant="outline" className="gap-2"><ChevronLeft size={16} /> Volver / Cancelar</Button></Link>
                )}
            />

            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

            <div className="space-y-5 min-w-0">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
                    <div className="xl:col-span-2 bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
                        <h2 className="text-base font-semibold text-primary">Datos generales</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div ref={clienteAutocompleteRef} className="relative">
                                <label className="text-sm text-muted block mb-1">Cliente *</label>
                                <input
                                    placeholder="Buscar un cliente..."
                                    value={clienteQuery}
                                    onChange={(e) => handleClienteInputChange(e.target.value)}
                                    onFocus={() => setClienteDropdownOpen(true)}
                                    className="w-full rounded-lg border border-border px-3 py-2.5 text-sm mb-1"
                                />

                                {clienteDropdownOpen ? (
                                    <div className="absolute left-0 right-0 top-[calc(100%+2px)] z-30 rounded-lg border border-border bg-white shadow-card max-h-52 overflow-y-auto">
                                        {!clienteOptions.length ? (
                                            <div className="px-3 py-2 text-xs text-muted">Sin resultados</div>
                                        ) : clienteOptions.map((item) => (
                                            <button key={item.id_cliente} type="button" onMouseDown={() => handleClienteOptionSelect(item)} className="w-full text-left px-3 py-2 text-sm hover:bg-background/60 border-b border-border last:border-b-0">{item.nombre}</button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <Input label="Fecha de emision" type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} />

                            {vigenciaMode === "dias" ? (
                                <Input label="Vigencia (dias)" type="number" min="1" value={vigenciaDias} onChange={(e) => setVigenciaDias(e.target.value)} />
                            ) : null}

                            {vigenciaMode === "manual" ? (
                                <Input label="Fecha de vencimiento manual" type="date" value={fechaVencimientoManual} onChange={(e) => setFechaVencimientoManual(e.target.value)} />
                            ) : null}

                            <div className="mt-6 rounded-lg bg-blue-50 text-blue-900 px-3 py-2 text-sm">
                                Expira el: <strong>{fechaExpiracion ? new Date(fechaExpiracion).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "-"}</strong>
                                {Number.isNaN(diasRestantes) ? null : diasRestantes > 0 ? ` (faltan ${diasRestantes} dias)` : diasRestantes === 0 ? " (vence hoy)" : ` (vencida hace ${Math.abs(diasRestantes)} dias)`}
                            </div>

                            <div className="md:col-span-2">
                                <label className="text-sm text-muted block mb-2">Calcular vencimiento por</label>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant={vigenciaMode === "dias" ? "accent" : "outline"}
                                        className="rounded-xl h-10"
                                        onClick={() => setVigenciaMode("dias")}
                                    >
                                        Por días
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={vigenciaMode === "manual" ? "accent" : "outline"}
                                        className="rounded-xl h-10"
                                        onClick={() => setVigenciaMode("manual")}
                                    >
                                        Por fecha
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="xl:col-span-1 bg-white rounded-2xl border border-border shadow-card space-y-3 xl:sticky xl:top-6">
                        <div className="bg-primary text-white rounded-t-2xl p-5">
                            <h3 className="text-xl font-semibold">Resumen</h3>
                        </div>
                        <div className="space-y-2 text-sm p-5">
                            <div className="flex justify-between items-center text-muted mb-3">
                                <span className="text-base">Total neto (sin IVA)</span>
                                <span className="font-semibold text-primary text-xl">{fmtMoney(totalSinIva)}</span>
                            </div>
                            <hr className="text-gray-200 border mb-3" />
                            <div className="flex justify-between items-center text-muted">
                                <span className="text-base">Total bruto (con IVA)</span>
                                <span className="font-semibold text-primary text-xl">{fmtMoney(totalConIva)}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 pl-5 pr-5 pb-5">
                            <div className="flex justify-between gap-4">
                                <Button variant="danger" className="w-full" onClick={() => openPrintPreview(true)}>Generar PDF (con IVA)</Button>
                                <Button variant="danger" className="w-full" onClick={() => openPrintPreview(false)}>Generar PDF (sin IVA)</Button>
                                {/* {isEditing ? (
                                    <>
                                        <Button variant="danger" className="w-full" onClick={() => openPrintPreview(true)}>Generar PDF (con IVA)</Button>
                                        <Button variant="danger" className="w-full" onClick={() => openPrintPreview(false)}>Generar PDF (sin IVA)</Button>
                                    </>
                                ) : null} */}
                            </div>
                            <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear cotizacion"}</Button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex w-[280px] items-center gap-3"><h2 className="text-base font-semibold text-primary">Productos</h2><span className="text-xs text-muted">{lineas.length} lineas</span></div>
                        <Button type="button" variant="primary" className="gap-2 rounded-xl" onClick={() => setSelectorOpen(true)}><Plus size={15} /> Agregar Producto</Button>
                    </div>

                    <div className="overflow-x-auto border border-border rounded-xl w-full">
                        <table className="w-full min-w-[1560px] text-sm">
                            <thead className="bg-background text-primary">
                                <tr>
                                    <th className="text-center p-3 w-10">#</th>
                                    <th className="text-left p-3">Descripcion</th>
                                    <th className="text-center p-3">Accion</th>
                                    <th className="text-center p-3">Cantidad</th>
                                    <th className="text-center p-3">Tipo</th>
                                    <th className="text-center p-3">Piezas</th>
                                    <th className="text-center p-3">Nivel Precio</th>
                                    <th className="text-center p-3">Precio Manual c/IVA</th>
                                    <th className="text-center p-3">Precio Manual s/IVA</th>
                                    <th className="text-center p-3">Total</th>
                                    <th className="text-center p-3">Almacen</th>
                                    <th className="text-center p-3">Stock</th>
                                    <th className="text-center p-3">Descripcion personalizada</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!lineas.length ? (
                                    <tr><td colSpan={13} className="p-6 text-center text-muted">Aun no agregas partidas</td></tr>
                                ) : lineas.map((line, index) => (
                                    <tr key={line.uid} className="border-t border-border hover:bg-background/30" draggable onDragStart={() => onDragStart(line.uid)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(line.uid)}>
                                        <td className="p-3 text-center align-top">
                                            <div className="flex flex-col items-center gap-1 text-muted"><GripVertical size={14} className="cursor-grab" />
                                                <button type="button" className="text-xs hover:text-primary" onClick={() => moveLinea(line.uid, "up")}>▲</button>
                                                <button type="button" className="text-xs hover:text-primary" onClick={() => moveLinea(line.uid, "down")}>▼</button>
                                            </div>
                                        </td>
                                        <td className="p-3 min-w-[220px] align-top">
                                            <p className="font-medium text-primary">{line.producto_nombre || ""}{line.presentacion_nombre ? `, ${line.presentacion_nombre}` : ""}</p>
                                            <p className="text-xs text-muted">{line.presentacion_nombre || "Presentacion"}</p>
                                            <p className="text-xs text-muted">Linea #{index + 1}</p>
                                        </td>
                                        <td className="p-3 text-center align-top"><Button variant="lightghost" className="p-1.5 h-auto" onClick={() => removeLinea(line.uid)}><Trash2 size={16} className="text-red-600" /></Button></td>
                                        <td className="p-3 text-right align-top">
                                            <input type="number" value={line.cantidad_factura_input ?? String(line.cantidad_factura || "")} onChange={(e) => updateLinea(line.uid, "cantidad_factura", e.target.value)} className="w-18 rounded-lg border border-border px-2 py-1 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" onMouseDown={e => e.stopPropagation()} />
                                            {line.is_invalid_qty ? <p className="text-[10px] text-red-600 mt-1">Debe ser mayor a 0</p> : null}
                                            {line.exceeds_stock_almacen ? <p className="text-[10px] text-red-600 mt-1">Supera el stock del almacén</p> : null}
                                        </td>
                                        <td className="p-3 text-center align-top">
                                            <span className="inline-flex items-center rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-primary">
                                                {String(line.unidad || "pieza").charAt(0).toUpperCase() + String(line.unidad || "pieza").slice(1)}
                                            </span>
                                        </td>
                                        <td className="p-3 py-4 text-center align-top">{line.piezas_por_presentacion || 1}</td>
                                        <td className="p-3 align-top">
                                            <select className="w-35 rounded-lg border border-border px-2 py-1 text-sm" value={line.nivel_precio || 1} onChange={(e) => updateLinea(line.uid, "nivel_precio", e.target.value)} onMouseDown={e => e.stopPropagation()}>
                                                {(line.niveles_precio || []).map((nivel) => (<option key={`${line.uid}-${nivel.level}`} value={nivel.level}>{nivel.label} - {fmtMoney(nivel.priceWithTax)}</option>))}
                                            </select>
                                        </td>
                                        <td className="p-3 text-right align-top"><input type="number" step="0.01" min="0" value={line.precio_manual_con_iva} onChange={(e) => updateLinea(line.uid, "precio_manual_con_iva", e.target.value)} className="w-28 rounded-lg border border-border px-2 py-1 text-right" onMouseDown={e => e.stopPropagation()} /></td>
                                        <td className="p-3 text-right align-top"><input type="number" step="0.01" min="0" value={line.precio_manual_sin_iva} onChange={(e) => updateLinea(line.uid, "precio_manual_sin_iva", e.target.value)} className="w-28 rounded-lg border border-border px-2 py-1 text-right" onMouseDown={e => e.stopPropagation()} /></td>
                                        <td className="p-3 py-4 text-right font-semibold text-primary align-top">{fmtMoney(line.total_bruto)}</td>
                                        <td className="p-3 text-center align-top"><select className="w-44 rounded-lg border border-border px-2 py-1 text-sm" value={line.id_almacen || ""} onChange={(e) => updateLinea(line.uid, "id_almacen", e.target.value)} onMouseDown={e => e.stopPropagation()}><option value="">Selecciona</option>{(line.almacenes_stock || []).map((almacen) => (<option key={`${line.uid}-almacen-${almacen.id_almacen}`} value={almacen.id_almacen}>{almacen.nombre}</option>))}</select></td>
                                        <td className="p-3 py-4 text-center align-top">{Number(line.stock_almacen || 0)}</td>
                                        <td className="p-3 min-w-[260px] align-top"><input onChange={(e) => updateLinea(line.uid, "descripcion_personalizada", e.target.value)} className="w-full rounded-lg border border-border px-2 py-1" placeholder="Descripcion personalizada..." onMouseDown={e => e.stopPropagation()} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {selectorOpen ? (
                <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl rounded-2xl border border-border shadow-card p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-primary">Agregar producto a la cotizacion</h3>
                            <button type="button" onClick={() => setSelectorOpen(false)} className="text-muted hover:text-primary"><X size={18} /></button>
                        </div>

                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                            <Input placeholder="Buscar producto por nombre, presentacion o codigo" value={productoQuery} onChange={(e) => setProductoQuery(e.target.value)} inputClassName="pl-10" />
                        </div>

                        <div className="border border-border rounded-lg overflow-y-auto max-h-[420px]">
                            {!productoOptions.length ? (<div className="p-4 text-sm text-muted">Sin resultados</div>) : productoOptions.map((item) => (
                                <button key={item.id_presentacion || item.id_producto} type="button" className="w-full text-left px-3 py-3 border-b border-border last:border-b-0 hover:bg-background/50" onClick={() => addProducto(item)}>
                                    <p className="font-medium text-primary">{item.producto_nombre || item.name}</p>
                                    <p className="text-xs text-muted">Cant. sistema: {item.quantity} | Stock total: {Number(item.stock_total || 0)} | Precio c/IVA: {fmtMoney(item.manual_price)}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}

        </div>
    );
}
