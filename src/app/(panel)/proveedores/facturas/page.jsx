"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Download, Eye, Funnel, Plus, Receipt, ShieldCheck, Wallet } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PageTitle from "@/components/ui/PageTitle";
import StatKpiCard from "@/components/ui/StatKpiCard";
import { FilterPopover } from "@/components/ui/FilterPopover";
import { getDownloadFacturaUrl, getFacturasProveedor } from "@/services/facturasProveedorService";
import FacturaFormView from "./FacturaFormView";
import FacturaDetalleView from "./FacturaDetalleView";

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fmtDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("es-MX");
}

function statusBadge(status) {
    if (status === "pagada") return "bg-activo/20 text-activo";
    if (status === "parcial") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-700";
}

function cierreBadge(factura) {
    if (factura.inventario_cerrado_at) {
        return "bg-slate-100 text-slate-700";
    }

    if (factura.estado_pago === "pagada") {
        return "bg-emerald-100 text-emerald-700";
    }

    return "bg-blue-100 text-blue-700";
}

export default function FacturasProveedorPage() {
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode");
    const id = searchParams.get("id");
    const idOrdenCompra = searchParams.get("id_orden_compra") || "";

    if (mode === "nueva") {
        return <FacturaFormView idOrdenCompra={idOrdenCompra} />;
    }

    if (mode === "detalle" && id) {
        return <FacturaDetalleView id={id} />;
    }

    return <FacturasProveedorListView />;
}

function FacturasProveedorListView() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [estado, setEstado] = useState("");
    const [filtersOpen, setFiltersOpen] = useState(false);

    const loadAll = useCallback(async () => {
        try {
            setLoading(true);
            const facturas = await getFacturasProveedor({ search, estado });

            setRows(Array.isArray(facturas) ? facturas : []);
            setError("");
        } catch (e) {
            setError(e.message || "Error al cargar facturas");
        } finally {
            setLoading(false);
        }
    }, [search, estado]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const kpis = useMemo(() => {
        const totalFacturas = rows.length;
        const totalMonto = rows.reduce((acc, item) => acc + Number(item.total || 0), 0);
        const saldoPendiente = rows.reduce((acc, item) => acc + Number(item.saldo_pendiente || 0), 0);
        const listasParaCerrar = rows.filter((item) => item.estado_pago === "pagada" && !item.inventario_cerrado_at).length;

        return { totalFacturas, totalMonto, saldoPendiente, listasParaCerrar };
    }, [rows]);

    function onSearch() {
        loadAll();
    }

    return (
        <div className="space-y-5">
            <PageTitle
                title="Facturas de Proveedor"
                subtitle="Gestión de facturas y vencimientos"
                actions={(
                    <div className="flex gap-2">
                        <Link href="/proveedores/pagos-pendientes">
                            <Button variant="outline">Ir a Pagos Pendientes</Button>
                        </Link>
                        <Link href="/proveedores/facturas?mode=nueva">
                            <Button className="gap-2">
                                <Plus size={16} /> Nueva Factura
                            </Button>
                        </Link>
                    </div>
                )}
            />

            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

            {kpis.listasParaCerrar > 0 ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
                    Tienes <strong>{kpis.listasParaCerrar}</strong> factura(s) pagadas listas para cierre de inventario.
                    <Link href="/proveedores/pagos-pendientes" className="ml-2 font-semibold underline underline-offset-2">
                        Ir a cierre rápido
                    </Link>
                </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatKpiCard
                    icon={<Receipt size={20} />}
                    title="Facturas"
                    value={kpis.totalFacturas}
                    tone="default"
                />
                <StatKpiCard
                    icon={<Wallet size={20} />}
                    title="Monto Total"
                    value={fmtMoney(kpis.totalMonto)}
                    tone="info"
                />
                <StatKpiCard
                    icon={<AlertCircle size={20} />}
                    title="Saldo Pendiente"
                    value={fmtMoney(kpis.saldoPendiente)}
                    tone={kpis.saldoPendiente > 0 ? "warning" : "success"}
                />
                <StatKpiCard
                    icon={<ShieldCheck size={20} />}
                    title="Listas para Cierre"
                    value={kpis.listasParaCerrar}
                    tone={kpis.listasParaCerrar > 0 ? "success" : "default"}
                />
            </div>

            <div className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
                <div className="relative inline-block w-full md:w-[460px]">
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por folio, proveedor u observación"
                        className="w-full"
                        inputClassName="bg-white text-primary w-full py-2.5 px-4 rounded-full"
                    />
                </div>

                <div className="md:ml-auto flex items-center gap-2">
                    <FilterPopover
                        open={filtersOpen}
                        onOpenChange={setFiltersOpen}
                        triggerVariant="ghost"
                        triggerClassName="px-3 py-2"
                        triggerContent={<span className="flex items-center gap-2"><Funnel size={16} /></span>}
                        panelClassName="w-[300px]"
                        panelPositionClassName="right-0 top-full"
                        onClear={() => {
                            setEstado("");
                            setFiltersOpen(false);
                            onSearch();
                        }}
                        onApply={() => {
                            setFiltersOpen(false);
                            onSearch();
                        }}
                    >
                        <Select
                            label="Estado"
                            value={estado}
                            onChange={(e) => setEstado(e.target.value)}
                            options={[
                                { value: "", label: "Todos" },
                                { value: "pendiente", label: "Pendiente" },
                                { value: "parcial", label: "Parcial" },
                                { value: "pagada", label: "Pagada" },
                            ]}
                            selectClassName="bg-white"
                        />
                    </FilterPopover>

                    {/* <Button onClick={onSearch}>Filtrar</Button> */}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">ID</th>
                            <th className="text-left p-3">Factura</th>
                            <th className="text-left p-3">Proveedor</th>
                            <th className="text-left p-3">Vence</th>
                            <th className="text-right p-3">Total</th>
                            <th className="text-right p-3">Saldo</th>
                            <th className="text-center p-3">Estado</th>
                            <th className="text-center p-3">Cierre</th>
                            <th className="text-center p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={9} className="p-6 text-center text-muted">Cargando...</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={9} className="p-6 text-center text-muted">Sin facturas</td></tr>
                        ) : rows.map((r) => (
                            <tr key={r.id_factura} className="border-t border-border hover:bg-background/50">
                                <td className="p-3">{r.id_factura}</td>
                                <td className="p-3">
                                    <p className="font-medium text-primary">{r.folio_factura}</p>
                                    <p className="text-xs text-muted">{r.orden_folio || "Sin orden"}</p>
                                </td>
                                <td className="p-3">{r.proveedor_nombre}</td>
                                <td className="p-3">{fmtDate(r.fecha_vencimiento)}</td>
                                <td className="p-3 text-right">{fmtMoney(r.total)}</td>
                                <td className="p-3 text-right font-semibold text-primary">{fmtMoney(r.saldo_pendiente)}</td>
                                <td className="p-3 text-center">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(r.estado_pago)}`}>
                                        {r.estado_pago}
                                    </span>
                                </td>
                                <td className="p-3 text-center">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cierreBadge(r)}`}>
                                        {r.inventario_cerrado_at ? "Cerrada" : r.estado_pago === "pagada" ? "Listo para cerrar" : "Pendiente"}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <div className="flex justify-center gap-1">
                                        <a href={getDownloadFacturaUrl(r.id_factura, "pdf")} target="_blank" rel="noreferrer">
                                            <Button variant="lightghost" className="p-1.5 h-auto" title="Descargar Factura del Proveedor">
                                                <Download size={16} />
                                            </Button>
                                        </a>
                                        <Link href={`/proveedores/facturas?mode=detalle&id=${r.id_factura}`}>
                                            <Button variant="lightghost" className="p-1.5 h-auto" title="Ver pagos">
                                                <Eye size={16} />
                                            </Button>
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
