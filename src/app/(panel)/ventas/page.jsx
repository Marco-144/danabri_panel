"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Eye, Loader, Pencil, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import PageTitle from "@/components/ui/PageTitle";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { deleteVenta, getVentas } from "@/services/ventasService";

import VentaFormView from "./VentaFormView";
import VentaDetalleView from "./VentaDetalleView";

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

export default function VentasPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader className="animate-spin text-primary" /></div>}>
            <VentasPageContent />
        </Suspense>
    );
}

function VentasPageContent() {
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode");
    const selectedId = searchParams.get("id");

    if (mode === "add") {
        return <VentaFormView />;
    }

    if (mode === "edit" && selectedId) {
        return <VentaFormView id={selectedId} />;
    }

    if (mode === "view" && selectedId) {
        return <VentaDetalleView id={selectedId} />;
    }

    return <VentasListView />;
}

function VentasListView() {
    const [rows, setRows] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setRows(await getVentas(search));
            setError("");
        } catch (e) {
            setError(e.message || "Error al cargar ventas");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        load();
    }, [load]);

    async function handleDelete(id) {
        const ok = window.confirm("Seguro que deseas eliminar esta venta? Se regresara el stock al inventario.");
        if (!ok) return;

        try {
            await deleteVenta(id);
            await load();
        } catch (e) {
            setError(e.message || "No se pudo eliminar la venta");
        }
    }

    return (
        <div className="space-y-4">
            <PageTitle
                title="Ventas"
                subtitle="Historial de ventas realizadas"
                icon={<ShoppingCart size={22} />}
                actions={
                    <Link href="/ventas?mode=add">
                        <Button className="gap-2"><Plus size={16} /> Nueva venta</Button>
                    </Link>
                }
            />

            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

            <div className="flex gap-2 items-end">
                <div className="relative w-full md:w-[420px]">
                    <Search className="absolute left-3 top-1/2 translate-y-1/5 w-4 h-4 text-muted" />
                    <Input
                        label="Buscar"
                        placeholder="Folio, usuario, almacén o método"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        inputClassName="pl-10"
                    />
                </div>
                <Button onClick={load}>Consultar</Button>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-x-auto">
                <table className="w-full text-sm min-w-[1100px]">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">Folio</th>
                            <th className="text-left p-3">Almacén</th>
                            <th className="text-left p-3">Usuario</th>
                            <th className="text-left p-3">Método</th>
                            <th className="text-left p-3">Estado</th>
                            <th className="text-right p-3">Total</th>
                            <th className="text-left p-3">Fecha</th>
                            <th className="text-center p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} className="p-6 text-center text-muted">Cargando...</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={8} className="p-6 text-center text-muted">Sin ventas</td></tr>
                        ) : rows.map((r) => (
                            <tr key={r.id_venta} className="border-t border-border hover:bg-background/50">
                                <td className="p-3 font-medium text-primary">{r.folio}</td>
                                <td className="p-3">{r.almacen_nombre || "-"}</td>
                                <td className="p-3">{r.usuario_nombre}</td>
                                <td className="p-3 capitalize">{r.metodo_pago}</td>
                                <td className="p-3 capitalize">{r.estado}</td>
                                <td className="p-3 text-right font-semibold text-primary">{fmtMoney(r.total)}</td>
                                <td className="p-3">{new Date(r.created_at).toLocaleString("es-MX")}</td>
                                <td className="p-3">
                                    <div className="flex justify-center gap-2">
                                        <Link href={`/ventas?mode=view&id=${r.id_venta}`}>
                                            <Button variant="ghost" size="sm"><Eye size={14} /></Button>
                                        </Link>
                                        <Link href={`/ventas?mode=edit&id=${r.id_venta}`}>
                                            <Button variant="ghost" size="sm"><Pencil size={14} /></Button>
                                        </Link>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id_venta)}>
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
