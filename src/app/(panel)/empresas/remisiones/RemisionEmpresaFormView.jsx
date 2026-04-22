"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageTitle from "@/components/ui/PageTitle";
import { getAuthToken, getAuthUserFromToken, isTokenExpired } from "@/services/auth";
import {
    createRemisionEmpresa,
    getRemisionEmpresaById,
    updateRemisionEmpresa,
} from "@/services/remisionesEmpresasService";
import { getCotizacionEmpresaById } from "@/services/cotizacionesEmpresasService";

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

function mapCotizacionDetalleToRemision(detalle, index) {
    return {
        uid: `${Date.now()}-${index}`,
        descripcion: detalle.descripcion_personalizada || detalle.descripcion || "",
        requerimiento: detalle.requerimiento || "",
        cantidad_sistema: Number(detalle.cantidad_sistema || detalle.cantidad_factura || detalle.cantidad || 1),
        cantidad_factura: Number(detalle.cantidad_factura || detalle.cantidad || 1),
        unidad: String(detalle.unidad || "pieza").toLowerCase(),
        precio_sin_iva: Number(detalle.precio_sin_iva || 0),
        precio_con_iva: Number(detalle.precio_con_iva || 0),
        total_sin_iva: Number(detalle.total || detalle.total_sin_iva || 0),
        total_con_iva: Number(detalle.total_con_iva || (Number(detalle.cantidad_factura || detalle.cantidad || 0) * Number(detalle.precio_con_iva || 0))),
        piso: Number(detalle.piso || 0),
        bodega: Number(detalle.bodega || 0),
    };
}

export default function RemisionEmpresaFormView({ id, idCotizacionEmpresa }) {
    const router = useRouter();
    const isEditing = Boolean(id);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [idEmpresa, setIdEmpresa] = useState("");
    const [empresaNombre, setEmpresaNombre] = useState("");
    const [empresaRfc, setEmpresaRfc] = useState("");
    const [empresaDireccion, setEmpresaDireccion] = useState("");
    const [empresaColonia, setEmpresaColonia] = useState("");
    const [empresaCiudad, setEmpresaCiudad] = useState("");
    const [empresaEstado, setEmpresaEstado] = useState("");
    const [empresaCp, setEmpresaCp] = useState("");

    const [fechaRemision, setFechaRemision] = useState(today());
    const [fechaVencimiento, setFechaVencimiento] = useState("");
    const [observaciones, setObservaciones] = useState("");
    const [lineas, setLineas] = useState([]);

    useEffect(() => {
        async function init() {
            try {
                setLoading(true);

                if (isEditing) {
                    const data = await getRemisionEmpresaById(id);
                    setIdEmpresa(String(data.id_empresa));
                    setEmpresaNombre(data.empresa_nombre_fiscal || data.empresa_nombre || "");
                    setEmpresaRfc(data.empresa_rfc || "");
                    setEmpresaDireccion(data.empresa_direccion || "");
                    setEmpresaColonia(data.empresa_colonia || "");
                    setEmpresaCiudad(data.empresa_ciudad || "");
                    setEmpresaEstado(data.empresa_estado || "");
                    setEmpresaCp(data.empresa_cp || "");
                    setFechaRemision(String(data.fecha_remision || "").slice(0, 10) || today());
                    setFechaVencimiento(String(data.fecha_vencimiento || "").slice(0, 10));
                    setObservaciones(String(data.observaciones || ""));
                    setLineas((data.detalles || []).map((line, index) => ({
                        uid: `${Date.now()}-${index}`,
                        ...line,
                    })));
                    setError("");
                    return;
                }

                if (idCotizacionEmpresa) {
                    const cot = await getCotizacionEmpresaById(idCotizacionEmpresa);
                    setIdEmpresa(String(cot.id_empresa || ""));
                    setEmpresaNombre(cot.empresa_nombre_fiscal || cot.empresa_nombre || "");
                    setEmpresaRfc(cot.empresa_rfc || "");
                    setEmpresaDireccion(cot.empresa_direccion || "");
                    setEmpresaColonia(cot.empresa_colonia || "");
                    setEmpresaCiudad(cot.empresa_ciudad || "");
                    setEmpresaEstado(cot.empresa_estado || "");
                    setEmpresaCp(cot.empresa_cp || "");
                    setFechaRemision(today());
                    setFechaVencimiento(addDays(today(), Number(cot.vigencia_dias || 5)));
                    setLineas((cot.detalles || []).map(mapCotizacionDetalleToRemision));
                }

                setError("");
            } catch (e) {
                setError(e.message || "No se pudo inicializar la remision");
            } finally {
                setLoading(false);
            }
        }

        init();
    }, [isEditing, id, idCotizacionEmpresa]);

    const totalSinIva = useMemo(() => lineas.reduce((acc, line) => acc + Number(line.total_sin_iva || 0), 0), [lineas]);
    const totalConIva = useMemo(() => lineas.reduce((acc, line) => acc + Number(line.total_con_iva || 0), 0), [lineas]);

    async function handleSubmit(event) {
        event.preventDefault();

        const token = getAuthToken();
        if (!token || isTokenExpired(token)) {
            setError("Sesion expirada. Inicia sesion nuevamente");
            return;
        }

        const authUser = getAuthUserFromToken(token);
        const idUsuario = authUser?.id_usuario || authUser?.id;

        if (!idUsuario) {
            setError("No se pudo identificar al usuario autenticado");
            return;
        }

        if (!idEmpresa) {
            setError("Falta empresa para guardar remision");
            return;
        }

        if (!lineas.length) {
            setError("La remision debe tener al menos una partida");
            return;
        }

        const payload = {
            id_cotizacion_empresa: idCotizacionEmpresa || undefined,
            id_empresa: Number(idEmpresa),
            id_usuario: Number(idUsuario),
            fecha_remision: fechaRemision,
            fecha_vencimiento: fechaVencimiento || null,
            observaciones,
            detalles: lineas.map((line) => ({
                descripcion: String(line.descripcion || "").trim(),
                requerimiento: String(line.requerimiento || "").trim(),
                cantidad_sistema: Number(line.cantidad_sistema || 1),
                cantidad_factura: Number(line.cantidad_factura || 1),
                unidad: String(line.unidad || "pieza"),
                precio_sin_iva: Number(line.precio_sin_iva || 0),
                precio_con_iva: Number(line.precio_con_iva || 0),
                piso: Number(line.piso || 0),
                bodega: Number(line.bodega || 0),
            })),
        };

        try {
            setSaving(true);
            setError("");

            if (isEditing) {
                await updateRemisionEmpresa(id, payload);
            } else {
                await createRemisionEmpresa(payload);
            }

            router.push("/empresas/remisiones");
            router.refresh();
        } catch (e) {
            setError(e.message || "No se pudo guardar la remision");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="h-64 flex items-center justify-center">
                <Loader className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <form className="space-y-5" onSubmit={handleSubmit}>
            <PageTitle
                title={isEditing ? "Editar Remision de Empresa" : "Nueva Remision de Empresa"}
                subtitle="Remision creada desde cotizacion o captura manual"
                actions={(
                    <Link href="/empresas/remisiones">
                        <Button variant="outline" className="gap-2">
                            <ChevronLeft size={16} /> Volver
                        </Button>
                    </Link>
                )}
            />

            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

            <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.6fr] gap-5">
                <div className="space-y-5">
                    <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-4">
                        <h2 className="text-base font-semibold text-primary">Datos generales</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Empresa (Fiscal)" value={empresaNombre} readOnly />
                            <Input label="RFC Empresa" value={empresaRfc} readOnly />
                            <Input label="Dirección" value={empresaDireccion} readOnly />
                            <Input label="Colonia" value={empresaColonia} readOnly />
                            <Input label="Ciudad" value={empresaCiudad} readOnly />
                            <Input label="Estado" value={empresaEstado} readOnly />
                            <Input label="Código postal" value={empresaCp} readOnly />
                            <Input label="Fecha remision *" type="date" value={fechaRemision} onChange={(e) => setFechaRemision(e.target.value)} />
                            <Input label="Fecha vencimiento" type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} />
                        </div>

                        <div>
                            <label className="text-sm text-muted block mb-1">Observaciones</label>
                            <textarea
                                rows={3}
                                value={observaciones}
                                onChange={(e) => setObservaciones(e.target.value)}
                                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
                        <h2 className="text-base font-semibold text-primary">Partidas</h2>

                        <div className="overflow-x-auto border border-border rounded-xl">
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
                                        <th className="text-right p-3">Total s/IVA</th>
                                        <th className="text-right p-3">Total c/IVA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!lineas.length ? (
                                        <tr>
                                            <td colSpan={9} className="p-6 text-center text-muted">Sin partidas</td>
                                        </tr>
                                    ) : lineas.map((line) => (
                                        <tr key={line.uid || line.id_detalle_remision_empresa} className="border-t border-border">
                                            <td className="p-3">{line.descripcion}</td>
                                            <td className="p-3">{line.requerimiento || "-"}</td>
                                            <td className="p-3 text-right">{line.cantidad_factura}</td>
                                            <td className="p-3 text-right">{line.cantidad_sistema}</td>
                                            <td className="p-3">{line.unidad}</td>
                                            <td className="p-3 text-right">{fmtMoney(line.precio_sin_iva)}</td>
                                            <td className="p-3 text-right">{fmtMoney(line.precio_con_iva)}</td>
                                            <td className="p-3 text-right">{fmtMoney(line.total_sin_iva)}</td>
                                            <td className="p-3 text-right font-semibold text-primary">{fmtMoney(line.total_con_iva)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 xl:sticky xl:top-6 h-fit">
                    <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-2">
                        <h3 className="text-base font-semibold text-primary">Resumen</h3>
                        <div className="flex justify-between text-sm text-muted">
                            <span>Total sin IVA</span>
                            <span className="font-semibold text-primary">{fmtMoney(totalSinIva)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted">
                            <span>Total con IVA</span>
                            <span className="font-semibold text-primary">{fmtMoney(totalConIva)}</span>
                        </div>
                    </div>

                    <Button type="submit" className="w-full gap-2" disabled={saving}>
                        <Save size={16} /> {saving ? "Guardando..." : "Guardar Remision"}
                    </Button>

                    <Link href="/empresas/remisiones">
                        <Button type="button" variant="outline" className="w-full">Cancelar</Button>
                    </Link>
                </div>
            </div>
        </form>
    );
}
