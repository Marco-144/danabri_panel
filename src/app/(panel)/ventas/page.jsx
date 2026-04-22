"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, Loader, Search, ShoppingCart } from "lucide-react";
import PageTitle from "@/components/ui/PageTitle";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { getVentas } from "@/services/ventasService";
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

    return (
        <div className="space-y-4">
            <PageTitle
                title="Ventas POS"
                subtitle="Consulta del historial y reimpresión de tickets"
                icon={<ShoppingCart size={22} />}
            />

            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

            <div className="flex gap-2 items-end">
                <div className="relative w-full md:w-[420px]">
                    <Search className="absolute left-3 top-1/2 translate-y-1/5 w-4 h-4 text-muted" />
                    <Input
                        label="Buscar"
                        placeholder="Folio, usuario, almacén o método de pago"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        inputClassName="pl-10"
                    />
                </div>
                <Button onClick={load}>Consultar</Button>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-x-auto">
                <table className="w-full text-sm min-w-[980px]">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">Folio</th>
                            <th className="text-left p-3">Almacén</th>
                            <th className="text-left p-3">Usuario</th>
                            <th className="text-left p-3">Método</th>
                            <th className="text-left p-3">Estado</th>
                            <th className="text-right p-3">Total</th>
                            <th className="text-left p-3">Fecha</th>
                            <th className="text-center p-3">Consultar</th>
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
                                    <div className="flex justify-center">
                                        <Link href={`/ventas?mode=view&id=${r.id_venta}`}>
                                            <Button variant="ghost" size="sm" className="gap-2"><Eye size={14} /> Ver ticket</Button>
                                        </Link>
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
