"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader, Pencil, ShoppingCart, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import { deleteVenta, getVentaById } from "@/services/ventasService";

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

export default function VentaDetalleView({ id }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [venta, setVenta] = useState(null);

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                setVenta(await getVentaById(id));
                setError("");
            } catch (e) {
                setError(e.message || "No se pudo cargar la venta");
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [id]);

    async function handleDelete() {
        const ok = window.confirm("Seguro que deseas eliminar esta venta? Se regresará el stock al inventario.");
        if (!ok) return;

        try {
            await deleteVenta(id);
            router.push("/ventas");
        } catch (e) {
            setError(e.message || "No se pudo eliminar la venta");
        }
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
                subtitle="Detalle de venta y sus partidas"
                icon={<ShoppingCart size={22} />}
                actions={
                    <div className="flex gap-2">
                        <Link href="/ventas">
                            <Button variant="outline" className="gap-2"><ChevronLeft size={16} /> Volver</Button>
                        </Link>
                        <Link href={`/ventas?mode=edit&id=${venta.id_venta}`}>
                            <Button variant="outline" className="gap-2"><Pencil size={16} /> Editar</Button>
                        </Link>
                        <Button variant="outline" className="gap-2" onClick={handleDelete}><Trash2 size={16} /> Eliminar</Button>
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