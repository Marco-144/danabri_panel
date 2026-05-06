"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, Funnel, Loader, Plus, X, AlertCircle, Wallet, CircleDollarSign, Check, Search } from "lucide-react";
import StatKpiCard from "@/components/ui/StatKpiCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { FilterPopover, FilterChip } from "@/components/ui/FilterPopover";
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


export default function AbonosEmpresasPage() {
    const searchParams = useSearchParams();
    const remisionFromQuery = searchParams.get("id_remision_empresa") || "";

    const [abonos, setAbonos] = useState([]);
    const [remisiones, setRemisiones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({
        id_remision_empresa: remisionFromQuery,
        metodo_pago: "",
        desde: "",
        hasta: "",
    });
    const [filtersOpen, setFiltersOpen] = useState(false);

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
                getAbonosEmpresas({ search, id_remision_empresa: filters.id_remision_empresa }),
                getRemisionesEmpresas(),
            ]);

            setAbonos(Array.isArray(abonosData) ? abonosData : []);
            setRemisiones(Array.isArray(remisionesData) ? remisionesData : []);
            setError("");
        } catch (e) {
            setError(e.message || "No se pudo cargar abonos de empresas");
        } finally {
            setLoading(false);
        }
    }, [search, filters.id_remision_empresa]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        setForm((prev) => ({
            ...prev,
            id_remision_empresa: filters.id_remision_empresa || remisionFromQuery || prev.id_remision_empresa || "",
        }));
    }, [filters.id_remision_empresa, remisionFromQuery]);

    const remisionesPendientes = useMemo(
        () => remisiones.filter((r) => Number(r.saldo_pendiente || 0) > 0),
        [remisiones]
    );

    const remisionesConSaldoCount = useMemo(() => remisionesPendientes.length, [remisionesPendientes]);
    const totalSaldoRemisiones = useMemo(() => remisionesPendientes.reduce((acc, r) => acc + Number(r.saldo_pendiente || 0), 0), [remisionesPendientes]);
    const abonosCount = useMemo(() => abonos.length, [abonos]);
    const totalAbonos = useMemo(() => abonos.reduce((acc, a) => acc + Number(a.monto || 0), 0), [abonos]);

    const filteredAbonos = useMemo(() => {
        return abonos.filter((row) => {
            const byMetodo = !filters.metodo_pago || String(row.metodo_pago || "") === filters.metodo_pago;
            const rowDate = String(row.fecha_abono || "").slice(0, 10);
            const byDesde = !filters.desde || (rowDate && rowDate >= filters.desde);
            const byHasta = !filters.hasta || (rowDate && rowDate <= filters.hasta);
            return byMetodo && byDesde && byHasta;
        });
    }, [abonos, filters]);

    const selectedRemision = useMemo(
        () => remisiones.find((r) => String(r.id_remision_empresa) === String(form.id_remision_empresa)),
        [remisiones, form.id_remision_empresa]
    );

    function handleOpenModal() {
        setError("");
        setForm((prev) => ({
            ...prev,
            id_remision_empresa: filters.id_remision_empresa || remisionFromQuery || prev.id_remision_empresa || "",
        }));
        setModalOpen(true);
    }

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

        // client-side validations
        if (!form.id_remision_empresa) {
            setError("Selecciona una remisión para abonar");
            return;
        }

        const montoNum = Number(form.monto || 0);
        if (!montoNum || montoNum <= 0) {
            setError("Ingresa un monto válido");
            return;
        }

        const rem = selectedRemision;
        if (!rem) {
            setError("La remisión seleccionada no está disponible");
            return;
        }

        if (montoNum > Number(rem.saldo_pendiente || 0)) {
            setError(`El monto no puede ser mayor al saldo pendiente (${fmtMoney(rem.saldo_pendiente)})`);
            return;
        }

        try {
            setSaving(true);

            const resp = await registrarAbonoEmpresa({
                ...form,
                id_usuario: Number(idUsuario),
                monto: montoNum,
            });

            // close modal and reset form
            setModalOpen(false);
            setForm({
                id_remision_empresa: filters.id_remision_empresa || remisionFromQuery,
                fecha_abono: new Date().toISOString().slice(0, 10),
                monto: "",
                metodo_pago: "transferencia",
                referencia_pago: "",
                observaciones: "",
            });

            // reload lists (abonos + remisiones)
            await loadData();

            // clear previous errors
            setError("");

            // optional: if remision fully paid, show a short confirmation
            if (resp && resp.saldo_pendiente === 0) {
                // keep UI minimal; set a non-error success message in error state cleared above
            }
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
                icon={<CircleDollarSign size={20} />}
                actions={(
                    <div className="flex gap-2">
                        <Link href="/empresas/remisiones">
                            <Button variant="outline">Ir a Remisiones</Button>
                        </Link>
                        <Button
                            className="gap-2"
                            onClick={async () => {
                                try {
                                    await loadData();
                                } catch {
                                    /* ignore */
                                }
                                handleOpenModal();
                            }}
                        >
                            <Plus size={16} /> Registrar Abono
                        </Button>
                    </div>
                )}
            />

            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

            <div className="p-4">
                <div className="flex flex-col md:flex-row gap-3 md:items-center">
                    <div className="relative inline-block w-full md:w-[420px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Empresa, folio remision/factura, referencia"
                            inputClassName="bg-white text-primary py-2.5 pl-10 pr-4 rounded-full"
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
                            onApply={() => setFiltersOpen(false)}
                            onClear={() => setFilters({ id_remision_empresa: remisionFromQuery, metodo_pago: "", desde: "", hasta: "" })}
                        >
                            <Input
                                label="ID de remisión"
                                value={filters.id_remision_empresa}
                                onChange={(e) => setFilters((prev) => ({ ...prev, id_remision_empresa: e.target.value }))}
                                placeholder="ID de remisión"
                            />

                            <div>
                                <p className="text-xs text-muted mb-2">Método de pago</p>
                                <div className="flex gap-2 flex-wrap">
                                    <FilterChip active={filters.metodo_pago === ""} onClick={() => setFilters((prev) => ({ ...prev, metodo_pago: "" }))}>Todos</FilterChip>
                                    <FilterChip active={filters.metodo_pago === "transferencia"} onClick={() => setFilters((prev) => ({ ...prev, metodo_pago: "transferencia" }))}>Transferencia</FilterChip>
                                    <FilterChip active={filters.metodo_pago === "efectivo"} onClick={() => setFilters((prev) => ({ ...prev, metodo_pago: "efectivo" }))}>Efectivo</FilterChip>
                                    <FilterChip active={filters.metodo_pago === "cheque"} onClick={() => setFilters((prev) => ({ ...prev, metodo_pago: "cheque" }))}>Cheque</FilterChip>
                                    <FilterChip active={filters.metodo_pago === "tarjeta"} onClick={() => setFilters((prev) => ({ ...prev, metodo_pago: "tarjeta" }))}>Tarjeta</FilterChip>
                                </div>
                            </div>

                            <Input label="Fecha desde" type="date" value={filters.desde} onChange={(e) => setFilters((prev) => ({ ...prev, desde: e.target.value }))} />
                            <Input label="Fecha hasta" type="date" value={filters.hasta} onChange={(e) => setFilters((prev) => ({ ...prev, hasta: e.target.value }))} />
                        </FilterPopover>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatKpiCard
                    icon={<AlertCircle size={20} />}
                    title="Remisiones con saldo"
                    value={remisionesConSaldoCount}
                    tone={remisionesConSaldoCount > 0 ? "warning" : "success"}
                />
                <StatKpiCard
                    icon={<Wallet size={20} />}
                    title="Saldo Remisiones"
                    value={fmtMoney(totalSaldoRemisiones)}
                    tone={totalSaldoRemisiones > 0 ? "warning" : "success"}
                />
                <StatKpiCard
                    icon={<Check size={20} />}
                    title="Abonos registrados"
                    value={filteredAbonos.length}
                    tone={abonosCount > 0 ? "info" : "default"}
                />
                <StatKpiCard
                    icon={<Wallet size={20} />}
                    title="Total abonos"
                    value={fmtMoney(filteredAbonos.reduce((acc, a) => acc + Number(a.monto || 0), 0))}
                    tone={totalAbonos > 0 ? "success" : "default"}
                />
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
                        ) : filteredAbonos.length === 0 ? (
                            <tr><td colSpan={9} className="p-6 text-center text-muted">Sin abonos</td></tr>
                        ) : filteredAbonos.map((row) => (
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
                            label="Remision"
                            placeholder="Selecciona remision"
                            value={form.id_remision_empresa}
                            onChange={(e) => setForm((prev) => ({ ...prev, id_remision_empresa: e.target.value }))}
                            options={remisionesPendientes.map((r) => ({
                                value: String(r.id_remision_empresa),
                                label: `${r.folio_remision} - ${r.empresa_nombre} (Saldo ${fmtMoney(r.saldo_pendiente)})`,
                            }))}
                        />

                        {remisiones.length === 0 ? (
                            <div className="text-xs rounded-lg bg-amber-50 text-amber-900 px-3 py-2">
                                No hay remisiones cargadas para mostrar. Revisa que existan remisiones facturadas.
                            </div>
                        ) : null}

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
