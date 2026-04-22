"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, Loader, Printer, ShoppingCart } from "lucide-react";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import { getVentaTicketById } from "@/services/ventasService";

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fmtTicketDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function VentaDetalleView({ id }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [venta, setVenta] = useState(null);

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                setVenta(await getVentaTicketById(id));
                setError("");
            } catch (e) {
                setError(e.message || "No se pudo cargar la venta");
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [id]);

    function handlePrint() {
        window.print();
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader className="animate-spin text-primary" /></div>;
    }

    if (error) {
        return <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>;
    }

    if (!venta) {
        return <div className="text-sm text-muted">Venta no encontrada</div>;
    }

    return (
        <div className="space-y-5">
            <PageTitle
                title={`Venta ${venta.folio}`}
                subtitle="Consulta y reimpresión del ticket POS"
                icon={<ShoppingCart size={22} />}
                actions={
                    <div className="flex gap-2">
                        <Link href="/ventas">
                            <Button variant="outline" className="gap-2"><ChevronLeft size={16} /> Volver</Button>
                        </Link>
                        <Button variant="outline" className="gap-2" onClick={handlePrint}><Printer size={16} /> Reimprimir ticket</Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <Field label="Almacén" value={venta.almacen_nombre || "-"} />
                <Field label="Usuario" value={venta.usuario_nombre || "-"} />
                <Field label="Método" value={venta.metodo_pago || "-"} />
                <Field label="Estado" value={venta.estado || "-"} />
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">Producto</th>
                            <th className="text-left p-3">Presentación</th>
                            <th className="text-left p-3">Código</th>
                            <th className="text-right p-3">Cantidad</th>
                            <th className="text-right p-3">Precio</th>
                            <th className="text-right p-3">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(venta.detalles || []).length === 0 ? (
                            <tr><td colSpan={6} className="p-6 text-center text-muted">Sin partidas</td></tr>
                        ) : venta.detalles.map((item) => (
                            <tr key={item.id_detalleVenta} className="border-t border-border hover:bg-background/40">
                                <td className="p-3">{item.producto_nombre}</td>
                                <td className="p-3">{item.presentacion_nombre}</td>
                                <td className="p-3">{item.codigo_barras || "-"}</td>
                                <td className="p-3 text-right">{item.cantidad}</td>
                                <td className="p-3 text-right">{fmtMoney(item.precio_unitario)}</td>
                                <td className="p-3 text-right font-semibold text-primary">{fmtMoney(item.subtotal)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end">
                <div className="bg-white rounded-2xl shadow-card border border-border px-5 py-4 w-full max-w-sm flex items-center justify-between">
                    <span className="text-muted">Total</span>
                    <span className="text-xl font-semibold text-primary">{fmtMoney(venta.total)}</span>
                </div>
            </div>

            <section className="print-ticket-wrap bg-[#f3f4f6] rounded-3xl border border-border p-4 md:p-6 max-w-xl mx-auto">
                <div className="text-center mb-5 print-ticket-header">
                    <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Check size={34} className="text-emerald-600" strokeWidth={2.5} />
                    </div>
                    <p className="font-bold text-[34px] leading-tight text-slate-800 mt-3">Venta completada!</p>
                    <p className="text-sm text-slate-500 tracking-wide mt-1">{fmtTicketDate(venta.created_at)}</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 print-ticket-card">
                    <div className="text-center space-y-1 border-b border-dashed border-slate-200 pb-3">
                        <p className="font-bold text-xl text-slate-800">PAPELERA DANABRI</p>
                        <p className="text-sm text-slate-500">{venta.almacen_nombre || "Sucursal Centro"}</p>
                        <p className="font-semibold text-sm text-orange-600">Folio: {venta.folio}</p>
                    </div>

                    <div className="py-3 border-b border-dashed border-slate-200 text-sm">
                        <p><span className="text-slate-500">Cliente:</span> {venta.cliente_nombre || "Publico general"}</p>
                    </div>

                    <div className="py-3 space-y-2 border-b border-dashed border-slate-200">
                        {(venta.detalles || []).map((item) => (
                            <div key={item.id_detalleVenta} className="grid grid-cols-[1fr_auto_auto] gap-3 text-sm items-center">
                                <p className="truncate">{item.producto_nombre}</p>
                                <p className="text-slate-500">x{item.cantidad}</p>
                                <p className="font-medium">{fmtMoney(item.subtotal)}</p>
                            </div>
                        ))}
                    </div>

                    <div className="py-3 border-b border-dashed border-slate-200 space-y-1">
                        <TicketRow label="Subtotal" value={fmtMoney(venta.subtotal)} />
                        <TicketRow label="IVA" value={fmtMoney(venta.iva)} />
                        <div className="flex items-center justify-between text-2xl font-bold mt-1">
                            <span className="text-slate-800">TOTAL</span>
                            <span className="text-orange-600">{fmtMoney(venta.total)}</span>
                        </div>
                    </div>

                    <div className="py-3 border-b border-dashed border-slate-200 space-y-1">
                        <TicketRow label="Metodo" value={venta.ticket?.metodo_pago || venta.metodo_pago || "-"} />
                        <TicketRow label="Pago" value={fmtMoney(venta.ticket?.pago)} />
                        <TicketRow label="Cambio" value={fmtMoney(venta.ticket?.cambio)} />
                    </div>

                    <p className="text-center text-sm text-slate-500 mt-3">Gracias por su compra!</p>
                </div>

                <div className="ticket-actions mt-4 grid grid-cols-2 gap-3 print-hidden-actions">
                    <Button variant="outline" className="gap-2 justify-center" onClick={handlePrint}>
                        <Printer size={16} /> Imprimir
                    </Button>
                    <Link href="/ventas" className="block">
                        <Button className="w-full justify-center">Volver al historial</Button>
                    </Link>
                </div>
            </section>

            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }

                    .print-ticket-wrap,
                    .print-ticket-wrap * {
                        visibility: visible;
                    }

                    .print-ticket-wrap {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        max-width: 380px;
                        margin: 0 auto;
                        background: #ffffff !important;
                        padding: 0 !important;
                        border: 0 !important;
                        box-shadow: none !important;
                    }

                    .print-ticket-header {
                        display: none !important;
                    }

                    .print-hidden-actions {
                        display: none !important;
                    }

                    .print-ticket-card {
                        border: 0 !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                    }
                }
            `}</style>
        </div>
    );
}

function TicketRow({ label, value }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-muted">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}

function Field({ label, value }) {
    return (
        <div className="bg-white rounded-2xl shadow-card border border-border p-4">
            <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
            <p className="text-sm font-semibold text-primary mt-1">{value}</p>
        </div>
    );
}