"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, GripVertical, Loader, Plus, Search, ShoppingCart, Trash2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PageTitle from "@/components/ui/PageTitle";
import { getAuthToken, getAuthUserFromToken, isTokenExpired } from "@/services/auth";
import {
    createCotizacionEmpresa,
    getCotizacionEmpresaById,
    searchEmpresasCotizacion,
    searchProductosCotizacion,
    updateCotizacionEmpresa,
} from "@/services/cotizacionesEmpresasService";

const IVA_RATE = 0.16;

const CFDI_METODO_PAGO = [
    { value: "PUE", label: "PUE - Pago en una sola exhibicion" },
    { value: "PPD", label: "PPD - Pago en parcialidades o diferido" },
];

const CFDI_FORMA_PAGO = [
    { value: "01", label: "01 - Efectivo" },
    { value: "02", label: "02 - Cheque nominativo" },
    { value: "03", label: "03 - Transferencia electronica" },
    { value: "04", label: "04 - Tarjeta de credito" },
    { value: "28", label: "28 - Tarjeta de debito" },
    { value: "99", label: "99 - Por definir" },
];

const CFDI_USO = [
    { value: "G01", label: "Adquisicion de mercancias" },
    { value: "G02", label: "Devoluciones, descuentos o bonificaciones" },
    { value: "G03", label: "Gastos en general" },
    { value: "I04", label: "Mobiliario y equipo de oficina por inversiones" },
    { value: "I08", label: "Equipo de computo y accesorios" },
    { value: "I06", label: "Otra maquinaria y equipo" },
    { value: "S01", label: "Sin efectos fiscales" },
];

const CFDI_REGIMEN = [
    { value: "601", label: "General de Ley Personas Morales" },
    { value: "603", label: "Personas Morales con Fines no Lucrativos" },
    { value: "605", label: "Sueldos y Salarios e Ingresos Asimilados a Salarios" },
    { value: "606", label: "Arrendamiento" },
    { value: "607", label: "Regimen de Enajenacion o Adquisicion de Bienes" },
    { value: "608", label: "Demas ingresos" },
    { value: "610", label: "Residentes en el Extranjero sin Establecimiento Permanente en Mexico" },
    { value: "611", label: "Ingresos por Dividendos (socios y accionistas)" },
    { value: "612", label: "Personas Fisicas con Actividades Empresariales y Profesionales" },
    { value: "614", label: "Ingresos por intereses" },
    { value: "615", label: "Regimen de los ingresos por obtencion de premios" },
    { value: "616", label: "Sin obligaciones fiscales" },
    { value: "620", label: "Sociedades Cooperativas de Produccion que optan por diferir sus ingresos" },
    { value: "621", label: "Incorporacion Fiscal" },
    { value: "622", label: "Actividades Agricolas, Ganaderas, Silvicolas y Pesqueras" },
    { value: "623", label: "Opcional para Grupos de Sociedades" },
    { value: "624", label: "Coordinados" },
    { value: "625", label: "Regimen de las Actividades Empresariales con ingresos a traves de Plataformas Tecnologicas" },
    { value: "626", label: "Regimen Simplificado de Confianza" },
];

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

function toDateOnly(value) {
    if (!value) return "";

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }

    const text = String(value).trim();

    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    const esMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (esMatch) {
        const dd = String(Number(esMatch[1])).padStart(2, "0");
        const mm = String(Number(esMatch[2])).padStart(2, "0");
        return `${esMatch[3]}-${mm}-${dd}`;
    }

    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
        return "";
    }

    return parsed.toISOString().slice(0, 10);
}

function normalizeUnidad(value) {
    const unit = String(value || "").toLowerCase();
    if (["pieza", "caja", "paquete"].includes(unit)) return unit;
    return "pieza";
}

const TIPO_PRESENTACION_OPTIONS = [
    { value: "pieza", label: "Pieza" },
    { value: "caja", label: "Caja" },
    { value: "paquete", label: "Paquete" },
];

const VIGENCIA_MODE_OPTIONS = [
    { value: "dias", label: "Por dias" },
    { value: "manual", label: "Fecha manual" },
    { value: "pago_habitual", label: "Fecha pago habitual" },
];

const PAGO_HABITUAL_OFFSET_OPTIONS = [
    { value: "0", label: "Siguiente pago" },
    { value: "1", label: "Siguiente +1 mes" },
    { value: "2", label: "Siguiente +2 meses" },
];

function addMonthsKeepingDay(baseDate, monthsToAdd, dayOfMonth) {
    const year = baseDate.getUTCFullYear();
    const month = baseDate.getUTCMonth();
    const targetMonthIndex = month + Number(monthsToAdd || 0);
    const lastDayOfTargetMonth = new Date(Date.UTC(year, targetMonthIndex + 1, 0)).getUTCDate();
    const safeDay = Math.min(Number(dayOfMonth || 1), lastDayOfTargetMonth);
    return new Date(Date.UTC(year, targetMonthIndex, safeDay));
}

function getReferenciaPagoHabitualDate({ fechaBase, pagoHabitual, mesesOffset = 0 }) {
    const baseText = toDateOnly(fechaBase);
    const pagoText = toDateOnly(pagoHabitual);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(baseText) || !/^\d{4}-\d{2}-\d{2}$/.test(pagoText)) {
        return "";
    }

    const base = new Date(`${baseText}T00:00:00Z`);
    const pago = new Date(`${pagoText}T00:00:00Z`);
    if (Number.isNaN(base.getTime()) || Number.isNaN(pago.getTime())) {
        return "";
    }

    const baseYear = base.getUTCFullYear();
    const baseMonth = base.getUTCMonth();
    const baseDay = base.getUTCDate();
    const habitualDay = pago.getUTCDate();

    const firstCandidate = addMonthsKeepingDay(
        new Date(Date.UTC(baseYear, baseMonth, 1)),
        baseDay <= habitualDay ? 0 : 1,
        habitualDay
    );
    const finalCandidate = addMonthsKeepingDay(firstCandidate, Number(mesesOffset || 0), habitualDay);
    return finalCandidate.toISOString().slice(0, 10);
}

function diffDays(startIso, endIso) {
    const start = new Date(`${String(startIso || "").slice(0, 10)}T00:00:00Z`);
    const end = new Date(`${String(endIso || "").slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return NaN;
    }

    return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

function calcTotalBruto(lines) {
    return to6(lines.reduce((acc, line) => acc + Number(line.total_bruto || 0), 0));
}

function calcTotalNeto(lines) {
    return to6(lines.reduce((acc, line) => acc + Number(line.total_neto || 0), 0));
}

function getQtyValidationFlags({ cantidadFactura, idAlmacen, stockAlmacen }) {
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
                const basePrice = Number(entry?.price_with_tax ?? 0);

                if (!Number.isFinite(basePrice) || basePrice <= 0) {
                    return null;
                }

                return {
                    level: Number(entry.level || 1),
                    label: `Precio ${Number(entry.level || 1)}`,
                    priceWithoutTax: to6(basePrice),
                    priceWithTax: to6(basePrice * (1 + IVA_RATE)),
                };
            })
            .filter(Boolean);
    }
    const basePrice = Number(item?.manual_price || 0);

    if (!Number.isFinite(basePrice) || basePrice <= 0) {
        return [];
    }

    return [{
        level: 1,
        label: "Precio 1",
        priceWithoutTax: to6(basePrice),
        priceWithTax: to6(basePrice * (1 + IVA_RATE)),
    }];
}

export default function CotizacionEmpresaFormView({ id }) {
    const router = useRouter();
    const isEditing = Boolean(id);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [empresaQuery, setEmpresaQuery] = useState("");
    const [empresaOptions, setEmpresaOptions] = useState([]);
    const [selectedEmpresa, setSelectedEmpresa] = useState(null);
    const [empresaDropdownOpen, setEmpresaDropdownOpen] = useState(false);
    const empresaAutocompleteRef = useRef(null);

    const [productoQuery, setProductoQuery] = useState("");
    const [productoOptions, setProductoOptions] = useState([]);
    const [selectorOpen, setSelectorOpen] = useState(false);
    const [facturaModalOpen, setFacturaModalOpen] = useState(false);
    const [facturaForm, setFacturaForm] = useState({
        correo_destino: "",
        metodo_pago: "",
        forma_pago: "",
        uso_cfdi: "",
        regimen_fiscal: "",
        observaciones: "",
    });
    const [draggingUid, setDraggingUid] = useState(null);

    const [fechaEmision, setFechaEmision] = useState(today());
    const [vigenciaDias, setVigenciaDias] = useState("5");
    const [vigenciaMode, setVigenciaMode] = useState("");
    const [fechaVencimientoManual, setFechaVencimientoManual] = useState("");
    const [pagoHabitualOffsetMeses, setPagoHabitualOffsetMeses] = useState("0");
    const [lineas, setLineas] = useState([]);

    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            try {
                const rows = await searchEmpresasCotizacion(empresaQuery, 15);
                setEmpresaOptions(Array.isArray(rows) ? rows : []);
            } catch {
                setEmpresaOptions([]);
            }
        }, 220);

        return () => clearTimeout(timeoutId);
    }, [empresaQuery]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (!empresaAutocompleteRef.current) return;
            if (!empresaAutocompleteRef.current.contains(event.target)) {
                setEmpresaDropdownOpen(false);
            }
        }

        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            try {
                const rows = await searchProductosCotizacion(productoQuery, 20);
                setProductoOptions(Array.isArray(rows) ? rows : []);
            } catch {
                setProductoOptions([]);
            }
        }, 220);

        return () => clearTimeout(timeoutId);
    }, [productoQuery]);

    useEffect(() => {
        async function init() {
            try {
                setLoading(true);

                if (!isEditing) {
                    setLoading(false);
                    return;
                }

                const data = await getCotizacionEmpresaById(id);

                setSelectedEmpresa({
                    id_empresa: data.id_empresa,
                    nombre: data.empresa_nombre,
                    nombre_fiscal: data.empresa_nombre,
                    pago_habitual: toDateOnly(data.empresa_pago_habitual),
                });
                setEmpresaQuery(data.empresa_nombre || "");

                setFechaEmision(String(data.fecha_emision || "").slice(0, 10));
                const vigenciaLoaded = String(data.vigencia_dias || "30");
                setVigenciaDias(vigenciaLoaded);
                setFechaVencimientoManual(addDays(String(data.fecha_emision || "").slice(0, 10), Number(data.vigencia_dias || 0)));
                setVigenciaMode("dias");

                setLineas((data.detalles || []).map((line, index) => ({
                    uid: `${Date.now()}-${index}`,
                    producto_nombre: line.producto_nombre || line.descripcion_personalizada || line.descripcion || "",
                    presentacion_nombre: line.presentacion_nombre || "",
                    descripcion_personalizada: line.descripcion_personalizada || line.descripcion || "",
                    requerimiento: line.requerimiento || "",
                    cantidad_sistema: Number(line.cantidad_sistema || line.cantidad_factura || line.cantidad || 1),
                    cantidad_factura: Number(line.cantidad_factura || line.cantidad || 1),
                    cantidad_factura_input: String(Number(line.cantidad_factura || line.cantidad || 1)),
                    unidad: normalizeUnidad(line.unidad),
                    piezas_por_presentacion: Number(line.piezas_por_presentacion || line.cantidad_sistema || line.cantidad_factura || line.cantidad || 1),
                    nivel_precio: 1,
                    niveles_precio: [{
                        level: 1,
                        label: "Precio 1",
                        priceWithTax: to6(line.precio_con_iva || 0),
                        priceWithoutTax: to6(line.precio_sin_iva || 0),
                    }],
                    precio_manual_sin_iva: to6(line.precio_sin_iva || 0),
                    precio_manual_con_iva: to6(line.precio_con_iva || 0),
                    total_neto: to6(line.total || 0),
                    total_bruto: to6(Number(line.cantidad_factura || line.cantidad || 1) * Number(line.precio_con_iva || 0)),
                    almacenes_stock: Array.isArray(line.almacenes_stock) ? line.almacenes_stock : [],
                    id_almacen: line.id_almacen || "",
                    stock_almacen: Number(line.stock_almacen || 0),
                    ...getQtyValidationFlags({
                        cantidadFactura: Number(line.cantidad_factura || line.cantidad || 1),
                        idAlmacen: line.id_almacen || "",
                        stockAlmacen: Number(line.stock_almacen || 0),
                    }),
                })));

                setError("");
            } catch (loadError) {
                setError(loadError.message || "No se pudo cargar la cotizacion");
            } finally {
                setLoading(false);
            }
        }

        init();
    }, [id, isEditing]);

    const totalSinIva = useMemo(() => calcTotalNeto(lineas), [lineas]);
    const totalConIva = useMemo(() => calcTotalBruto(lineas), [lineas]);
    const empresaFilteredOptions = useMemo(() => {
        const term = String(empresaQuery || "").trim().toLowerCase();
        if (!term) return empresaOptions;

        return (empresaOptions || []).filter((item) =>
            String(item.nombre || "").toLowerCase().includes(term)
            || String(item.nombre_fiscal || "").toLowerCase().includes(term)
            || String(item.rfc || "").toLowerCase().includes(term)
        );
    }, [empresaOptions, empresaQuery]);

    const fechaExpiracionPorDias = useMemo(() => {
        if (!fechaEmision) return "";
        const dias = Number(vigenciaDias || 0);
        if (!Number.isInteger(dias) || dias <= 0) return "";
        return addDays(fechaEmision, dias);
    }, [fechaEmision, vigenciaDias]);

    const fechaExpiracionPorPagoHabitual = useMemo(() => (
        getReferenciaPagoHabitualDate({
            fechaBase: fechaEmision,
            pagoHabitual: selectedEmpresa?.pago_habitual,
            mesesOffset: Number(pagoHabitualOffsetMeses || 0),
        })
    ), [fechaEmision, selectedEmpresa?.pago_habitual, pagoHabitualOffsetMeses]);

    const fechaExpiracion = useMemo(() => {
        if (!vigenciaMode) {
            return "";
        }

        if (vigenciaMode === "manual") {
            return String(fechaVencimientoManual || "").trim();
        }

        if (vigenciaMode === "pago_habitual") {
            return fechaExpiracionPorPagoHabitual;
        }

        return fechaExpiracionPorDias;
    }, [vigenciaMode, fechaVencimientoManual, fechaExpiracionPorPagoHabitual, fechaExpiracionPorDias]);

    function handleEmpresaInputChange(value) {
        setEmpresaQuery(value);
        setSelectedEmpresa(null);
        setEmpresaDropdownOpen(true);
    }

    function handleEmpresaOptionSelect(item) {
        setSelectedEmpresa({
            ...item,
            pago_habitual: toDateOnly(item?.pago_habitual),
        });
        setEmpresaQuery(String(item?.nombre || ""));
        setEmpresaDropdownOpen(false);
    }

    const diasRestantes = useMemo(() => {
        if (!fechaExpiracion) return NaN;
        return diffDays(today(), fechaExpiracion);
    }, [fechaExpiracion]);

    function addProducto(item) {
        const nivelesPrecio = buildPriceLevels(item);
        const nivelInicial = nivelesPrecio[0] || {
            level: 1,
            label: "Precio 1",
            priceWithTax: to6(item.manual_price || 0),
            priceWithoutTax: to6(item.manual_price_net || 0),
        };
        const precioSinIva = to6(nivelInicial.priceWithoutTax || 0);
        const precioConIva = to6(precioSinIva * (1 + IVA_RATE));
        const cantidadFactura = 1;
        const cantidadSistema = Number(item.quantity || 1) || 1;
        const almacenesStock = Array.isArray(item.almacenes_stock) ? item.almacenes_stock : [];
        const almacenesSorted = [...almacenesStock].sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
        const almacenPreferido = almacenesSorted[0] || null;
        const idAlmacen = almacenPreferido ? Number(almacenPreferido.id_almacen) : "";
        const stockAlmacen = almacenPreferido ? Number(almacenPreferido.stock || 0) : 0;
        const qtyFlags = getQtyValidationFlags({
            cantidadFactura,
            idAlmacen,
            stockAlmacen,
        });

        setLineas((prev) => ([
            ...prev,
            {
                uid: `${Date.now()}-${Math.random()}`,
                id_presentacion: item.id_presentacion,
                producto_nombre: item.producto_nombre || item.name || "",
                presentacion_nombre: item.presentacion_nombre || "",
                descripcion_personalizada: item.custom_description || item.name,
                requerimiento: "",
                cantidad_sistema: cantidadSistema,
                cantidad_factura: cantidadFactura,
                cantidad_factura_input: String(cantidadFactura),
                unidad: normalizeUnidad(item.tipo_presentacion || item.tax_unit),
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
            },
        ]));

        setProductoQuery("");
        setSelectorOpen(false);
    }

    function updateLinea(uid, field, value) {
        setLineas((prev) => prev.map((line) => {
            if (line.uid !== uid) return line;

            if (field === "descripcion_personalizada") {
                return { ...line, descripcion_personalizada: value };
            }

            if (field === "requerimiento") {
                return { ...line, requerimiento: value };
            }

            if (field === "unidad") {
                return { ...line, unidad: normalizeUnidad(value) };
            }

            if (field === "id_almacen") {
                const nextAlmacen = Number(value || 0);
                const selectedAlmacen = (line.almacenes_stock || []).find(
                    (almacen) => Number(almacen.id_almacen) === nextAlmacen
                );
                const nextStock = selectedAlmacen ? Number(selectedAlmacen.stock || 0) : 0;
                const qtyFlags = getQtyValidationFlags({
                    cantidadFactura: line.cantidad_factura,
                    idAlmacen: nextAlmacen || "",
                    stockAlmacen: nextStock,
                });

                return {
                    ...line,
                    id_almacen: nextAlmacen || "",
                    stock_almacen: nextStock,
                    ...qtyFlags,
                };
            }

            if (field === "nivel_precio") {
                const nextLevel = Number(value || 0);
                const selectedLevel = (line.niveles_precio || []).find((level) => Number(level.level) === nextLevel);
                if (!selectedLevel) return line;

                const precioSinIva = to6(selectedLevel.priceWithoutTax || 0);
                const precioConIva = to6(selectedLevel.priceWithTax || (precioSinIva * 1.16));
                const cantidadFactura = Number(line.cantidad_factura || 0);

                return {
                    ...line,
                    nivel_precio: nextLevel,
                    precio_manual_sin_iva: precioSinIva,
                    precio_manual_con_iva: precioConIva,
                    total_neto: to6(cantidadFactura * precioSinIva),
                    total_bruto: to6(cantidadFactura * precioConIva),
                };
            }

            if (field === "cantidad_factura") {
                const inputValue = String(value ?? "");
                if (!/^\d*$/.test(inputValue)) return line;

                if (inputValue === "") {
                    const qtyFlags = getQtyValidationFlags({
                        cantidadFactura: 0,
                        idAlmacen: line.id_almacen,
                        stockAlmacen: line.stock_almacen,
                    });

                    return {
                        ...line,
                        cantidad_factura_input: "",
                        cantidad_factura: 0,
                        total_neto: 0,
                        total_bruto: 0,
                        ...qtyFlags,
                    };
                }

                const cantidadFactura = Number(inputValue);
                if (!Number.isInteger(cantidadFactura)) return line;

                const qtyFlags = getQtyValidationFlags({
                    cantidadFactura,
                    idAlmacen: line.id_almacen,
                    stockAlmacen: line.stock_almacen,
                });

                const totalNeto = to6(cantidadFactura * Number(line.precio_manual_sin_iva || 0));
                const totalBruto = to6(cantidadFactura * Number(line.precio_manual_con_iva || 0));

                return {
                    ...line,
                    cantidad_factura_input: inputValue,
                    cantidad_factura: cantidadFactura,
                    total_neto: totalNeto,
                    total_bruto: totalBruto,
                    ...qtyFlags,
                };
            }

            if (field === "precio_manual_sin_iva") {
                const precioNeto = Number(value);
                if (!Number.isFinite(precioNeto) || precioNeto < 0) return line;

                const precioBruto = to6(precioNeto * (1 + IVA_RATE));
                const totalNeto = to6(Number(line.cantidad_factura || 0) * precioNeto);
                const totalBruto = to6(Number(line.cantidad_factura || 0) * precioBruto);

                return {
                    ...line,
                    precio_manual_sin_iva: to6(precioNeto),
                    precio_manual_con_iva: precioBruto,
                    total_neto: totalNeto,
                    total_bruto: totalBruto,
                };
            }

            if (field === "precio_manual_con_iva") {
                const precioBruto = Number(value);
                if (!Number.isFinite(precioBruto) || precioBruto < 0) return line;

                const precioNeto = to6(precioBruto / (1 + IVA_RATE));
                const totalNeto = to6(Number(line.cantidad_factura || 0) * precioNeto);
                const totalBruto = to6(Number(line.cantidad_factura || 0) * precioBruto);

                return {
                    ...line,
                    precio_manual_sin_iva: precioNeto,
                    precio_manual_con_iva: to6(precioBruto),
                    total_neto: totalNeto,
                    total_bruto: totalBruto,
                };
            }

            return line;
        }));
    }

    function removeLinea(uid) {
        setLineas((prev) => prev.filter((line) => line.uid !== uid));
    }

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

    function onDragStart(uid) {
        setDraggingUid(uid);
    }

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
        const totalValue = includeIva ? totalSinIva * 1.16 : totalSinIva;

        const rowsHtml = lineas.map((line, index) => {
            const basePriceWithoutIva = line.precio_manual_sin_iva || 0;
            const unitPrice = includeIva ? basePriceWithoutIva * 1.16 : basePriceWithoutIva;
            const amount = includeIva ? (basePriceWithoutIva * 1.16 * Number(line.cantidad_factura || 0)) : (basePriceWithoutIva * Number(line.cantidad_factura || 0));
            const almacenSeleccionado = (line.almacenes_stock || []).find(
                (almacen) => Number(almacen.id_almacen) === Number(line.id_almacen)
            );
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
                <title>Cotizacion Empresas</title>
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
                <h1>COTIZACION DE EMPRESAS</h1>
                <div class="meta">
                    <div><strong>Empresa:</strong> ${selectedEmpresa?.nombre || "-"}</div>
                    <div><strong>Fecha de emision:</strong> ${fechaEmision || "-"}</div>
                    <div><strong>Fecha de vencimiento:</strong> ${fechaExpiracion || "-"}</div>
                    <div><strong>Vigencia:</strong> ${vigenciaDias || "-"} dias</div>
                    <div style="margin-top:8px;"><em>${includeIva ? "Los precios incluyen IVA." : "Los precios y totales estan expresados sin IVA."}</em></div>
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
        if (!selectedEmpresa?.id_empresa) {
            setError("Selecciona una empresa");
            return;
        }

        if (!fechaEmision) {
            setError("Ingresa la fecha de emision");
            return;
        }

        if (!vigenciaMode) {
            setError("Selecciona como calcular el vencimiento");
            return;
        }

        if (vigenciaMode === "manual" && !fechaVencimientoManual) {
            setError("Ingresa una fecha de vencimiento manual");
            return;
        }

        if (vigenciaMode === "pago_habitual" && !selectedEmpresa?.pago_habitual) {
            setError("La empresa no tiene pago habitual configurado");
            return;
        }

        if (vigenciaMode === "pago_habitual" && !fechaExpiracion) {
            setError("No se pudo calcular la fecha de vencimiento por pago habitual");
            return;
        }

        const vigencia = diffDays(fechaEmision, fechaExpiracion);
        if (!Number.isInteger(vigencia) || vigencia <= 0) {
            setError("La fecha de vencimiento debe ser mayor a la fecha de emision");
            return;
        }

        if (!lineas.length) {
            setError("Agrega al menos un producto o partida");
            return;
        }

        const invalidQty = lineas.find((line) => line.is_invalid_qty);
        if (invalidQty) {
            setError("Hay partidas con cantidad factura invalida. Debe ser un entero mayor a cero y multiplo o divisor de cantidad sistema.");
            return;
        }

        const exceedsStock = lineas.find((line) => line.exceeds_stock_almacen);
        if (exceedsStock) {
            setError("Hay partidas cuya cantidad factura supera el stock del almacen seleccionado.");
            return;
        }

        const token = getAuthToken();
        if (!token || isTokenExpired(token)) {
            setError("Tu sesion expiro, vuelve a iniciar sesion");
            return;
        }

        const authUser = getAuthUserFromToken(token);
        if (!authUser?.id) {
            setError("No se pudo identificar al usuario actual");
            return;
        }

        const payload = {
            id_empresa: Number(selectedEmpresa.id_empresa),
            id_usuario: Number(authUser.id),
            tipo_presentacion: normalizeUnidad(lineas[0]?.unidad || "pieza"),
            fecha_emision: fechaEmision,
            vigencia_dias: vigencia,
            detalles: lineas.map((line) => ({
                id_presentacion: Number(line.id_presentacion || 0),
                id_almacen: Number(line.id_almacen || 0),
                descripcion_personalizada: String(line.descripcion_personalizada || "").trim(),
                requerimiento: String(line.requerimiento || "").trim(),
                cantidad_sistema: Number(line.cantidad_sistema || 0),
                cantidad_factura: Number(line.cantidad_factura || 0),
                unidad: normalizeUnidad(line.unidad),
                precio_sin_iva: Number(line.precio_manual_sin_iva || 0),
                precio_con_iva: Number(line.precio_manual_con_iva || 0),
            })),
        };

        try {
            setSaving(true);
            setError("");

            const result = isEditing
                ? await updateCotizacionEmpresa(id, payload)
                : await createCotizacionEmpresa(payload);

            const nextId = isEditing ? id : result.id_cotizacion_empresa;
            router.replace(`/empresas/cotizaciones?mode=view&id=${nextId}`);
        } catch (saveError) {
            setError(saveError.message || "No se pudo guardar la cotizacion");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <PageTitle
                title={isEditing ? "Editar Cotizacion de Empresa" : "Nueva Cotizacion de Empresa"}
                subtitle="Define empresa, productos y vigencia"
                icon={<ShoppingCart size={22} />}
                actions={(
                    <Link href="/empresas/cotizaciones">
                        <Button variant="outline" className="gap-2">
                            <ChevronLeft size={16} /> Volver
                        </Button>
                    </Link>
                )}
            />

            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

            <div className="space-y-5 min-w-0">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
                    <div className="xl:col-span-2 bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
                        <h2 className="text-base font-semibold text-primary">Datos generales</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div ref={empresaAutocompleteRef} className="relative">
                                <label className="text-sm text-muted block mb-1">Empresa *</label>

                                <input
                                    placeholder="Buscar una empresa..."
                                    value={empresaQuery}
                                    onChange={(e) => handleEmpresaInputChange(e.target.value)}
                                    onFocus={() => setEmpresaDropdownOpen(true)}
                                    className="w-full rounded-lg border border-border px-3 py-2.5 text-sm mb-1"
                                />

                                {empresaDropdownOpen ? (
                                    <div className="absolute left-0 right-0 top-[calc(100%+2px)] z-30 rounded-lg border border-border bg-white shadow-card max-h-52 overflow-y-auto">
                                        {!empresaFilteredOptions.length ? (
                                            <div className="px-3 py-2 text-xs text-muted">Sin resultados</div>
                                        ) : empresaFilteredOptions.map((item) => (
                                            <button
                                                key={item.id_empresa}
                                                type="button"
                                                onMouseDown={() => handleEmpresaOptionSelect(item)}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-background/60 border-b border-border last:border-b-0"
                                            >
                                                {item.nombre}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}

                                {!selectedEmpresa && empresaQuery ? (
                                    <p className="text-[11px] text-muted mt-1">
                                        Selecciona una empresa del listado.
                                    </p>
                                ) : null}
                            </div>

                            <Input
                                label="Fecha de emision"
                                type="date"
                                value={fechaEmision}
                                onChange={(event) => setFechaEmision(event.target.value)}
                            />

                            <Select
                                label="Calcular vencimiento por"
                                value={vigenciaMode}
                                onChange={(event) => setVigenciaMode(event.target.value)}
                                options={VIGENCIA_MODE_OPTIONS}
                            />

                            {vigenciaMode === "dias" ? (
                                <Input
                                    label="Vigencia (dias)"
                                    type="number"
                                    min="1"
                                    value={vigenciaDias}
                                    onChange={(event) => setVigenciaDias(event.target.value)}
                                    disabled={vigenciaMode !== "dias"}
                                />
                            ) : null}

                            {vigenciaMode === "manual" ? (
                                <Input
                                    label="Fecha de vencimiento manual"
                                    type="date"
                                    value={fechaVencimientoManual}
                                    onChange={(event) => setFechaVencimientoManual(event.target.value)}
                                />
                            ) : null}

                            {vigenciaMode === "pago_habitual" ? (
                                <>
                                    <Input
                                        label="Pago habitual de empresa"
                                        type="date"
                                        value={selectedEmpresa?.pago_habitual || ""}
                                        readOnly
                                    />
                                    <Select
                                        label="Referencia de pago"
                                        value={pagoHabitualOffsetMeses}
                                        onChange={(event) => setPagoHabitualOffsetMeses(event.target.value)}
                                        options={PAGO_HABITUAL_OFFSET_OPTIONS}
                                        disabled={!selectedEmpresa?.pago_habitual}
                                    />
                                </>
                            ) : null}

                            <div className="mt-6 rounded-lg bg-blue-50 text-blue-900 px-3 py-2 text-sm">
                                Expira el: <strong>{fechaExpiracion ? new Date(fechaExpiracion).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "-"}</strong>
                                {Number.isNaN(diasRestantes) ? null : diasRestantes > 0 ? ` (faltan ${diasRestantes} dias)` : diasRestantes === 0 ? " (vence hoy)" : ` (vencida hace ${Math.abs(diasRestantes)} dias)`}
                            </div>
                        </div>
                    </div>

                    <div className="xl:col-span-1 bg-white rounded-2xl border border-border shadow-card p-5 space-y-3 xl:sticky xl:top-6">
                        <h3 className="text-base font-semibold text-primary">Resumen</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-muted">
                                <span>Total neto (sin IVA)</span>
                                <span className="font-semibold text-primary">{fmtMoney(totalSinIva)}</span>
                            </div>
                            <div className="flex justify-between text-muted">
                                <span>Total bruto (con IVA)</span>
                                <span className="font-semibold text-primary">{fmtMoney(totalConIva)}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                            <Button onClick={handleSave} disabled={saving} className="w-full">
                                {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear cotizacion"}
                            </Button>
                            <Link href="/empresas/cotizaciones">
                                <Button variant="outline" className="w-full">Cancelar</Button>
                            </Link>
                            {isEditing ? (
                                <>
                                    <Button variant="danger" className="w-full" onClick={() => openPrintPreview(true)}>
                                        Generar PDF (con IVA)
                                    </Button>
                                    <Button variant="danger" className="w-full" onClick={() => openPrintPreview(false)}>
                                        Generar PDF (sin IVA)
                                    </Button>
                                    <Link href={`/empresas/remisiones?mode=add&id_cotizacion_empresa=${id}`}>
                                        <Button variant="activo" className="w-full">Crear Remision</Button>
                                    </Link>
                                    <Button variant="outline" className="w-full" onClick={() => setFacturaModalOpen(true)}>
                                        Facturar remision (CFDI)
                                    </Button>
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex w-[280px] items-center gap-3">
                            <h2 className="text-base font-semibold text-primary">Productos</h2>
                            <span className="text-xs text-muted">{lineas.length} lineas</span>
                        </div>

                        <Button type="button" variant="primary" className="gap-2 rounded-xl" onClick={() => setSelectorOpen(true)}>
                            <Plus size={15} /> Agregar Producto
                        </Button>
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
                                    <th className="text-center p-3">Precio Unitario s/IVA</th>
                                    <th className="text-center p-3">Precio Unitario c/IVA</th>
                                    <th className="text-center p-3">Total s/IVA</th>
                                    <th className="text-center p-3">Almacen</th>
                                    <th className="text-center p-3">Stock</th>
                                    <th className="text-center p-3">Descripcion personalizada</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!lineas.length ? (
                                    <tr>
                                        <td colSpan={13} className="p-6 text-center text-muted">Aun no agregas partidas</td>
                                    </tr>
                                ) : lineas.map((line, index) => (
                                    <tr
                                        key={line.uid}
                                        className="border-t border-border hover:bg-background/30"
                                        draggable
                                        onDragStart={() => onDragStart(line.uid)}
                                        onDragOver={(event) => event.preventDefault()}
                                        onDrop={() => onDrop(line.uid)}
                                    >
                                        <td className="p-3 text-center align-top">
                                            <div className="flex flex-col items-center gap-1 text-muted">
                                                <GripVertical size={14} className="cursor-grab" />
                                                <button type="button" className="text-xs hover:text-primary" onClick={() => moveLinea(line.uid, "up")}>▲</button>
                                                <button type="button" className="text-xs hover:text-primary" onClick={() => moveLinea(line.uid, "down")}>▼</button>
                                            </div>
                                        </td>
                                        <td className="p-3 min-w-[220px] align-top">
                                            <p className="font-medium text-primary">
                                                {line.producto_nombre || ""}
                                                {line.presentacion_nombre ? `, ${line.presentacion_nombre}` : ""}
                                            </p>
                                            <p className="text-xs text-muted">{line.presentacion_nombre || "Presentacion"}</p>
                                            <p className="text-xs text-muted">Linea #{index + 1}</p>
                                        </td>
                                        <td className="p-3 text-center align-top">
                                            <Button
                                                variant="lightghost"
                                                className="p-1.5 h-auto"
                                                onClick={() => removeLinea(line.uid)}
                                            >
                                                <Trash2 size={16} className="text-red-600" />
                                            </Button>
                                        </td>
                                        <td className="p-3 text-right align-top">
                                            <input
                                                type="number"
                                                value={line.cantidad_factura_input != null ? line.cantidad_factura_input : String(line.cantidad_factura || "")}
                                                onChange={(event) => updateLinea(line.uid, "cantidad_factura", event.target.value)}
                                                className="w-18 rounded-lg border border-border px-2 py-1 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                onMouseDown={e => e.stopPropagation()}
                                            />
                                            {line.is_invalid_qty ? (
                                                <p className="text-[10px] text-red-600 mt-1">Debe ser mayor a 0</p>
                                            ) : null}
                                            {line.exceeds_stock_almacen ? (
                                                <p className="text-[10px] text-red-600 mt-1">Supera el stock del almacén</p>
                                            ) : null}
                                        </td>
                                        <td className="p-3 text-center align-top">
                                            <select
                                                className="w-28 rounded-lg border border-border px-3 py-1 text-sm"
                                                value={line.unidad || "pieza"}
                                                onChange={(event) => updateLinea(line.uid, "unidad", event.target.value)}
                                                onMouseDown={e => e.stopPropagation()}
                                            >
                                                {TIPO_PRESENTACION_OPTIONS.map((tipo) => (
                                                    <option key={`${line.uid}-unidad-${tipo.value}`} value={tipo.value}>{tipo.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-3 py-4 text-center align-top">{line.piezas_por_presentacion || 1}</td>
                                        <td className="p-3 align-top">
                                            <select
                                                className="w-35 rounded-lg border border-border px-2 py-1 text-sm"
                                                value={line.nivel_precio || 1}
                                                onChange={(event) => updateLinea(line.uid, "nivel_precio", event.target.value)}
                                                onMouseDown={e => e.stopPropagation()}
                                            >
                                                {(line.niveles_precio || []).map((nivel) => (
                                                    <option key={`${line.uid}-${nivel.level}`} value={nivel.level}>
                                                        {nivel.label} - {fmtMoney(nivel.priceWithoutTax)}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-3 text-right align-top">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={line.precio_manual_sin_iva}
                                                onChange={(event) => updateLinea(line.uid, "precio_manual_sin_iva", event.target.value)}
                                                className="w-28 rounded-lg border border-border px-2 py-1 text-right"
                                                onMouseDown={e => e.stopPropagation()}
                                            />
                                        </td>
                                        <td className="p-3 text-right align-top">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={line.precio_manual_con_iva}
                                                onChange={(event) => updateLinea(line.uid, "precio_manual_con_iva", event.target.value)}
                                                className="w-28 rounded-lg border border-border px-2 py-1 text-right"
                                                onMouseDown={e => e.stopPropagation()}
                                            />
                                        </td>
                                        <td className="p-3 py-4 text-right font-semibold text-primary align-top">{fmtMoney(line.total_neto)}</td>
                                        <td className="p-3 text-center align-top">
                                            <select
                                                className="w-44 rounded-lg border border-border px-2 py-1 text-sm"
                                                value={line.id_almacen || ""}
                                                onChange={(event) => updateLinea(line.uid, "id_almacen", event.target.value)}
                                                onMouseDown={e => e.stopPropagation()}
                                            >
                                                <option value="">Selecciona</option>
                                                {(line.almacenes_stock || []).map((almacen) => (
                                                    <option key={`${line.uid}-almacen-${almacen.id_almacen}`} value={almacen.id_almacen}>
                                                        {almacen.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-3 py-4 text-center align-top">{Number(line.stock_almacen || 0)}</td>
                                        <td className="p-3 min-w-[260px] align-top">
                                            <input
                                                onChange={(event) => updateLinea(line.uid, "descripcion_personalizada", event.target.value)}
                                                className="w-full rounded-lg border border-border px-2 py-1"
                                                placeholder="Descripcion personalizada..."
                                                onMouseDown={e => e.stopPropagation()}
                                            />
                                        </td>
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
                            <button type="button" onClick={() => setSelectorOpen(false)} className="text-muted hover:text-primary">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                            <Input
                                placeholder="Buscar producto por nombre, presentacion o codigo"
                                value={productoQuery}
                                onChange={(event) => setProductoQuery(event.target.value)}
                                inputClassName="pl-10"
                            />
                        </div>

                        <div className="border border-border rounded-lg overflow-y-auto max-h-[420px]">
                            {!productoOptions.length ? (
                                <div className="p-4 text-sm text-muted">Sin resultados</div>
                            ) : productoOptions.map((item) => (
                                <button
                                    key={item.id_presentacion}
                                    type="button"
                                    className="w-full text-left px-3 py-3 border-b border-border last:border-b-0 hover:bg-background/50"
                                    onClick={() => addProducto(item)}
                                >
                                    <p className="font-medium text-primary">{item.name}</p>
                                    <p className="text-xs text-muted">
                                        Cant. sistema: {item.quantity} | Stock total: {Number(item.stock_total || 0)} | Precio c/IVA: {fmtMoney(item.manual_price)}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}

            {facturaModalOpen ? (
                <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-3xl rounded-2xl border border-border shadow-card p-5 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-primary mb-1">GENERAR FACTURA (CFDI)</h3>
                        <p className="text-sm text-muted mb-4">¿Estas seguro de que deseas ejecutar esta accion?</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Correo destino *"
                                placeholder="Correo destino"
                                value={facturaForm.correo_destino}
                                onChange={(event) => setFacturaForm((prev) => ({ ...prev, correo_destino: event.target.value }))}
                            />
                            <Select
                                label="Metodo de pago *"
                                value={facturaForm.metodo_pago}
                                onChange={(event) => setFacturaForm((prev) => ({ ...prev, metodo_pago: event.target.value }))}
                                options={CFDI_METODO_PAGO}
                            />
                            <Select
                                label="Forma de pago *"
                                value={facturaForm.forma_pago}
                                onChange={(event) => setFacturaForm((prev) => ({ ...prev, forma_pago: event.target.value }))}
                                options={CFDI_FORMA_PAGO}
                            />
                            <Select
                                label="Uso de CFDI *"
                                value={facturaForm.uso_cfdi}
                                onChange={(event) => setFacturaForm((prev) => ({ ...prev, uso_cfdi: event.target.value }))}
                                options={CFDI_USO}
                            />
                            <Select
                                label="Regimen Fiscal *"
                                value={facturaForm.regimen_fiscal}
                                onChange={(event) => setFacturaForm((prev) => ({ ...prev, regimen_fiscal: event.target.value }))}
                                options={CFDI_REGIMEN}
                                className="md:col-span-2"
                            />
                            <div className="md:col-span-2">
                                <label className="text-sm text-muted block mb-1">Observaciones (opcional)</label>
                                <textarea
                                    rows={4}
                                    value={facturaForm.observaciones}
                                    onChange={(event) => setFacturaForm((prev) => ({ ...prev, observaciones: event.target.value }))}
                                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                                    placeholder="Observaciones (opcional)"
                                />
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setFacturaModalOpen(false)}>Cerrar</Button>
                            <Button variant="primary" onClick={() => {
                                setFacturaModalOpen(false);
                                window.alert("Flujo CFDI preparado en interfaz. Falta conectar timbrado/facturacion en backend.");
                            }}>
                                Continuar
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
