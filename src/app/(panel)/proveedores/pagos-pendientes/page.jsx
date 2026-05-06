"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, Download, Eye, Funnel, ShieldCheck, Wallet, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PageTitle from "@/components/ui/PageTitle";
import StatKpiCard from "@/components/ui/StatKpiCard";
import { FilterPopover } from "@/components/ui/FilterPopover";
import { cerrarFacturaInventario, getFacturasProveedor, getDownloadFacturaUrl } from "@/services/facturasProveedorService";
import { registrarPago } from "@/services/pagosFacturaService";

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fmtDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("es-MX");
}

function getDias(fechaVenc) {
    if (!fechaVenc) return null;
    const hoy = new Date();
    const lim = new Date(fechaVenc);
    const ms = lim.setHours(0, 0, 0, 0) - hoy.setHours(0, 0, 0, 0);
    return Math.round(ms / 86400000);
}

function getEstadoVencimiento(fechaVenc, estadoPago) {
    if (estadoPago === "pagada") return "Pagada";
    const dias = getDias(fechaVenc);
    if (dias === 0) return "Vence hoy";
    if (dias < 0) return `Vencida desde ${Math.abs(dias)} día(s)`;
    return `Vence en ${dias} día(s)`;
}

function cierreBadgeClass(factura) {
    if (factura.inventario_cerrado_at) return "bg-slate-100 text-slate-700";
    if (factura.estado_pago === "pagada") return "bg-emerald-100 text-emerald-700";
    return "bg-blue-100 text-blue-700";
}

export default function PagosPendientesPage() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [estado, setEstado] = useState("");
    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");
    const [closingId, setClosingId] = useState(null);
    const [filtersOpen, setFiltersOpen] = useState(false);

    const [pagoModal, setPagoModal] = useState({ open: false, factura: null });
    const [pagoForm, setPagoForm] = useState({
        fecha_pago: new Date().toISOString().slice(0, 10),
        monto: "",
        metodo_pago: "transferencia",
        referencia_pago: "",
        observaciones_pago: "",
    });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getFacturasProveedor({ search, estado, desde, hasta });
            const sorted = (Array.isArray(data) ? data : []).sort((a, b) => {
                const da = new Date(a.fecha_vencimiento).getTime();
                const db = new Date(b.fecha_vencimiento).getTime();
                return da - db;
            });
            setRows(sorted);
            setError("");
        } catch (e) {
            setError(e.message || "Error al cargar pagos pendientes");
        } finally {
            setLoading(false);
        }
    }, [search, estado, desde, hasta]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const pendientes = useMemo(() => rows.filter((r) => Number(r.saldo_pendiente || 0) > 0), [rows]);
    const listoParaCerrar = useMemo(
        () => rows.filter((r) => r.estado_pago === "pagada" && !r.inventario_cerrado_at),
        [rows]
    );
    const saldoPendienteTotal = useMemo(
        () => pendientes.reduce((acc, row) => acc + Number(row.saldo_pendiente || 0), 0),
        [pendientes]
    );

    async function onCerrarFactura(row) {
        const ok = window.confirm(`Cerrar la factura ${row.folio_factura} y agregar al inventario?`);
        if (!ok) return;

        try {
            setClosingId(row.id_factura);
            await cerrarFacturaInventario(row.id_factura);
            await loadData();
            setError("");
        } catch (e) {
            setError(e.message || "No se pudo cerrar la factura");
        } finally {
            setClosingId(null);
        }
    }

    async function onRegistrarPago(e) {
        e.preventDefault();
        if (!pagoModal.factura) return;

        try {
            setSaving(true);
            await registrarPago({
                id_factura: pagoModal.factura.id_factura,
                fecha_pago: pagoForm.fecha_pago,
                monto: Number(pagoForm.monto),
                metodo_pago: pagoForm.metodo_pago,
                referencia_pago: pagoForm.referencia_pago,
                observaciones_pago: pagoForm.observaciones_pago,
            });

            setPagoModal({ open: false, factura: null });
            setPagoForm({
                fecha_pago: new Date().toISOString().slice(0, 10),
                monto: "",
                metodo_pago: "transferencia",
                referencia_pago: "",
                observaciones_pago: "",
            });
            await loadData();
        } catch (e2) {
            setError(e2.message || "No se pudo registrar el pago");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-5">
            <PageTitle
                title="Pagos Pendientes de Proveedor"
                subtitle="Control de facturas por pagar y vencidas"
            />

            {listoParaCerrar.length > 0 ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
                    Tienes <strong>{listoParaCerrar.length}</strong> factura(s) pagadas listas para cierre de inventario.
                </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatKpiCard
                    icon={<AlertCircle size={20} />}
                    title="Facturas Pendientes"
                    value={pendientes.length}
                    tone={pendientes.length > 0 ? "warning" : "success"}
                />
                <StatKpiCard
                    icon={<Wallet size={20} />}
                    title="Saldo Pendiente"
                    value={fmtMoney(saldoPendienteTotal)}
                    tone={saldoPendienteTotal > 0 ? "warning" : "success"}
                />
                <StatKpiCard
                    icon={<ShieldCheck size={20} />}
                    title="Listas para Cierre"
                    value={listoParaCerrar.length}
                    tone={listoParaCerrar.length > 0 ? "success" : "default"}
                />
                <StatKpiCard
                    icon={<Check size={20} />}
                    title="Facturas Pagadas"
                    value={rows.filter((r) => r.estado_pago === "pagada").length}
                    tone="info"
                />
            </div>

            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

            <div className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
                <div className="relative inline-block w-full md:w-[460px]">
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Proveedor o folio factura"
                        className="w-full"
                        inputClassName="bg-white text-primary w-full py-2.5 px-4 rounded-full"
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
                            setEstado("");
                            setDesde("");
                            setHasta("");
                            setFiltersOpen(false);
                            loadData();
                        }}
                        onApply={() => {
                            setFiltersOpen(false);
                            loadData();
                        }}
                    >
                        <Select
                            label="Estado de pago"
                            value={estado}
                            onChange={(e) => setEstado(e.target.value)}
                            options={[
                                { value: "", label: "Todos" },
                                { value: "pendiente", label: "Pendiente" },
                                { value: "parcial", label: "Parcial" },
                                { value: "pagada", label: "Pagada" },
                            ]}
                            selectClassName="bg-white"
                        />
                        <Input label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
                        <Input label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
                    </FilterPopover>

                    {/* <Button onClick={loadData}>Filtrar</Button> */}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-x-auto">
                <table className="w-full min-w-[1280px] text-sm">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">ID</th>
                            <th className="text-left p-3">Proveedor</th>
                            <th className="text-left p-3">Fecha Creación</th>
                            <th className="text-left p-3">Fecha Vencimiento</th>
                            <th className="text-right p-3">Días Restantes</th>
                            <th className="text-left p-3">Estado</th>
                            <th className="text-center p-3">Pagada</th>
                            <th className="text-center p-3">Cierre</th>
                            <th className="text-right p-3">Total</th>
                            <th className="text-right p-3">Saldo</th>
                            <th className="text-left p-3">Observaciones</th>
                            <th className="text-center p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={12} className="p-6 text-center text-muted">Cargando...</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={12} className="p-6 text-center text-muted">Sin facturas</td></tr>
                        ) : rows.map((r) => {
                            const dias = getDias(r.fecha_vencimiento);
                            const pendiente = Number(r.saldo_pendiente || 0) > 0;
                            return (
                                <tr key={r.id_factura} className="border-t border-border hover:bg-background/50">
                                    <td className="p-3">{r.id_factura}</td>
                                    <td className="p-3">{r.proveedor_nombre}</td>
                                    <td className="p-3">{fmtDate(r.created_at)}</td>
                                    <td className="p-3">{fmtDate(r.fecha_vencimiento)}</td>
                                    <td className="p-3 text-right">{dias ?? "-"}</td>
                                    <td className="p-3">{getEstadoVencimiento(r.fecha_vencimiento, r.estado_pago)}</td>
                                    <td className="p-3 text-center">
                                        {r.estado_pago === "pagada" ? (
                                            <span className="inline-flex items-center justify-center text-activo"><Check size={18} /></span>
                                        ) : (
                                            <span className="inline-flex items-center justify-center text-red-600"><X size={18} /></span>
                                        )}
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cierreBadgeClass(r)}`}>
                                            {r.inventario_cerrado_at ? "Cerrada" : r.estado_pago === "pagada" ? "Listo para cerrar" : "Pendiente"}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">{fmtMoney(r.total)}</td>
                                    <td className="p-3 text-right font-semibold text-primary">{fmtMoney(r.saldo_pendiente)}</td>
                                    <td className="p-3 text-xs text-muted max-w-[240px] truncate" title={r.observaciones || ""}>{r.observaciones || "-"}</td>
                                    <td className="p-3">
                                        <div className="flex justify-center gap-1">
                                            <a href={getDownloadFacturaUrl(r.id_factura, "pdf")} target="_blank" rel="noreferrer">
                                                <Button variant="lightghost" className="p-1.5 h-auto" title="Descargar PDF">
                                                    <Download size={16} />
                                                </Button>
                                            </a>
                                            <Link href={`/proveedores/facturas?mode=detalle&id=${r.id_factura}`}>
                                                <Button variant="lightghost" className="p-1.5 h-auto" title="Ver detalle / pagos">
                                                    <Eye size={16} className="text-primary" />
                                                </Button>
                                            </Link>
                                            {r.id_orden_compra ? (
                                                <Link href={`/proveedores/ordenes?mode=view&id=${r.id_orden_compra}`}>
                                                    <Button variant="lightghost" className="p-1.5 h-auto border border-gray-300" title="Ver orden de compra">
                                                        OC
                                                    </Button>
                                                </Link>
                                            ) : null}
                                            {r.estado_pago === "pagada" && !r.inventario_cerrado_at ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1 bg-green-300 text-mist-100 hover:bg-green-400 border-gray-400"
                                                    onClick={() => onCerrarFactura(r)}
                                                    disabled={closingId === r.id_factura}
                                                >
                                                    <ShieldCheck size={14} /> {closingId === r.id_factura ? "Cerrando..." : "Cerrar"}
                                                </Button>
                                            ) : null}
                                            {pendiente && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setPagoModal({ open: true, factura: r });
                                                        setPagoForm((p) => ({ ...p, monto: String(r.saldo_pendiente || "") }));
                                                    }}
                                                >
                                                    Pago
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {pagoModal.open && (
                <div className="fixed inset-0 bg-primary/40 z-50 flex items-center justify-center p-4">
                    <form onSubmit={onRegistrarPago} className="bg-white w-full max-w-lg rounded-2xl border border-border shadow-card p-5 space-y-4">
                        <h3 className="text-lg font-semibold text-primary">Registrar pago</h3>
                        <p className="text-sm text-muted">
                            Factura #{pagoModal.factura?.id_factura} - {pagoModal.factura?.folio_factura}
                        </p>
                        <p className="text-sm text-muted">Saldo pendiente: <strong className="text-primary">{fmtMoney(pagoModal.factura?.saldo_pendiente)}</strong></p>

                        <Input
                            label="Fecha de pago *"
                            type="date"
                            value={pagoForm.fecha_pago}
                            onChange={(e) => setPagoForm((p) => ({ ...p, fecha_pago: e.target.value }))}
                        />

                        <Input
                            label="Monto *"
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={Number(pagoModal.factura?.saldo_pendiente || 0)}
                            value={pagoForm.monto}
                            onChange={(e) => setPagoForm((p) => ({ ...p, monto: e.target.value }))}
                        />

                        <Select
                            label="Metodo de pago"
                            value={pagoForm.metodo_pago}
                            onChange={(e) => setPagoForm((p) => ({ ...p, metodo_pago: e.target.value }))}
                            options={[
                                { value: "transferencia", label: "Transferencia" },
                                { value: "efectivo", label: "Efectivo" },
                                { value: "cheque", label: "Cheque" },
                                { value: "otro", label: "Otro" },
                            ]}
                        />

                        <Input
                            label="Referencia"
                            value={pagoForm.referencia_pago}
                            onChange={(e) => setPagoForm((p) => ({ ...p, referencia_pago: e.target.value }))}
                        />

                        <div>
                            <label className="text-sm text-muted block mb-1">Observaciones</label>
                            <textarea
                                rows={3}
                                value={pagoForm.observaciones_pago}
                                onChange={(e) => setPagoForm((p) => ({ ...p, observaciones_pago: e.target.value }))}
                                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setPagoModal({ open: false, factura: null })}>Cancelar</Button>
                            <Button type="submit" variant="accent" disabled={saving}>{saving ? "Guardando..." : "Aplicar Pago"}</Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="text-sm text-muted">
                Facturas pendientes/parciales: <strong className="text-primary">{pendientes.length}</strong>
            </div>
        </div>
    );
}
