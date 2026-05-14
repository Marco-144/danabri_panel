"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, Funnel, Loader, Pencil, Plus, Search, Trash2, Combine, FileText, FileDown } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { FilterPopover, FilterChip } from "@/components/ui/FilterPopover";
import PageTitle from "@/components/ui/PageTitle";
import { deleteCotizacionCliente, getCotizacionesClientes, getCotizacionClienteById } from "@/services/cotizacionesClientesService";
import CotizacionClienteFormView from "./CotizacionClienteFormView";
import CotizacionClienteVerView from "./CotizacionClienteVerView";

function fmtMoney(value) {
    return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fmtDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("es-MX");
}

function to6(value) {
    return Math.round(Number(value || 0) * 100) / 100;
}

function buildPrintableHtml(data, includeIva) {
    const rowsHtml = (data.detalles || []).map((line, index) => {
        const basePriceWithoutIva = Number(line.precio_sin_iva || line.precio || 0);
        const unitPrice = includeIva ? basePriceWithoutIva * 1.16 : basePriceWithoutIva;
        const amount = includeIva ? (basePriceWithoutIva * 1.16 * Number(line.cantidad || 0)) : (basePriceWithoutIva * Number(line.cantidad || 0));
        return `
            <tr>
                <td>${index + 1}</td>
                <td>${line.producto_nombre || "-"}</td>
                <td style="text-align:right;">${Number(line.cantidad || 0)}</td>
                <td style="text-align:right;">$${to6(unitPrice).toFixed(2)}</td>
                <td style="text-align:right;">$${to6(amount).toFixed(2)}</td>
            </tr>
        `;
    }).join("");

    const total = includeIva ? (Number(data.total || 0) * 1.16) : Number(data.total || 0);

    return `
        <html>
        <head>
            <title>Cotizacion ${data.folio || ""}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
                h1 { text-align: center; margin-bottom: 20px; }
                .meta { margin-bottom: 20px; line-height: 1.8; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #d1d5db; padding: 8px; }
                th { background: #f3f4f6; text-align: left; }
                .total-wrap { margin-top: 16px; text-align: right; font-size: 20px; font-weight: 700; }
            </style>
        </head>
        <body>
            <h1>COTIZACION DE CLIENTE</h1>
            <div class="meta">
                <div><strong>Folio:</strong> ${data.folio || "-"}</div>
                <div><strong>Cliente:</strong> ${data.cliente_nombre || "-"}</div>
                <div><strong>Fecha de emision:</strong> ${fmtDate(data.fecha_emision || data.created_at)}</div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Descripcion</th>
                        <th style="text-align:right;">Cantidad</th>
                        <th style="text-align:right;">Precio unitario</th>
                        <th style="text-align:right;">Importe</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
            <div class="total-wrap">Total: $${Number(total || 0).toFixed(2)}</div>
        </body>
        </html>
    `;
}

function openPrintPreview(html) {
    const popup = window.open("", "_blank", "width=1000,height=800");
    if (!popup) return;
    popup.document.write(html);
    popup.document.close();
    popup.focus();
}

export default function CotizacionesClientesPage() {
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode");
    const id = searchParams.get("id");

    if (mode === "add") return <CotizacionClienteFormView />;
    if (mode === "edit" && id) return <CotizacionClienteFormView id={id} />;
    if (mode === "view" && id) return <CotizacionClienteVerView id={id} />;

    return <CotizacionesClientesListView />;
}

function CotizacionesClientesListView() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [filters, setFilters] = useState({ estado: "", desde: "", hasta: "" });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getCotizacionesClientes({
                search,
                estado: filters.estado,
                fecha_desde: filters.desde,
                fecha_hasta: filters.hasta,
            });
            setRows(Array.isArray(data) ? data : []);
            setError("");
        } catch (e) {
            setRows([]);
            setError(e.message || "No se pudieron cargar las cotizaciones");
        } finally {
            setLoading(false);
        }
    }, [search, filters]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredRows = useMemo(() => {
        const term = String(search || "").toLowerCase().trim();
        if (!term) return rows;
        return rows.filter((row) => (
            String(row.folio || "").toLowerCase().includes(term)
            || String(row.cliente_nombre || "").toLowerCase().includes(term)
            || String(row.cliente_rfc || "").toLowerCase().includes(term)
        ));
    }, [rows, search]);

    async function handleDelete(row) {
        const ok = window.confirm(`¿Eliminar cotizacion ${row.folio}?`);
        if (!ok) return;

        try {
            await deleteCotizacionCliente(row.id_cotizacion);
            await loadData();
        } catch (e) {
            setError(e.message || "No se pudo eliminar la cotizacion");
        }
    }

    async function handleGeneratePDF(id, includeIva) {
        try {
            const ivaParam = includeIva ? "1" : "0";
            const url = `/api/cotizaciones-clientes?id=${encodeURIComponent(id)}&pdf=1&iva=${ivaParam}`;
            window.open(url, "_blank");
        } catch (e) {
            setError(e.message || "No se pudo generar el PDF");
        }
    }

    return (
        <div className="space-y-4">
            <PageTitle
                title="Cotizaciones de Clientes"
                subtitle="Administracion de cotizaciones por cliente"
                icon={<FileText size={20} />}
                actions={(
                    <Link href="/clientes/cotizaciones?mode=add">
                        <Button className="gap-2"><Plus size={16} />Nueva cotizacion</Button>
                    </Link>
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
                            placeholder="Buscar por cliente, RFC o folio"
                            inputClassName="bg-white text-primary py-2.5 pl-10 pr-4 rounded-full border border-border"
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
                            onClear={() => setFilters({ estado: "", desde: "", hasta: "" })}
                        >
                            <div>
                                <p className="text-xs text-muted mb-2">Estado</p>
                                <div className="flex gap-2 flex-wrap">
                                    <FilterChip active={filters.estado === ""} onClick={() => setFilters((prev) => ({ ...prev, estado: "" }))}>Todos</FilterChip>
                                    <FilterChip active={filters.estado === "pendiente"} onClick={() => setFilters((prev) => ({ ...prev, estado: "pendiente" }))}>Pendiente</FilterChip>
                                    <FilterChip active={filters.estado === "aprobada"} onClick={() => setFilters((prev) => ({ ...prev, estado: "aprobada" }))}>Aprobada</FilterChip>
                                    <FilterChip active={filters.estado === "rechazada"} onClick={() => setFilters((prev) => ({ ...prev, estado: "rechazada" }))}>Rechazada</FilterChip>
                                    <FilterChip active={filters.estado === "convertida"} onClick={() => setFilters((prev) => ({ ...prev, estado: "convertida" }))}>Convertida</FilterChip>
                                </div>
                            </div>

                            <Input label="Fecha desde" type="date" value={filters.desde} onChange={(e) => setFilters((prev) => ({ ...prev, desde: e.target.value }))} />
                            <Input label="Fecha hasta" type="date" value={filters.hasta} onChange={(e) => setFilters((prev) => ({ ...prev, hasta: e.target.value }))} />
                        </FilterPopover>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-background text-primary">
                        <tr>
                            <th className="text-left p-3">Folio</th>
                            <th className="text-left p-3">Cliente</th>
                            <th className="text-left p-3">RFC</th>
                            <th className="text-left p-3">Fecha</th>
                            <th className="text-left p-3">Estado</th>
                            <th className="text-right p-3">Total s/IVA</th>
                            <th className="text-right p-3">Total c/IVA</th>
                            <th className="text-center p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="p-6 text-center text-muted"><Loader className="inline animate-spin" size={16} /> Cargando...</td></tr>
                        ) : filteredRows.length === 0 ? (
                            <tr><td colSpan={7} className="p-6 text-center text-muted">Sin cotizaciones</td></tr>
                        ) : filteredRows.map((row) => (
                            <tr key={row.id_cotizacion} className="border-t border-border hover:bg-background/50">
                                <td className="p-3 font-semibold text-primary">{row.folio}</td>
                                <td className="p-3">{row.cliente_nombre}</td>
                                <td className="p-3">{row.cliente_rfc || "-"}</td>
                                <td className="p-3">{fmtDate(row.fecha_emision || row.created_at)}</td>
                                <td className="p-3 capitalize">{row.estado || "pendiente"}</td>
                                <td className="p-3 text-right font-semibold text-primary">{fmtMoney(row.total)}</td>
                                <td className="p-3 text-right font-semibold text-primary">{fmtMoney(row.total_con_iva || (Number(row.total || 0) * 1.16))}</td>
                                <td className="p-3 w-[460px]">
                                    <div className="flex justify-center items-center gap-1">
                                        <Link href={`/clientes/cotizaciones?mode=view&id=${row.id_cotizacion}`}>
                                            <Button variant="lightghost" className="p-1.5 h-auto" title="Ver"><Eye size={16} /></Button>
                                        </Link>
                                        <Link href={`/clientes/cotizaciones?mode=edit&id=${row.id_cotizacion}`}>
                                            <Button variant="lightghost" className="p-1.5 h-auto hover:text-yellow-700" title="Editar"><Pencil size={16} /></Button>
                                        </Link>
                                        <Button variant="lightghost" className="p-1.5 h-auto hover:text-red-600" title="Eliminar" onClick={() => handleDelete(row)}>
                                            <Trash2 size={16} />
                                        </Button>
                                        <div className="border-l-2 h-6 text-gray-400" />
                                        <Link href={`/clientes/remisiones?mode=add&id_cotizacion=${row.id_cotizacion}`}>
                                            <Button variant="lightghost" title="Generar remision" className="p-1.5 h-auto hover:text-green-700"><Combine size={16} /></Button>
                                        </Link>
                                        <Button variant="generate" title="PDF con IVA" size="sm" className="mr-1.5 h-auto" onClick={() => handleGeneratePDF(row.id_cotizacion, true)}>
                                            <FileDown size={15} />
                                            <p>C/IVA</p>
                                        </Button>
                                        <Button variant="generate" title="PDF sin IVA" size="sm" onClick={() => handleGeneratePDF(row.id_cotizacion, false)}>
                                            <FileDown size={15} />
                                            <p>S/IVA</p>
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
