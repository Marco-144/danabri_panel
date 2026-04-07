"use client";

import { useCallback, useEffect, useState } from "react";
import PageTitle from "@/components/ui/PageTitle";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { getVentas } from "@/services/ventasService";

export default function VentasPage() {
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
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div className="space-y-4">
            <PageTitle title="Ventas" subtitle="Consulta de ventas registradas" />

            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

            <div className="flex gap-2 items-end">
                <Input label="Buscar" placeholder="Folio, usuario o metodo de pago" value={search} onChange={(e) => setSearch(e.target.value)} />
                <Button onClick={load}>Consultar</Button>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">Folio</th>
                            <th className="text-left p-3">Usuario</th>
                            <th className="text-left p-3">Metodo</th>
                            <th className="text-left p-3">Estado</th>
                            <th className="text-right p-3">Total</th>
                            <th className="text-left p-3">Fecha</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="p-6 text-center text-muted">Cargando...</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={6} className="p-6 text-center text-muted">Sin ventas</td></tr>
                        ) : rows.map((r) => (
                            <tr key={r.id_venta} className="border-t border-border hover:bg-background/50">
                                <td className="p-3">{r.folio}</td>
                                <td className="p-3">{r.usuario_nombre}</td>
                                <td className="p-3">{r.metodo_pago}</td>
                                <td className="p-3">{r.estado}</td>
                                <td className="p-3 text-right">${Number(r.total || 0).toFixed(2)}</td>
                                <td className="p-3">{new Date(r.created_at).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
