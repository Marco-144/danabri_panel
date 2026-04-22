"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Loader, Pencil } from "lucide-react";
import Button from "@/components/ui/Button";
import FieldCard from "@/components/ui/FieldCard";
import PageTitle from "@/components/ui/PageTitle";
import { getRemisionEmpresaById } from "@/services/remisionesEmpresasService";

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fmtDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("es-MX");
}

export default function RemisionEmpresaVerView({ id }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const result = await getRemisionEmpresaById(id);
                setData(result);
                setError("");
            } catch (e) {
                setData(null);
                setError(e.message || "No se pudo cargar la remision");
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [id]);

    const totalAbonado = useMemo(() => {
        if (!data) return 0;
        return Math.max(0, Number(data.total_con_iva || 0) - Number(data.saldo_pendiente || 0));
    }, [data]);

    if (loading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <Loader className="animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>;
    }

    if (!data) return null;

    return (
        <div className="space-y-5">
            <PageTitle
                title={`Remision ${data.folio_remision}`}
                subtitle="Detalle completo de remision a empresa"
                actions={(
                    <div className="flex gap-2">
                        <Link href="/empresas/remisiones">
                            <Button variant="outline" className="gap-2"><ChevronLeft size={16} /> Volver</Button>
                        </Link>
                        <Link href={`/empresas/remisiones?mode=edit&id=${data.id_remision_empresa}`}>
                            <Button variant="outline" className="gap-2"><Pencil size={16} /> Editar</Button>
                        </Link>
                        <Link href={`/empresas/abonos?id_remision_empresa=${data.id_remision_empresa}`}>
                            <Button>Ver Abonos</Button>
                        </Link>
                    </div>
                )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <FieldCard label="Empresa" value={data.empresa_nombre_fiscal || data.empresa_nombre} />
                <FieldCard label="RFC Empresa" value={data.empresa_rfc || "-"} />
                <FieldCard label="Dirección" value={data.empresa_direccion || "-"} />
                <FieldCard label="Colonia" value={data.empresa_colonia || "-"} />
                <FieldCard label="Ciudad" value={data.empresa_ciudad || "-"} />
                <FieldCard label="Estado" value={data.empresa_estado || "-"} />
                <FieldCard label="Código Postal" value={data.empresa_cp || "-"} />
                <FieldCard label="Fecha remision" value={fmtDate(data.fecha_remision)} />
                <FieldCard label="Fecha vencimiento" value={fmtDate(data.fecha_vencimiento)} />
                <FieldCard label="Total con IVA" value={fmtMoney(data.total_con_iva)} />
                <FieldCard label="Saldo pendiente" value={fmtMoney(data.saldo_pendiente)} />
                <FieldCard label="Abonado" value={fmtMoney(totalAbonado)} />
                <FieldCard label="Estado" value={data.estado_pago} />
                <FieldCard label="Factura" value={data.facturada ? (data.folio_factura || "Si") : "No"} />
                <FieldCard label="Fecha factura" value={fmtDate(data.fecha_factura)} />
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-card overflow-x-auto">
                <table className="w-full min-w-[1200px] text-sm">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">Descripcion</th>
                            <th className="text-left p-3">Req.</th>
                            <th className="text-right p-3">Cant. factura</th>
                            <th className="text-right p-3">Cant. sistema</th>
                            <th className="text-left p-3">Unidad</th>
                            <th className="text-right p-3">Precio s/IVA</th>
                            <th className="text-right p-3">Precio c/IVA</th>
                            <th className="text-right p-3">Total c/IVA</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data.detalles || []).length === 0 ? (
                            <tr><td colSpan={8} className="p-6 text-center text-muted">Sin partidas</td></tr>
                        ) : (data.detalles || []).map((line) => (
                            <tr key={line.id_detalle_remision_empresa} className="border-t border-border hover:bg-background/40">
                                <td className="p-3">{line.descripcion}</td>
                                <td className="p-3">{line.requerimiento || "-"}</td>
                                <td className="p-3 text-right">{line.cantidad_factura}</td>
                                <td className="p-3 text-right">{line.cantidad_sistema}</td>
                                <td className="p-3">{line.unidad}</td>
                                <td className="p-3 text-right">{fmtMoney(line.precio_sin_iva)}</td>
                                <td className="p-3 text-right">{fmtMoney(line.precio_con_iva)}</td>
                                <td className="p-3 text-right font-semibold text-primary">{fmtMoney(line.total_con_iva)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
