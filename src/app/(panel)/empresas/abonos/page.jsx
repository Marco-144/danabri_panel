"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Eye, Loader, Plus, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PageTitle from "@/components/ui/PageTitle";
import { getAuthToken, getAuthUserFromToken, isTokenExpired } from "@/services/auth";
import { deleteAbonoEmpresa, getAbonosEmpresas, registrarAbonoEmpresa } from "@/services/abonosEmpresasService";
import { getRemisionesEmpresas } from "@/services/remisionesEmpresasService";

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fmtDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("es-MX");
}

function getDias(fecha) {
    if (!fecha) return null;
    const hoy = new Date();
    const lim = new Date(fecha);
    const ms = lim.setHours(0, 0, 0, 0) - hoy.setHours(0, 0, 0, 0);
    return Math.round(ms / 86400000);
}

export default function AbonosEmpresasPage() {
    const searchParams = useSearchParams();
    const remisionFromQuery = searchParams.get("id_remision_empresa") || "";

    const [abonos, setAbonos] = useState([]);
    const [remisiones, setRemisiones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [idRemisionFilter, setIdRemisionFilter] = useState(remisionFromQuery);

    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({
        id_remision_empresa: remisionFromQuery,
        fecha_abono: new Date().toISOString().slice(0, 10),
        monto: "",
        metodo_pago: "transferencia",
        referencia_pago: "",
        observaciones: "",
    });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [abonosData, remisionesData] = await Promise.all([
                getAbonosEmpresas({ search, id_remision_empresa: idRemisionFilter }),
                getRemisionesEmpresas({ facturada: "1" }),
            ]);

            setAbonos(Array.isArray(abonosData) ? abonosData : []);
            setRemisiones(Array.isArray(remisionesData) ? remisionesData : []);
            setError("");
        } catch (e) {
            setError(e.message || "No se pudo cargar abonos de empresas");
        } finally {
            setLoading(false);
        }
    }, [search, idRemisionFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const remisionesPendientes = useMemo(
        () => remisiones.filter((r) => Number(r.saldo_pendiente || 0) > 0),
        [remisiones]
    );

    const selectedRemision = useMemo(
        () => remisiones.find((r) => String(r.id_remision_empresa) === String(form.id_remision_empresa)),
        [remisiones, form.id_remision_empresa]
    );

    async function handleRegistrarAbono(event) {
        event.preventDefault();

        const token = getAuthToken();
        if (!token || isTokenExpired(token)) {
            setError("Sesion expirada. Inicia sesion nuevamente");
            return;
        }

        const user = getAuthUserFromToken(token);
        const idUsuario = user?.id_usuario || user?.id;

        if (!idUsuario) {
            setError("No se pudo identificar al usuario autenticado");
            return;
        }

        try {
            setSaving(true);
            await registrarAbonoEmpresa({
                ...form,
                id_usuario: Number(idUsuario),
                monto: Number(form.monto || 0),
            });

            setModalOpen(false);
            setForm({
                id_remision_empresa: remisionFromQuery,
                fecha_abono: new Date().toISOString().slice(0, 10),
                monto: "",
                metodo_pago: "transferencia",
                referencia_pago: "",
                observaciones: "",
            });

            await loadData();
        } catch (e) {
            setError(e.message || "No se pudo registrar el abono");
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteAbono(row) {
        const ok = window.confirm(`¿Eliminar abono #${row.id_abono_remision_empresa}?`);
        if (!ok) return;

        try {
            await deleteAbonoEmpresa(row.id_abono_remision_empresa);
            await loadData();
        } catch (e) {
            setError(e.message || "No se pudo eliminar el abono");
        }
    }

    return (
        <div className="space-y-5">
            <PageTitle
                title="Abonos de Empresas"
                subtitle="Pagos parciales/totales por remision facturada"
                actions={(
                    <div className="flex gap-2">
                        <Link href="/empresas/remisiones">
                            <Button variant="outline">Ir a Remisiones</Button>
                        </Link>
                        <Button className="gap-2" onClick={() => setModalOpen(true)}>
                            <Plus size={16} /> Registrar Abono
                        </Button>
                    </div>
                )}
            />

            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

            <div className="p-4 bg-white rounded-2xl border border-border shadow-card flex flex-col lg:flex-row gap-3 lg:items-end">
                <Input
                    label="Buscar"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Empresa, folio remision/factura, referencia"
                    className="w-full lg:max-w-[420px]"
                />

                <Select
                    label="Remision"
                    value={idRemisionFilter}
                    onChange={(e) => setIdRemisionFilter(e.target.value)}
                    options={[
                        { value: "", label: "Todas" },
                        ...remisiones.map((r) => ({
                            value: String(r.id_remision_empresa),
                            label: `${r.folio_remision} - ${r.empresa_nombre}`,
                        })),
                    ]}
                />

                <Button onClick={loadData}>Filtrar</Button>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-x-auto">
                <table className="w-full min-w-[1280px] text-sm">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">ID</th>
                            <th className="text-left p-3">Empresa</th>
                            <th className="text-left p-3">Remision</th>
                            <th className="text-left p-3">Factura</th>
                            <th className="text-left p-3">Fecha abono</th>
                            <th className="text-right p-3">Monto</th>
                            <th className="text-left p-3">Metodo</th>
                            <th className="text-left p-3">Referencia</th>
                            <th className="text-center p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={9} className="p-6 text-center text-muted"><Loader className="inline animate-spin" size={16} /> Cargando...</td></tr>
                        ) : abonos.length === 0 ? (
                            <tr><td colSpan={9} className="p-6 text-center text-muted">Sin abonos</td></tr>
                        ) : abonos.map((row) => (
                            <tr key={row.id_abono_remision_empresa} className="border-t border-border hover:bg-background/50">
                                <td className="p-3">{row.id_abono_remision_empresa}</td>
                                <td className="p-3">{row.empresa_nombre}</td>
                                <td className="p-3 font-medium text-primary">{row.folio_remision}</td>
                                <td className="p-3">{row.folio_factura || "-"}</td>
                                <td className="p-3">{fmtDate(row.fecha_abono)}</td>
                                <td className="p-3 text-right font-semibold text-primary">{fmtMoney(row.monto)}</td>
                                <td className="p-3">{row.metodo_pago || "-"}</td>
                                <td className="p-3">{row.referencia_pago || "-"}</td>
                                <td className="p-3">
                                    <div className="flex justify-center gap-1">
                                        <Link href={`/empresas/remisiones?mode=view&id=${row.id_remision_empresa}`}>
                                            <Button variant="lightghost" className="p-1.5 h-auto" title="Ver remision">
                                                <Eye size={16} />
                                            </Button>
                                        </Link>
                                        <Button variant="lightghost" className="p-1.5 h-auto text-red-600" title="Eliminar abono" onClick={() => handleDeleteAbono(row)}>
                                            <X size={16} />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-card p-4 text-sm text-muted">
                Remisiones facturadas con saldo pendiente: <strong className="text-primary">{remisionesPendientes.length}</strong>
            </div>

            {modalOpen ? (
                <div className="fixed inset-0 bg-primary/40 z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleRegistrarAbono} className="bg-white w-full max-w-lg rounded-2xl border border-border shadow-card p-5 space-y-4">
                        <h3 className="text-lg font-semibold text-primary">Registrar abono</h3>

                        <Select
                            label="Remision facturada *"
                            value={form.id_remision_empresa}
                            onChange={(e) => setForm((prev) => ({ ...prev, id_remision_empresa: e.target.value }))}
                            options={[
                                { value: "", label: "Selecciona remision" },
                                ...remisionesPendientes.map((r) => ({
                                    value: String(r.id_remision_empresa),
                                    label: `${r.folio_remision} - ${r.empresa_nombre} (Saldo ${fmtMoney(r.saldo_pendiente)})`,
                                })),
                            ]}
                        />

                        {selectedRemision ? (
                            <div className="text-xs rounded-lg bg-blue-50 text-blue-900 px-3 py-2">
                                Factura: {selectedRemision.folio_factura || "-"} | Total: {fmtMoney(selectedRemision.total_con_iva)} | Saldo: {fmtMoney(selectedRemision.saldo_pendiente)}
                            </div>
                        ) : null}

                        <Input
                            label="Fecha abono *"
                            type="date"
                            value={form.fecha_abono}
                            onChange={(e) => setForm((prev) => ({ ...prev, fecha_abono: e.target.value }))}
                        />

                        <Input
                            label="Monto *"
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={Number(selectedRemision?.saldo_pendiente || 0)}
                            value={form.monto}
                            onChange={(e) => setForm((prev) => ({ ...prev, monto: e.target.value }))}
                        />

                        <Select
                            label="Metodo pago"
                            value={form.metodo_pago}
                            onChange={(e) => setForm((prev) => ({ ...prev, metodo_pago: e.target.value }))}
                            options={[
                                { value: "transferencia", label: "Transferencia" },
                                { value: "efectivo", label: "Efectivo" },
                                { value: "cheque", label: "Cheque" },
                                { value: "tarjeta", label: "Tarjeta" },
                                { value: "otro", label: "Otro" },
                            ]}
                        />

                        <Input
                            label="Referencia"
                            value={form.referencia_pago}
                            onChange={(e) => setForm((prev) => ({ ...prev, referencia_pago: e.target.value }))}
                        />

                        <div>
                            <label className="text-sm text-muted block mb-1">Observaciones</label>
                            <textarea
                                rows={3}
                                value={form.observaciones}
                                onChange={(e) => setForm((prev) => ({ ...prev, observaciones: e.target.value }))}
                                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Aplicar Abono"}</Button>
                        </div>
                    </form>
                </div>
            ) : null}
        </div>
    );
}
