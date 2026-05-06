"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Select from "react-select";
import { Eye, Funnel, Loader, Plus, X, AlertCircle, Wallet, CircleDollarSign, Search } from "lucide-react";
import StatKpiCard from "@/components/ui/StatKpiCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { FilterPopover, FilterChip } from "@/components/ui/FilterPopover";
import PageTitle from "@/components/ui/PageTitle";
import { deleteAbonoCliente, getAbonosClientes, registrarAbonoCliente } from "@/services/abonosClientesService";
import { getRemisionesClientes } from "@/services/remisionesClientesService";

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fmtDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("es-MX");
}

function addDays(dateStr, days) {
    const d = new Date(dateStr + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split("T")[0];
}

export default function AbonosClientesPage() {
    const searchParams = useSearchParams();
    const remisionFromQuery = searchParams.get("id_remision") || "";

    const [abonos, setAbonos] = useState([]);
    const [remisiones, setRemisiones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [filters, setFilters] = useState({ id_remision: remisionFromQuery, metodo_pago: "", desde: "", hasta: "" });

    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({
        id_remision: remisionFromQuery,
        fecha_pago: new Date().toISOString().slice(0, 10),
        monto: "",
        metodo_pago: "transferencia",
    });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [abonosData, remisionesData] = await Promise.all([
                getAbonosClientes({ search, id_remision: filters.id_remision }),
                getRemisionesClientes(),
            ]);
            setAbonos(Array.isArray(abonosData) ? abonosData : []);
            setRemisiones(Array.isArray(remisionesData) ? remisionesData : []);
            setError("");
        } catch (e) {
            setError(e.message || "No se pudo cargar abonos de clientes");
        } finally {
            setLoading(false);
        }
    }, [search, filters.id_remision]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const remisionesPendientes = useMemo(() => remisiones.filter((r) => Number(r.saldo_pendiente || 0) > 0), [remisiones]);
    const remisionSelectOptions = useMemo(() => remisionesPendientes.map((r) => ({
        value: String(r.id_remision),
        label: `${r.folio} - ${r.cliente_nombre} (Saldo ${fmtMoney(r.saldo_pendiente)})`,
    })), [remisionesPendientes]);
    const remisionSelectOptionsFolio = useMemo(() => remisionesPendientes.map((r) => ({
        value: String(r.folio),
        label: `${r.folio} - ${r.cliente_nombre}`,
    })), [remisionesPendientes]);

    const filteredAbonos = useMemo(() => {
        return abonos.filter((row) => {
            const byMetodo = !filters.metodo_pago || String(row.metodo_pago || "") === filters.metodo_pago;
            const rowDate = String(row.fecha_pago || "").slice(0, 10);
            const byDesde = !filters.desde || (rowDate && rowDate >= filters.desde);
            const byHasta = !filters.hasta || (rowDate && rowDate <= filters.hasta);
            return byMetodo && byDesde && byHasta;
        });
    }, [abonos, filters]);

    const selectedRemision = useMemo(
        () => remisiones.find((r) => String(r.id_remision) === String(form.id_remision)),
        [remisiones, form.id_remision]
    );

    const selectedRemisionOption = useMemo(
        () => remisionSelectOptions.find((option) => String(option.value) === String(form.id_remision)) || null,
        [remisionSelectOptions, form.id_remision]
    );

    const selectedRemisionOptionFolio = useMemo(
        () => { remisionSelectOptionsFolio.find((option) => String(option.value) === String(form.id_remision)) || null },
        [remisionSelectOptionsFolio, form.id_remision]
    )

    function handleOpenModal() {
        setError("");
        setForm((prev) => ({ ...prev, id_remision: filters.id_remision || remisionFromQuery || prev.id_remision || "" }));
        setModalOpen(true);
    }

    async function handleRegistrarAbono(event) {
        event.preventDefault();

        if (!form.id_remision) {
            setError("Selecciona una remision para abonar");
            return;
        }

        const montoNum = Number(form.monto || 0);
        if (!montoNum || montoNum <= 0) {
            setError("Ingresa un monto valido");
            return;
        }

        const rem = selectedRemision;
        if (!rem) {
            setError("La remision seleccionada no esta disponible");
            return;
        }

        if (montoNum > Number(rem.saldo_pendiente || 0)) {
            setError(`El monto no puede ser mayor al saldo pendiente (${fmtMoney(rem.saldo_pendiente)})`);
            return;
        }

        // Validar crédito
        if (rem.cliente_credito_habilitado && rem.cliente_dias_credito) {
            const remisionDate = String(rem.created_at || "").split(" ")[0];
            const creditDueDate = addDays(remisionDate, rem.cliente_dias_credito);
            if (form.fecha_pago < creditDueDate) {
                setError(`El crédito vence el ${fmtDate(creditDueDate)}. No puedes abonar antes de esa fecha.`);
                return;
            }
        }

        try {
            setSaving(true);
            await registrarAbonoCliente({
                ...form,
                monto: montoNum,
            });
            setModalOpen(false);
            setForm({
                id_remision: filters.id_remision || remisionFromQuery,
                fecha_pago: new Date().toISOString().slice(0, 10),
                monto: "",
                metodo_pago: "transferencia",
            });
            await loadData();
            setError("");
        } catch (e) {
            setError(e.message || "No se pudo registrar el abono");
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteAbono(row) {
        const ok = window.confirm(`¿Eliminar abono #${row.id_pago}?`);
        if (!ok) return;

        try {
            await deleteAbonoCliente(row.id_pago);
            await loadData();
        } catch (e) {
            setError(e.message || "No se pudo eliminar el abono");
        }
    }

    return (
        <div className="space-y-5">
            <PageTitle
                title="Abonos de Clientes"
                subtitle="Cobros de remisiones con saldo, facturadas o no"
                icon={<CircleDollarSign size={20} />}
                actions={(
                    <div className="flex gap-2">
                        <Link href="/clientes/remisiones"><Button variant="outline">Ir a Remisiones</Button></Link>
                        <Button className="gap-2" onClick={handleOpenModal}><Plus size={16} />Registrar Abono</Button>
                    </div>
                )}
            />

            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

            <div className="p-4">
                <div className="flex flex-col md:flex-row gap-3 md:items-center">
                    <div className="relative inline-block w-full md:w-[420px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cliente, folio remision o metodo" inputClassName="bg-white text-primary py-2.5 pl-10 pr-4 rounded-full" />
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
                            onClear={() => setFilters({ id_remision: remisionFromQuery, metodo_pago: "", desde: "", hasta: "" })}
                        >

                            <p className="text-muted text-sm m-1">Seleccionar remisión</p>
                            <Select
                                placeholder=""
                                isSearchable={true}
                                isClearable={true}
                                value={selectedRemisionOptionFolio}
                                onChange={(option) => setForm((prev) => ({ ...prev, id_remision: option?.value || "" }))}
                                options={remisionSelectOptionsFolio}
                            />

                            <div>
                                <p className="text-xs text-muted mb-2">Metodo de pago</p>
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
                <StatKpiCard icon={<AlertCircle size={20} />} title="Remisiones con saldo" value={remisionesPendientes.length} tone={remisionesPendientes.length > 0 ? "warning" : "success"} />
                <StatKpiCard icon={<Wallet size={20} />} title="Saldo remisiones" value={fmtMoney(remisionesPendientes.reduce((acc, r) => acc + Number(r.saldo_pendiente || 0), 0))} tone="warning" />
                <StatKpiCard icon={<CircleDollarSign size={20} />} title="Abonos" value={filteredAbonos.length} tone="info" />
                <StatKpiCard icon={<Wallet size={20} />} title="Total abonos" value={fmtMoney(filteredAbonos.reduce((acc, a) => acc + Number(a.monto || 0), 0))} tone="success" />
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-x-auto">
                <table className="w-full min-w-[1180px] text-sm">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">ID</th>
                            <th className="text-left p-3">Cliente</th>
                            <th className="text-left p-3">Remision</th>
                            <th className="text-left p-3">Fecha</th>
                            <th className="text-right p-3">Monto</th>
                            <th className="text-left p-3">Metodo</th>
                            <th className="text-center p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="p-6 text-center text-muted"><Loader className="inline animate-spin" size={16} /> Cargando...</td></tr>
                        ) : filteredAbonos.length === 0 ? (
                            <tr><td colSpan={7} className="p-6 text-center text-muted">Sin abonos</td></tr>
                        ) : filteredAbonos.map((row) => (
                            <tr key={row.id_pago} className="border-t border-border hover:bg-background/50">
                                <td className="p-3">{row.id_pago}</td>
                                <td className="p-3">{row.cliente_nombre}</td>
                                <td className="p-3 font-medium text-primary">{row.folio_remision}</td>
                                <td className="p-3">{fmtDate(row.fecha_pago)}</td>
                                <td className="p-3 text-right font-semibold text-primary">{fmtMoney(row.monto)}</td>
                                <td className="p-3">{row.metodo_pago || "-"}</td>
                                <td className="p-3">
                                    <div className="flex justify-center gap-1">
                                        <Link href={`/clientes/remisiones?mode=view&id=${row.id_remision}`}>
                                            <Button variant="lightghost" className="p-1.5 h-auto" title="Ver remision"><Eye size={16} /></Button>
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

            {modalOpen ? (
                <div className="fixed inset-0 bg-primary/40 z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleRegistrarAbono} className="bg-white w-full max-w-lg rounded-2xl border border-border shadow-card p-5 space-y-4">
                        <h3 className="text-lg font-semibold text-primary">Registrar abono</h3>

                        <p className="text-muted text-sm m-1">Seleccionar remisión</p>
                        <Select
                            placeholder=""
                            isSearchable={true}
                            isClearable={true}
                            value={selectedRemisionOption}
                            onChange={(option) => setForm((prev) => ({ ...prev, id_remision: option?.value || "" }))}
                            options={remisionSelectOptions}
                        />

                        {selectedRemision ? (
                            <div className="space-y-2">
                                <div className="text-xs rounded-lg bg-blue-50 text-blue-900 px-3 py-2">
                                    Total: {fmtMoney(selectedRemision.total)} | Saldo: {fmtMoney(selectedRemision.saldo_pendiente)} | Estado: {selectedRemision.estado || "pendiente"} | Facturada: {selectedRemision.facturado ? "Sí" : "No"}
                                </div>
                                {selectedRemision.cliente_credito_habilitado && selectedRemision.cliente_dias_credito ? (
                                    <div className="text-xs rounded-lg bg-yellow-50 text-yellow-900 px-3 py-2 flex items-start gap-2">
                                        <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-medium">Crédito: {selectedRemision.cliente_dias_credito} días</p>
                                            <p className="text-xs mt-1">Remisión: {fmtDate(selectedRemision.created_at.split(" ")[0])}</p>
                                            <p className="text-xs">Vence: {fmtDate(addDays(selectedRemision.created_at.split(" ")[0], selectedRemision.cliente_dias_credito))}</p>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        <Input label="Fecha pago *" type="date" value={form.fecha_pago} onChange={(e) => setForm((prev) => ({ ...prev, fecha_pago: e.target.value }))} />
                        <Input label="Monto *" type="number" step="0.01" min="0.01" max={Number(selectedRemision?.saldo_pendiente || 0)} value={form.monto} onChange={(e) => setForm((prev) => ({ ...prev, monto: e.target.value }))} />

                        <div>
                            <label className="text-sm text-muted block mb-1">Metodo pago</label>
                            <select
                                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm"
                                value={form.metodo_pago}
                                onChange={(e) => setForm((prev) => ({ ...prev, metodo_pago: e.target.value }))}
                            >
                                <option value="transferencia">Transferencia</option>
                                <option value="efectivo">Efectivo</option>
                                <option value="cheque">Cheque</option>
                                <option value="tarjeta">Tarjeta</option>
                                <option value="credito">Credito</option>
                            </select>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar abono"}</Button>
                        </div>
                    </form>
                </div>
            ) : null}
        </div>
    );
}
