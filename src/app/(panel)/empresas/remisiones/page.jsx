"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Download, Eye, FileText, Funnel, Loader, Pencil, Plus, ReceiptText, Search, Trash2, AlertCircle, Wallet, ShieldCheck, X } from "lucide-react";
import StatKpiCard from "@/components/ui/StatKpiCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Card from "@/components/ui/Card";
import { FilterPopover, FilterChip } from "@/components/ui/FilterPopover";
import PageTitle from "@/components/ui/PageTitle";
import {
    deleteRemisionEmpresa,
    facturarRemisionEmpresa,
    getRemisionesEmpresas,
    getDownloadRemisionFacturaUrl,
} from "@/services/remisionesEmpresasService";
import RemisionEmpresaFormView from "./RemisionEmpresaFormView";
import RemisionEmpresaVerView from "./RemisionEmpresaVerView";

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fmtDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("es-MX");
}

function badgeByStatus(status) {
    if (status === "pagada") return "bg-activo/20 text-activo";
    if (status === "parcial") return "bg-yellow-100 text-yellow-800";
    if (status === "cancelada") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
}

function buildFacturaFolioPreview(folioRemision) {
    return folioRemision ? `FAC-${folioRemision}` : "-";
}

export default function RemisionesEmpresasPage() {
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode");
    const id = searchParams.get("id");
    const idCotizacion = searchParams.get("id_cotizacion_empresa") || "";

    if (mode === "add") {
        return <RemisionEmpresaFormView idCotizacionEmpresa={idCotizacion} />;
    }

    if (mode === "edit" && id) {
        return <RemisionEmpresaFormView id={id} />;
    }

    if (mode === "view" && id) {
        return <RemisionEmpresaVerView id={id} />;
    }

    return <RemisionesEmpresasListView />;
}

function RemisionesEmpresasListView() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({ estado: "", facturada: "", desde: "", hasta: "" });
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [facturaModal, setFacturaModal] = useState({ open: false, row: null });
    const [facturaForm, setFacturaForm] = useState({
        fecha_factura: new Date().toISOString().slice(0, 10),
        correo_destino: "",
        metodo_pago: "PUE",
        forma_pago: "03",
        uso_cfdi: "G03",
        regimen_fiscal: "601",
        observaciones: "",
    });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getRemisionesEmpresas({
                search,
                estado: filters.estado,
                facturada: filters.facturada,
                desde: filters.desde,
                hasta: filters.hasta,
            });
            setRows(Array.isArray(data) ? data : []);
            setError("");
        } catch (e) {
            setRows([]);
            setError(e.message || "No se pudieron cargar las remisiones");
        } finally {
            setLoading(false);
        }
    }, [search, filters]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const pendientes = useMemo(() => rows.filter((r) => Number(r.saldo_pendiente || 0) > 0), [rows]);
    const totalSaldoPendiente = useMemo(() => pendientes.reduce((acc, r) => acc + Number(r.saldo_pendiente || 0), 0), [pendientes]);
    const facturadasCount = useMemo(() => rows.filter((r) => r.facturada).length, [rows]);
    const pagadasCount = useMemo(() => rows.filter((r) => r.estado_pago === "pagada").length, [rows]);

    const filteredRows = useMemo(() => {
        const term = String(search || "").toLowerCase().trim();
        if (!term) return rows;

        return rows.filter((row) => (
            String(row.folio_remision || "").toLowerCase().includes(term)
            || String(row.empresa_nombre || "").toLowerCase().includes(term)
            || String(row.empresa_nombre_fiscal || "").toLowerCase().includes(term)
            || String(row.empresa_rfc || "").toLowerCase().includes(term)
            || String(row.folio_factura || "").toLowerCase().includes(term)
        ));
    }, [rows, search]);

    async function handleDelete(row) {
        const ok = window.confirm(`¿Eliminar remision ${row.folio_remision}?`);
        if (!ok) return;

        try {
            await deleteRemisionEmpresa(row.id_remision_empresa);
            await loadData();
        } catch (e) {
            setError(e.message || "No se pudo eliminar la remision");
        }
    }

    async function handleFacturarSubmit(event) {
        event.preventDefault();
        if (!facturaModal.row) return;

        const folioFactura = buildFacturaFolioPreview(facturaModal.row.folio_remision);

        try {
            await facturarRemisionEmpresa(facturaModal.row.id_remision_empresa, {
                ...facturaForm,
                folio_factura: folioFactura,
            });
            setFacturaModal({ open: false, row: null });
            await loadData();
        } catch (e) {
            setError(e.message || "No se pudo facturar la remision");
        }
    }

    return (
        <div className="space-y-4">
            <PageTitle
                title="Remisiones a Empresas"
                subtitle="CRUD independiente y facturacion por remision"
                icon={<ReceiptText size={22} />}
                actions={(
                    <div className="flex gap-2">
                        <Link href="/empresas/abonos">
                            <Button variant="outline">Ir a Abonos</Button>
                        </Link>
                        <Link href="/empresas/remisiones?mode=add">
                            <Button className="gap-2">
                                <Plus size={16} /> Nueva Remision
                            </Button>
                        </Link>
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
                            placeholder="Buscar"
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
                            onClear={() => setFilters({ estado: "", facturada: "", desde: "", hasta: "" })}
                        >
                            <div>
                                <p className="text-xs text-muted mb-2">Estado</p>
                                <div className="flex gap-2 flex-wrap">
                                    <FilterChip active={filters.estado === ""} onClick={() => setFilters((prev) => ({ ...prev, estado: "" }))}>Todos</FilterChip>
                                    <FilterChip active={filters.estado === "pendiente"} onClick={() => setFilters((prev) => ({ ...prev, estado: "pendiente" }))}>Pendiente</FilterChip>
                                    <FilterChip active={filters.estado === "parcial"} onClick={() => setFilters((prev) => ({ ...prev, estado: "parcial" }))}>Parcial</FilterChip>
                                    <FilterChip active={filters.estado === "pagada"} onClick={() => setFilters((prev) => ({ ...prev, estado: "pagada" }))}>Pagada</FilterChip>
                                    <FilterChip active={filters.estado === "cancelada"} onClick={() => setFilters((prev) => ({ ...prev, estado: "cancelada" }))}>Cancelada</FilterChip>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-muted mb-2">Factura</p>
                                <div className="flex gap-2 flex-wrap">
                                    <FilterChip active={filters.facturada === ""} onClick={() => setFilters((prev) => ({ ...prev, facturada: "" }))}>Todas</FilterChip>
                                    <FilterChip active={filters.facturada === "1"} onClick={() => setFilters((prev) => ({ ...prev, facturada: "1" }))}>Facturadas</FilterChip>
                                    <FilterChip active={filters.facturada === "0"} onClick={() => setFilters((prev) => ({ ...prev, facturada: "0" }))}>Sin factura</FilterChip>
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
                    value={pendientes.length}
                    tone={pendientes.length > 0 ? "warning" : "success"}
                />
                <StatKpiCard
                    icon={<Wallet size={20} />}
                    title="Saldo Pendiente"
                    value={fmtMoney(totalSaldoPendiente)}
                    tone={totalSaldoPendiente > 0 ? "warning" : "success"}
                />
                <StatKpiCard
                    icon={<ShieldCheck size={20} />}
                    title="Facturadas"
                    value={facturadasCount}
                    tone={facturadasCount > 0 ? "success" : "default"}
                />
                <StatKpiCard
                    icon={<Check size={20} />}
                    title="Remisiones Pagadas"
                    value={pagadasCount}
                    tone="info"
                />
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-x-auto">
                <table className="w-full min-w-[1250px] text-sm">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">Folio</th>
                            <th className="text-left p-3">Empresa</th>
                            <th className="text-left p-3">RFC</th>
                            <th className="text-left p-3">Fecha</th>
                            <th className="text-right p-3">Total</th>
                            <th className="text-right p-3">Saldo</th>
                            <th className="text-center p-3">Estado</th>
                            <th className="text-center p-3">Factura</th>
                            <th className="text-center p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={9} className="p-6 text-center text-muted"><Loader className="inline animate-spin" size={16} /> Cargando...</td></tr>
                        ) : filteredRows.length === 0 ? (
                            <tr><td colSpan={9} className="p-6 text-center text-muted">Sin remisiones</td></tr>
                        ) : filteredRows.map((row) => (
                            <tr key={row.id_remision_empresa} className="border-t border-border hover:bg-background/50">
                                <td className="p-3 font-semibold text-primary">{row.folio_remision}</td>
                                <td className="p-3">{row.empresa_nombre_fiscal || row.empresa_nombre}</td>
                                <td className="p-3">{row.empresa_rfc || "-"}</td>
                                <td className="p-3">{fmtDate(row.fecha_remision)}</td>
                                <td className="p-3 text-right">{fmtMoney(row.total_con_iva)}</td>
                                <td className="p-3 text-right font-semibold text-primary">{fmtMoney(row.saldo_pendiente)}</td>
                                <td className="p-3 text-center">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badgeByStatus(row.estado_pago)}`}>
                                        {row.estado_pago}
                                    </span>
                                </td>
                                <td className="p-3 text-center">
                                    {row.facturada ? (
                                        <span className="inline-flex items-center justify-center text-activo" title={row.folio_factura || "Facturada"}>
                                            <Check size={18} />
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center justify-center text-red-600" title="No facturada">
                                            <X size={18} />
                                        </span>
                                    )}
                                </td>
                                <td className="p-3">
                                    <div className="flex justify-center items-center gap-1">
                                        <Link href={`/empresas/remisiones?mode=view&id=${row.id_remision_empresa}`}>
                                            <Button variant="lightghost" className="p-1.5 h-auto hover:text-primary" title="Ver">
                                                <Eye size={16} />
                                            </Button>
                                        </Link>
                                        <Link href={`/empresas/remisiones?mode=edit&id=${row.id_remision_empresa}`}>
                                            <Button variant="lightghost" className="p-1.5 h-auto hover:text-yellow-700" title="Editar">
                                                <Pencil size={16} />
                                            </Button>
                                        </Link>
                                        <Button variant="lightghost" className="p-1.5 h-auto hover:text-red-600" title="Eliminar" onClick={() => handleDelete(row)}>
                                            <Trash2 size={16} />
                                        </Button>
                                        <div className="border-l-2 h-6 text-gray-400" />
                                        {!row.facturada ? (
                                            <Button
                                                variant="lightghost"
                                                className="p-1.5 h-auto"
                                                title="Facturar"
                                                onClick={() => {
                                                    setFacturaModal({ open: true, row });
                                                    setFacturaForm((prev) => ({
                                                        ...prev,
                                                        correo_destino: "",
                                                    }));
                                                }}
                                            >
                                                <FileText size={16} />
                                            </Button>
                                        ) : null}
                                        {row.facturada ? (
                                            <a href={getDownloadRemisionFacturaUrl(row.id_remision_empresa, "pdf")} target="_blank" rel="noreferrer">
                                                <Button variant="lightghost" className="p-1.5 h-auto hover:text-primary" title="Descargar factura">
                                                    <Download size={16} />
                                                </Button>
                                            </a>
                                        ) : null}
                                        <Link href={`/empresas/abonos?id_remision_empresa=${row.id_remision_empresa}`}>
                                            <Button variant="lightghost" className="p-1.5 h-auto" title="Abonos">
                                                <ReceiptText size={16} />
                                            </Button>
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {facturaModal.open ? (
                <div className="fixed inset-0 bg-primary/40 z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleFacturarSubmit} className="bg-white w-full max-w-3xl rounded-2xl border border-border shadow-card p-5 space-y-4">
                        <h3 className="text-lg font-semibold text-primary">Facturar remision</h3>
                        <p className="text-sm text-muted">{facturaModal.row?.folio_remision}</p>
                        <p className="text-sm font-medium text-primary">
                            Folio factura generado: {buildFacturaFolioPreview(facturaModal.row?.folio_remision)}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Fecha factura" type="date" value={facturaForm.fecha_factura} onChange={(e) => setFacturaForm((prev) => ({ ...prev, fecha_factura: e.target.value }))} />
                            <div>
                                <Input label="Correo destino" value={facturaForm.correo_destino} onChange={(e) => setFacturaForm((prev) => ({ ...prev, correo_destino: e.target.value }))} />
                                <p className="text-xs text-muted italic pl-2 ">
                                    Se enviará una copia de la factura a este correo y a facturacion.danabri@gmail.com
                                </p>
                            </div>
                            <Select
                                label="Metodo pago*"
                                value={facturaForm.metodo_pago}
                                onChange={(e) => setFacturaForm((prev) => ({ ...prev, metodo_pago: e.target.value }))}
                                options={[
                                    { value: "PUE", label: "PUE - Pago en una sola exhibición" },
                                    { value: "PPD", label: "PPD - Pago en parcialidades o diferido" }
                                ]}
                            />
                            <Select
                                label="Forma pago*"
                                value={facturaForm.forma_pago}
                                onChange={(e) => setFacturaForm((prev) => ({ ...prev, forma_pago: e.target.value }))}
                                options={[
                                    { value: "01", label: "01 - Efectivo" },
                                    { value: "02", label: "02 - Cheque nominativo" },
                                    { value: "03", label: "03 - Transferencia" },
                                    { value: "04", label: "04 - Tarjeta crédito" },
                                    { value: "28", label: "28 - Tarjeta débito" },
                                    { value: "99", label: "99 - Por definir" },
                                ]}
                            />
                            <Select
                                label="Uso CFDI *"
                                value={facturaForm.uso_cfdi}
                                onChange={(e) => setFacturaForm((prev) => ({ ...prev, uso_cfdi: e.target.value }))}
                                options={[
                                    { value: "G01", label: "G01 - Adquisición de mercancías" },
                                    { value: "G02", label: "G02 - Devolución, descuentos o bonificaciones" },
                                    { value: "G03", label: "G03 - Gastos en general" },
                                    { value: "I02", label: "I02 - Mobiliario y equipo de oficina por inversiones" },
                                    { value: "I04", label: "I04 - Equipo de computo y accesorios" },
                                    { value: "I08", label: "I08 - Otra maquinaria y equipo" },
                                    { value: "S01", label: "S01 - Sin efectos fiscales" }
                                ]}
                            />
                            <Select
                                label="Regimen fiscal *"
                                value={facturaForm.regimen_fiscal}
                                onChange={(e) => setFacturaForm((prev) => ({ ...prev, regimen_fiscal: e.target.value }))}
                                options={[
                                    /* {
                                        label: "Regimen para Personas Morales",
                                        options: [
                                            { value: "601", label: "601 - General de Ley Personas Morales" },
                                            { value: "603", label: "603 - Personas Morales con Fines" },
                                            { value: "609", label: "609 - Consolidación (Histórico)" },
                                            { value: "610", label: "610 - Residentes en el Extranjero sin Establecimiento Permanente en México" },
                                            { value: "620", label: "620 - Sociedades Cooperativas de Producción que optan por diferir sus ingresos" },
                                            { value: "622", label: "622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras" },
                                            { value: "623", label: "623 - Opcional para Grupos de Sociedades" },
                                            { value: "624", label: "624 - Coordinados" },
                                            { value: "626", label: "626 - Régimen Simplificado de Confianza Personas Morales" }

                                        ],
                                    }, */
                                    { value: "601", label: "601 - General de Ley Personas Morales" },
                                    { value: "603", label: "603 - Personas Morales con Fines no Lucrativos" },
                                    { value: "605", label: "605 - Sueldos y Salarios e Ingresos Asimilados a Salarios" },
                                    { value: "606", label: "606 - Arrendamiento" },
                                    { value: "607", label: "607 - Régimen de Enajenación o Adquisición de Bienes" },
                                    { value: "608", label: "608 - Demás ingresos" },
                                    { value: "610", label: "610 - Residentes en el Extranjero sin Establecimiento Permanente en México" },
                                    { value: "611", label: "611 - Ingresos por Dividendos (socios y accionistas)" },
                                    { value: "612", label: "612 - Personas Físicas con Actividades Empresariales y Profesionales" },
                                    { value: "614", label: "614 - Ingresos por intereses" },
                                    { value: "615", label: "615 - Régimen de los ingresos por obtención de premios" },
                                    { value: "616", label: "616 - Sin obligaciones fiscales" },
                                    { value: "620", label: "620 - Sociedades Cooperativas de Producción que optan por diferir sus ingresos" },
                                    { value: "621", label: "621 - Incorporación Fiscal (RIF)" },
                                    { value: "622", label: "622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras" },
                                    { value: "623", label: "623 - Opcional para Grupos de Sociedades" },
                                    { value: "624", label: "624 - Coordinados" },
                                    { value: "625", label: "625 - Actividades Empresariales con ingresos a través de Plataformas Tecnológicas" },
                                    { value: "626", label: "626 - Régimen Simplificado de Confianza (RESICO)" },
                                    { value: "628", label: "628 - Hidrocarburos" },
                                    { value: "629", label: "629 - Regímenes Fiscales Preferentes y Empresas Multinacionales" },
                                    { value: "630", label: "630 - Enajenación de acciones en bolsa de valores" },
                                ]}
                            />
                        </div>

                        <div>
                            <label className="text-sm text-muted block mb-1">Observaciones</label>
                            <textarea
                                rows={3}
                                value={facturaForm.observaciones}
                                onChange={(e) => setFacturaForm((prev) => ({ ...prev, observaciones: e.target.value }))}
                                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setFacturaModal({ open: false, row: null })}>Cancelar</Button>
                            <Button type="submit">Facturar</Button>
                        </div>
                    </form>
                </div>
            ) : null}
        </div>
    );
}
