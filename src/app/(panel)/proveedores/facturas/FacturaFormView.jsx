"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader, Package, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PageTitle from "@/components/ui/PageTitle";
import { createFactura, uploadArchivoFactura } from "@/services/facturasProveedorService";
import { getOrdenCompraById, getOrdenesCompra } from "@/services/ordenesCompraService";

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

function addDays(baseDate, days) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

export default function FacturaFormView({ idOrdenCompra = "" }) {
    const router = useRouter();
    const [loadingInit, setLoadingInit] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [ordenes, setOrdenes] = useState([]);
    const [selectedOrderId, setSelectedOrderId] = useState(String(idOrdenCompra || ""));
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [partidas, setPartidas] = useState([]);
    const [form, setForm] = useState({
        folio_factura: "",
        fecha_factura: today(),
        fecha_vencimiento: addDays(today(), 30),
        descuento: "0",
        observaciones: "",
        archivo_pdf: null,
        archivo_xml: null,
    });

    useEffect(() => {
        async function init() {
            try {
                setLoadingInit(true);
                const data = await getOrdenesCompra();
                const ordenesDisponibles = (Array.isArray(data) ? data : []).filter((o) => o.status === "pendiente" || o.status === "parcial");
                setOrdenes(ordenesDisponibles);
                setError("");
            } catch (err) {
                setError(err.message || "No se pudieron cargar las ordenes");
            } finally {
                setLoadingInit(false);
            }
        }

        init();
    }, []);

    useEffect(() => {
        if (!selectedOrderId) {
            setSelectedOrder(null);
            setPartidas([]);
            return;
        }

        async function loadOrder() {
            try {
                const orden = await getOrdenCompraById(selectedOrderId);
                setSelectedOrder(orden);
                setPartidas(
                    (orden.detalles || []).map((d) => ({
                        id_presentacion: d.id_presentacion,
                        nombre: d.presentacion_nombre,
                        producto_nombre: d.producto_nombre,
                        codigo_barras: d.codigo_barras,
                        cantidad_recibida: Number(d.cantidad || 1),
                        costo_unitario_sin_iva: Number(d.costo_unitario || 0),
                    }))
                );
                setForm((prev) => ({
                    ...prev,
                    fecha_factura: orden.fecha || today(),
                    fecha_vencimiento: addDays(orden.fecha || today(), 30),
                    observaciones: orden.notas || "",
                }));
                setError("");
            } catch (err) {
                setError(err.message || "No se pudo cargar la orden seleccionada");
            }
        }

        loadOrder();
    }, [selectedOrderId]);

    const subtotal = useMemo(
        () => partidas.reduce((acc, p) => acc + Number(p.cantidad_recibida || 0) * Number(p.costo_unitario_sin_iva || 0), 0),
        [partidas]
    );

    const descuento = Number(form.descuento || 0);
    const subtotalConDesc = Math.max(0, subtotal - descuento);
    const iva = Math.round(subtotalConDesc * 0.16 * 100) / 100;
    const total = Math.round((subtotalConDesc + iva) * 100) / 100;

    function updatePartida(idx, field, value) {
        setPartidas((prev) => prev.map((item, i) => {
            if (i !== idx) return item;
            if (field === "cantidad_recibida") {
                const n = Number(value);
                if (!Number.isInteger(n) || n < 1) return item;
                return { ...item, cantidad_recibida: n };
            }
            if (field === "costo_unitario_sin_iva") {
                const n = Number(value);
                if (Number.isNaN(n) || n < 0) return item;
                return { ...item, costo_unitario_sin_iva: n };
            }
            return item;
        }));
    }

    function removePartida(idx) {
        setPartidas((prev) => prev.filter((_, i) => i !== idx));
    }

    async function handleSave(e) {
        e.preventDefault();

        if (!selectedOrderId) {
            setError("Selecciona una orden de compra");
            return;
        }
        if (!form.folio_factura.trim()) {
            setError("Ingresa el folio de la factura");
            return;
        }
        if (!form.fecha_factura) {
            setError("Ingresa la fecha de factura");
            return;
        }
        if (!form.fecha_vencimiento) {
            setError("Ingresa la fecha de vencimiento");
            return;
        }
        if (partidas.length === 0) {
            setError("La factura debe tener al menos una partida");
            return;
        }
        if (!form.archivo_pdf) {
            setError("Debes subir el PDF de la factura");
            return;
        }

        try {
            setSaving(true);
            setError("");

            const pdfData = await uploadArchivoFactura(form.archivo_pdf, `factura-${selectedOrderId}`);
            let xmlData = null;
            if (form.archivo_xml) {
                xmlData = await uploadArchivoFactura(form.archivo_xml, `factura-${selectedOrderId}`);
            }

            const result = await createFactura({
                id_orden_compra: Number(selectedOrderId),
                folio_factura: form.folio_factura.trim(),
                fecha_factura: form.fecha_factura,
                fecha_vencimiento: form.fecha_vencimiento,
                descuento,
                observaciones: form.observaciones.trim(),
                archivo_url: pdfData.archivo_url,
                archivo_nombre: pdfData.archivo_nombre,
                archivo_mime: pdfData.archivo_mime,
                archivo_xml_url: xmlData?.archivo_url,
                archivo_xml_nombre: xmlData?.archivo_nombre,
                detalles: partidas.map((item) => ({
                    id_presentacion: Number(item.id_presentacion),
                    cantidad_recibida: Number(item.cantidad_recibida),
                    costo_unitario_sin_iva: Number(item.costo_unitario_sin_iva),
                })),
            });

            router.replace(`/proveedores/facturas?mode=detalle&id=${result.id_factura}`);
        } catch (err) {
            setError(err.message || "No se pudo crear la factura");
        } finally {
            setSaving(false);
        }
    }

    const ordenOptions = ordenes.map((o) => ({
        value: String(o.id_orden_compra),
        label: `${o.folio} - ${o.proveedor_nombre}`,
    }));

    if (loadingInit) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <PageTitle
                title="Nueva Factura de Proveedor"
                subtitle="Selecciona una orden y ajusta sus productos antes de guardar"
                actions={(
                    <Link href="/proveedores/facturas">
                        <Button variant="outline" className="gap-2">
                            <ChevronLeft size={16} /> Volver
                        </Button>
                    </Link>
                )}
            />

            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

            <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.6fr] gap-5 items-start">
                    <div className="space-y-5 min-w-0">
                        <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
                            <h2 className="text-base font-semibold text-primary">Seleccionar Orden de Compra</h2>
                            <Select
                                label="Orden de compra *"
                                value={selectedOrderId}
                                onChange={(e) => setSelectedOrderId(e.target.value)}
                                options={ordenOptions}
                                placeholder="Seleccionar orden"
                            />

                            {selectedOrder ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    <div className="rounded-xl border border-border bg-background/60 p-4">
                                        <p className="text-xs text-muted">Proveedor</p>
                                        <p className="font-medium text-primary">{selectedOrder.proveedor_nombre}</p>
                                    </div>
                                    <div className="rounded-xl border border-border bg-background/60 p-4">
                                        <p className="text-xs text-muted">Almacén</p>
                                        <p className="font-medium text-primary">{selectedOrder.almacen_nombre || "-"}</p>
                                    </div>
                                    <div className="rounded-xl border border-border bg-background/60 p-4">
                                        <p className="text-xs text-muted">Orden</p>
                                        <p className="font-medium text-primary">{selectedOrder.folio}</p>
                                    </div>
                                    <div className="rounded-xl border border-border bg-background/60 p-4">
                                        <p className="text-xs text-muted">Fecha Orden</p>
                                        <p className="font-medium text-primary">{selectedOrder.fecha}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-border bg-background/40 p-5 text-sm text-muted">
                                    Selecciona una orden para cargar sus productos y datos.
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
                            <div>
                                <h2 className="text-base font-semibold text-primary">Datos de la Factura</h2>
                                <p className="text-xs text-muted">Puedes ajustar productos antes de guardar la factura.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Folio factura proveedor *"
                                    value={form.folio_factura}
                                    onChange={(e) => setForm((prev) => ({ ...prev, folio_factura: e.target.value }))}
                                />
                                <Input
                                    label="Fecha factura *"
                                    type="date"
                                    value={form.fecha_factura}
                                    onChange={(e) => setForm((prev) => ({ ...prev, fecha_factura: e.target.value }))}
                                />
                                <Input
                                    label="Fecha vencimiento *"
                                    type="date"
                                    value={form.fecha_vencimiento}
                                    onChange={(e) => setForm((prev) => ({ ...prev, fecha_vencimiento: e.target.value }))}
                                />
                                <Input
                                    label="Descuento"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={form.descuento}
                                    onChange={(e) => setForm((prev) => ({ ...prev, descuento: e.target.value }))}
                                />
                                <div>
                                    <label className="text-sm text-muted block mb-1">PDF de factura *</label>
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={(e) => setForm((prev) => ({ ...prev, archivo_pdf: e.target.files?.[0] || null }))}
                                        className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted block mb-1">XML (opcional)</label>
                                    <input
                                        type="file"
                                        accept=".xml,application/xml,text/xml"
                                        onChange={(e) => setForm((prev) => ({ ...prev, archivo_xml: e.target.files?.[0] || null }))}
                                        className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-sm text-muted block mb-1">Observaciones</label>
                                    <textarea
                                        rows={3}
                                        value={form.observaciones}
                                        onChange={(e) => setForm((prev) => ({ ...prev, observaciones: e.target.value }))}
                                        className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
                            <div className="p-5 border-b border-border flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-base font-semibold text-primary">Productos de la Factura</h2>
                                    <p className="text-xs text-muted">Edita cantidades o costos, o elimina líneas que ya no deban facturarse.</p>
                                </div>
                                <span className="inline-flex items-center gap-2 text-xs text-muted">
                                    <Package size={14} /> {partidas.length} líneas
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[900px]">
                                    <thead className="bg-background text-primary">
                                        <tr>
                                            <th className="text-left p-3">Producto / Presentación</th>
                                            <th className="text-left p-3">Código</th>
                                            <th className="text-right p-3">Cantidad</th>
                                            <th className="text-right p-3">Costo s/IVA</th>
                                            <th className="text-right p-3">Importe</th>
                                            <th className="text-center p-3">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {partidas.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-6 text-center text-muted">No hay productos cargados.</td>
                                            </tr>
                                        ) : partidas.map((p, idx) => (
                                            <tr key={`${p.id_presentacion}-${idx}`} className="border-t border-border hover:bg-background/40">
                                                <td className="p-3">
                                                    <p className="font-medium text-primary">{p.nombre}</p>
                                                    <p className="text-xs text-muted">{p.producto_nombre || "-"}</p>
                                                </td>
                                                <td className="p-3 font-mono text-xs text-muted">{p.codigo_barras || "-"}</td>
                                                <td className="p-3 text-right">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={p.cantidad_recibida}
                                                        onChange={(e) => updatePartida(idx, "cantidad_recibida", e.target.value)}
                                                        className="w-24 rounded-lg border border-border px-2 py-1 text-sm text-right"
                                                    />
                                                </td>
                                                <td className="p-3 text-right">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step="0.01"
                                                        value={p.costo_unitario_sin_iva}
                                                        onChange={(e) => updatePartida(idx, "costo_unitario_sin_iva", e.target.value)}
                                                        className="w-28 rounded-lg border border-border px-2 py-1 text-sm text-right"
                                                    />
                                                </td>
                                                <td className="p-3 text-right font-semibold text-primary">
                                                    {fmtMoney(Number(p.cantidad_recibida || 0) * Number(p.costo_unitario_sin_iva || 0))}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => removePartida(idx)}
                                                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-sm"
                                                    >
                                                        <Trash2 size={14} /> Eliminar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="w-full xl:w-80 shrink-0 xl:sticky xl:top-6 space-y-4">
                        <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
                            <h3 className="text-base font-semibold text-primary">Resumen</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-muted">
                                    <span>Subtotal</span>
                                    <span>{fmtMoney(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-muted">
                                    <span>Descuento</span>
                                    <span>{fmtMoney(descuento)}</span>
                                </div>
                                <div className="flex justify-between text-muted">
                                    <span>IVA</span>
                                    <span>{fmtMoney(iva)}</span>
                                </div>
                                <div className="flex justify-between border-t border-border pt-2 mt-2 text-primary font-semibold text-base">
                                    <span>Total</span>
                                    <span>{fmtMoney(total)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end xl:justify-start">
                            <Link href="/proveedores/facturas">
                                <Button type="button" variant="outline">Cancelar</Button>
                            </Link>
                            <Button type="submit" variant="accent" disabled={saving} className="gap-2">
                                <Plus size={16} /> {saving ? "Guardando..." : "Guardar Factura"}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
