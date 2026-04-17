"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, Download, Loader, Package, Power, ShieldCheck, FileText, CalendarClock } from "lucide-react";
import Button from "@/components/ui/Button";
import FieldCard from "@/components/ui/FieldCard";
import PageTitle from "@/components/ui/PageTitle";
import { cerrarFacturaInventario, getFacturaById, getDownloadFacturaUrl } from "@/services/facturasProveedorService";

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fmtDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("es-MX");
}

function statusBadge(status) {
    if (status === "pagada") return "bg-activo/20 text-activo";
    if (status === "parcial") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-700";
}

export default function FacturaDetalleView({ id }) {
    const [factura, setFactura] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [closing, setClosing] = useState(false);

    async function loadFactura() {
        try {
            setLoading(true);
            const data = await getFacturaById(id);
            setFactura(data);
            setError("");
        } catch (err) {
            setError(err.message || "No se pudo cargar la factura");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadFactura();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    async function handleCloseFactura() {
        try {
            setClosing(true);
            await cerrarFacturaInventario(id);
            await loadFactura();
        } catch (err) {
            setError(err.message || "No se pudo cerrar la factura");
        } finally {
            setClosing(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">{error}</div>;
    }

    if (!factura) return null;

    const puedeCerrar = factura.estado_pago === "pagada" && !factura.inventario_cerrado_at;

    return (
        <div className="space-y-5">
            <PageTitle
                title={`Factura ${factura.folio_factura}`}
                subtitle="Detalle, pagos e historial de cierre de inventario"
                actions={(
                    <div className="flex flex-wrap gap-2 justify-end">
                        <a href={getDownloadFacturaUrl(factura.id_factura, "pdf")} target="_blank" rel="noreferrer">
                            <Button variant="outline" className="gap-2">
                                <Download size={16} /> PDF
                            </Button>
                        </a>
                        <Link href={`/proveedores/pagos-pendientes?id_factura=${factura.id_factura}`}>
                            <Button variant="outline" className="gap-2">
                                <CalendarClock size={16} /> Ver pagos / registrar pago
                            </Button>
                        </Link>
                        <Link href="/proveedores/facturas">
                            <Button variant="outline" className="gap-2">
                                <ChevronLeft size={16} /> Volver
                            </Button>
                        </Link>
                    </div>
                )}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <FieldCard label="Proveedor" value={factura.proveedor_nombre} />
                <FieldCard label="Almacén" value={factura.almacen_nombre} />
                <FieldCard label="Orden" value={factura.orden_folio || "Sin orden"} />
                <FieldCard label="Fecha factura" value={fmtDate(factura.fecha_factura)} />
                <FieldCard label="Fecha vencimiento" value={fmtDate(factura.fecha_vencimiento)} />
                <FieldCard label="Saldo pendiente" value={fmtMoney(factura.saldo_pendiente)} />
                <FieldCard label="Total" value={fmtMoney(factura.total)} />
                <FieldCard label="Pagado" value={fmtMoney(factura.total_pagado)} />
                <div className="bg-white rounded-2xl border border-border shadow-card p-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-muted">Estado</p>
                        <span className={`mt-1 inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(factura.estado_pago)}`}>
                            {factura.estado_pago}
                        </span>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted">Cierre inventario</p>
                        <p className="font-medium text-primary">{factura.inventario_cerrado_at ? fmtDate(factura.inventario_cerrado_at) : "Pendiente"}</p>
                    </div>
                </div>
            </div>

            {factura.observaciones ? (
                <div className="bg-white rounded-2xl border border-border shadow-card p-5">
                    <h2 className="text-base font-semibold text-primary mb-2 flex items-center gap-2"><FileText size={16} /> Observaciones</h2>
                    <p className="text-sm text-muted whitespace-pre-wrap">{factura.observaciones}</p>
                </div>
            ) : null}

            <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
                <div className="p-5 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-primary">Productos de la factura</h2>
                        <p className="text-xs text-muted">Detalle base para auditoría y cierre de inventario</p>
                    </div>
                    <span className="inline-flex items-center gap-2 text-xs text-muted"><Package size={14} /> {factura.detalles?.length || 0} líneas</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                        <thead className="bg-background text-primary">
                            <tr>
                                <th className="text-left p-3">Producto / Presentación</th>
                                <th className="text-left p-3">Código</th>
                                <th className="text-right p-3">Cantidad</th>
                                <th className="text-right p-3">Costo s/IVA</th>
                                <th className="text-right p-3">Subtotal s/IVA</th>
                                <th className="text-right p-3">Subtotal c/IVA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(factura.detalles || []).length === 0 ? (
                                <tr><td colSpan={6} className="p-6 text-center text-muted">Sin productos</td></tr>
                            ) : factura.detalles.map((d) => (
                                <tr key={d.id_detalle} className="border-t border-border hover:bg-background/40">
                                    <td className="p-3">
                                        <p className="font-medium text-primary">{d.presentacion_nombre}</p>
                                        <p className="text-xs text-muted">{d.producto_nombre}</p>
                                    </td>
                                    <td className="p-3 font-mono text-xs text-muted">{d.codigo_barras || "-"}</td>
                                    <td className="p-3 text-right">{d.cantidad_recibida}</td>
                                    <td className="p-3 text-right">{fmtMoney(d.costo_unitario_sin_iva)}</td>
                                    <td className="p-3 text-right font-medium text-primary">{fmtMoney(d.subtotal_sin_iva)}</td>
                                    <td className="p-3 text-right font-medium text-primary">{fmtMoney(d.subtotal_con_iva)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
                <div className="p-5 border-b border-border flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold text-primary">Pagos registrados</h2>
                        <p className="text-xs text-muted">Puedes seguir viendo los pagos aun cuando la factura ya esté pagada.</p>
                    </div>
                    <div className="text-sm text-muted">
                        Total pagado: <strong className="text-primary">{fmtMoney(factura.total_pagado)}</strong>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                        <thead className="bg-background text-primary">
                            <tr>
                                <th className="text-left p-3">Fecha</th>
                                <th className="text-right p-3">Monto</th>
                                <th className="text-left p-3">Método</th>
                                <th className="text-left p-3">Referencia</th>
                                <th className="text-left p-3">Observaciones</th>
                                <th className="text-left p-3">Registro</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(factura.pagos || []).length === 0 ? (
                                <tr><td colSpan={6} className="p-6 text-center text-muted">Sin pagos registrados</td></tr>
                            ) : factura.pagos.map((pago) => (
                                <tr key={pago.id_pago} className="border-t border-border hover:bg-background/40">
                                    <td className="p-3">{fmtDate(pago.fecha_pago)}</td>
                                    <td className="p-3 text-right font-medium text-primary">{fmtMoney(pago.monto)}</td>
                                    <td className="p-3 capitalize">{pago.metodo_pago || "-"}</td>
                                    <td className="p-3">{pago.referencia_pago || "-"}</td>
                                    <td className="p-3 text-muted max-w-[260px] truncate" title={pago.observaciones_pago || ""}>{pago.observaciones_pago || "-"}</td>
                                    <td className="p-3 text-xs text-muted">{fmtDate(pago.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                {puedeCerrar ? (
                    <Button variant="primary" className="gap-2" onClick={handleCloseFactura} disabled={closing}>
                        <ShieldCheck size={16} /> {closing ? "Cerrando..." : "Cerrar factura y añadir al inventario"}
                    </Button>
                ) : (
                    <Button variant="outline" className="gap-2" disabled>
                        <Power size={16} /> {factura.inventario_cerrado_at ? "Factura cerrada" : "Disponible al quedar pagada"}
                    </Button>
                )}
            </div>
        </div>
    );
}
