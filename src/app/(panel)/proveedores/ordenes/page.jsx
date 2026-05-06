"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, ClipboardList, Eye, FileDown, Funnel, Loader, Pencil, Plus, Search, ShoppingCart, Trash2, TrendingUp } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PageTitle from "@/components/ui/PageTitle";
import StatKpiCard from "@/components/ui/StatKpiCard";
import { FilterPopover } from "@/components/ui/FilterPopover";
import { getFacturasProveedor } from "@/services/facturasProveedorService";
import {
    deleteOrdenCompra,
    getKpisOrdenesCompra,
    getOrdenesCompra,
    updateOrdenCompra,
} from "@/services/ordenesCompraService";
import AgregarOrden from "./AgregarOrden";
import EditarOrden from "./EditarOrden";
import VerOrden from "./VerOrden";

const STATUS_CONFIG = {
    pendiente: { label: "Pendiente", bg: "bg-yellow-100", text: "text-yellow-800" },
    recibida: { label: "Recibida", bg: "bg-activo/20", text: "text-activo" },
    parcial: { label: "Parcial", bg: "bg-blue-100", text: "text-blue-800" },
    cancelada: { label: "Cancelada", bg: "bg-red-100", text: "text-red-700" },
};

const STATUS_OPTIONS = [
    { value: "pendiente", label: "Pendiente" },
    { value: "recibida", label: "Recibida" },
    { value: "parcial", label: "Parcial" },
    { value: "cancelada", label: "Cancelada" },
];

function fmt(n) {
    return Number(n || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function fmtDate(d) {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default function OrdenesCompraPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader className="animate-spin text-primary" /></div>}>
            <OrdenesCompraContent />
        </Suspense>
    );
}

function OrdenesCompraContent() {
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode");
    const selectedId = searchParams.get("id");

    if (mode === "add") return <AgregarOrden />;
    if (mode === "edit" && selectedId) return <EditarOrden id={selectedId} />;
    if (mode === "view" && selectedId) return <VerOrden id={selectedId} />;

    return <OrdenesList />;
}

function OrdenesList() {
    const router = useRouter();
    const [ordenes, setOrdenes] = useState([]);
    const [kpis, setKpis] = useState(null);
    const [facturasListasCierre, setFacturasListasCierre] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [statusDraft, setStatusDraft] = useState("all");
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [confirmModal, setConfirmModal] = useState({ open: false, orden: null });
    const [statusModal, setStatusModal] = useState({ open: false, orden: null });

    const PAGE_SIZE = 10;

    async function loadAll() {
        try {
            setLoading(true);
            const [rows, kpiData, facturasPagadas] = await Promise.all([
                getOrdenesCompra(),
                getKpisOrdenesCompra(),
                getFacturasProveedor({ estado: "pagada" }),
            ]);
            setOrdenes(Array.isArray(rows) ? rows : []);
            setKpis(kpiData || null);
            const listas = (Array.isArray(facturasPagadas) ? facturasPagadas : []).filter((f) => !f.inventario_cerrado_at).length;
            setFacturasListasCierre(listas);
            setError("");
        } catch (err) {
            setError(err.message || "No se pudieron cargar las ordenes");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAll();
    }, []);

    const filtered = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return ordenes.filter((o) => {
            const matchesSearch = !q
                || String(o.folio || "").toLowerCase().includes(q)
                || String(o.proveedor_nombre || "").toLowerCase().includes(q);

            const matchesStatus = filterStatus === "all" || o.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [ordenes, searchTerm, filterStatus]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus]);

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const safePage = Math.min(Math.max(currentPage, 1), totalPages);
    const paginated = useMemo(
        () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
        [filtered, safePage]
    );

    async function handleDelete() {
        const orden = confirmModal.orden;
        if (!orden) return;

        try {
            await deleteOrdenCompra(orden.id_orden_compra);
            setConfirmModal({ open: false, orden: null });
            await loadAll();
        } catch (err) {
            setError(err.message || "No se pudo eliminar la orden");
        }
    }

    async function handleQuickStatus(newStatus) {
        const orden = statusModal.orden;
        if (!orden) return;

        try {
            await updateOrdenCompra(orden.id_orden_compra, { status: newStatus });
            setStatusModal({ open: false, orden: null });
            await loadAll();
        } catch (err) {
            setError(err.message || "No se pudo actualizar el status");
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin text-primary">⟳</div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <PageTitle
                title="Ordenes de Compra"
                subtitle="Gestion de ordenes de compra a proveedores"
                icon={<ShoppingCart size={22} />}
                actions={
                    <Link href="/proveedores/ordenes?mode=add">
                        <Button variant="primary" className="rounded-xl shadow-sm gap-2">
                            <Plus size={16} /> Nueva Orden
                        </Button>
                    </Link>
                }
            />

            {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

            {facturasListasCierre > 0 ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
                    Tienes <strong>{facturasListasCierre}</strong> factura(s) pagadas listas para cierre de inventario.
                    <Link href="/proveedores/pagos-pendientes" className="ml-2 font-semibold underline underline-offset-2">
                        Ir a cierre rápido
                    </Link>
                </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatKpiCard
                    icon={<ClipboardList size={22} />}
                    title="Total de Ordenes"
                    value={kpis?.total_ordenes ?? 0}
                    tone="default"
                />
                <StatKpiCard
                    icon={<TrendingUp size={22} />}
                    title="Monto Total"
                    value={fmt(kpis?.monto_total)}
                    tone="info"
                />
                <StatKpiCard
                    icon={<Clock size={22} />}
                    title="Pendientes"
                    value={kpis?.ordenes_pendientes ?? 0}
                    tone="warning"
                />
            </div>

            <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <div className="relative w-full md:w-[420px] md:mt-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <Input
                        type="text"
                        placeholder="Buscar por folio, proveedor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        inputClassName="bg-white text-primary w-full py-2.5 pl-10 pr-4 rounded-full"
                    />
                </div>

                <div className="md:ml-auto flex items-center gap-2">
                    <FilterPopover
                        open={filtersOpen}
                        onOpenChange={(nextOpen) => {
                            if (nextOpen) setStatusDraft(filterStatus);
                            setFiltersOpen(nextOpen);
                        }}
                        triggerVariant="ghost"
                        triggerClassName="px-3 py-2"
                        triggerContent={<span className="flex items-center gap-2"><Funnel size={16} /></span>}
                        panelClassName="w-[280px]"
                        panelPositionClassName="right-0 top-full"
                        onClear={() => {
                            setStatusDraft("all");
                            setFilterStatus("all");
                            setFiltersOpen(false);
                        }}
                        onApply={() => {
                            setFilterStatus(statusDraft || "all");
                            setFiltersOpen(false);
                        }}
                    >
                        <Select
                            label="Status"
                            value={statusDraft}
                            onChange={(e) => setStatusDraft(e.target.value || "all")}
                            options={[{ value: "all", label: "Todos" }, ...STATUS_OPTIONS]}
                            selectClassName="bg-white"
                        />
                    </FilterPopover>

                    <Button onClick={loadAll}>Actualizar</Button>
                </div>

            </div>

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[1000px]">
                        <thead className="bg-background text-primary">
                            <tr>
                                <th className="text-left p-3">Folio</th>
                                <th className="text-left p-3">Proveedor</th>
                                <th className="text-left p-3">Almacen</th>
                                <th className="text-center p-3">Status</th>
                                <th className="text-center p-3">N° Productos</th>
                                <th className="text-right p-3">Subtotal</th>
                                <th className="text-right p-3">Fecha</th>
                                <th className="text-center p-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-muted">No hay ordenes para mostrar.</td>
                                </tr>
                            )}

                            {paginated.map((o) => (
                                <OrdenRow
                                    key={o.id_orden_compra}
                                    orden={o}
                                    onStatusClick={() => setStatusModal({ open: true, orden: o })}
                                    onView={() => router.push(`/proveedores/ordenes?mode=view&id=${o.id_orden_compra}`)}
                                    onEdit={() => router.push(`/proveedores/ordenes?mode=edit&id=${o.id_orden_compra}`)}
                                    onDelete={() => setConfirmModal({ open: true, orden: o })}
                                    onPrint={() => window.open(`/api/ordenes-compra?pdf=1&id=${o.id_orden_compra}`, "_blank", "noopener,noreferrer")}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="border-t border-border px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white">
                    <p className="text-sm text-muted">
                        {totalItems === 0
                            ? "No hay resultados."
                            : `Mostrando ${(safePage - 1) * PAGE_SIZE + 1}-${Math.min(safePage * PAGE_SIZE, totalItems)} de ${totalItems} ordenes`}
                    </p>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <Button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} variant="outline" className="h-9 w-9 p-0">
                                <ChevronLeft size={16} />
                            </Button>
                            <span className="text-sm text-muted">{safePage} / {totalPages}</span>
                            <Button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} variant="outline" className="h-9 w-9 p-0">
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {statusModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 px-4">
                    <div className="w-full max-w-sm rounded-2xl border border-border bg-white shadow-card p-6">
                        <h3 className="text-lg font-semibold text-primary mb-1">Cambiar status</h3>
                        <p className="text-sm text-muted mb-4">
                            Orden <span className="font-medium text-primary">{statusModal.orden?.folio}</span>
                        </p>
                        <div className="flex flex-col gap-2">
                            {STATUS_OPTIONS.map((opt) => (
                                <Button key={opt.value} variant="outline" onClick={() => handleQuickStatus(opt.value)}>
                                    {opt.label}
                                </Button>
                            ))}
                        </div>
                        <div className="mt-4 flex justify-end">
                            <Button variant="outline" onClick={() => setStatusModal({ open: false, orden: null })}>Cancelar</Button>
                        </div>
                    </div>
                </div>
            )}

            {confirmModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-border bg-white shadow-card p-6">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-full bg-red-100 p-2 text-red-700">
                                <AlertTriangle size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-primary">Confirmar eliminacion</h3>
                                <p className="text-sm text-muted mt-1">
                                    Se eliminara la orden <span className="font-medium text-primary">{confirmModal.orden?.folio}</span> y sus productos.
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setConfirmModal({ open: false, orden: null })}>Cancelar</Button>
                            <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function OrdenRow({ orden, onStatusClick, onView, onEdit, onDelete, onPrint }) {
    const cfg = STATUS_CONFIG[orden.status] || STATUS_CONFIG.pendiente;

    return (
        <tr className="border-t border-border hover:bg-background/50">
            <td className="p-3 font-mono text-xs font-medium text-primary">{orden.folio}</td>
            <td className="p-3">
                <p className="font-medium text-primary">{orden.proveedor_nombre}</p>
                {orden.proveedor_giro && <p className="text-xs text-muted">{orden.proveedor_giro}</p>}
            </td>
            <td className="p-3 text-sm text-muted">{orden.almacen_nombre || "-"}</td>
            <td className="p-3 text-center">
                <button
                    onClick={onStatusClick}
                    title="Clic para cambiar status"
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition hover:opacity-80 ${cfg.bg} ${cfg.text}`}
                >
                    {cfg.label}
                </button>
            </td>
            <td className="p-3 text-center text-muted">{orden.total_partidas ?? "-"}</td>
            <td className="p-3 text-right">{fmt(orden.subtotal)}</td>
            <td className="p-3 text-right text-muted text-xs">{fmtDate(orden.fecha)}</td>
            <td className="p-3">
                <div className="flex justify-center text-muted">
                    <Button variant="lightghost" className="p-1.5 h-auto" onClick={onView} title="Ver detalle">
                        <Eye size={16} className="hover:text-primary" />
                    </Button>
                    <Button variant="lightghost" className="p-1.5 h-auto" onClick={onEdit} title="Editar">
                        <Pencil size={16} className="hover:text-yellow-700" />
                    </Button>
                    <Button variant="lightghost" className="p-1.5 h-auto" onClick={onDelete} title="Eliminar">
                        <Trash2 size={16} className="hover:text-red-600" />
                    </Button>
                    <hr style={{ width: '25px', transform: 'rotate(90deg)', translate: '0 14px' }} />
                    <Button variant="lightghost" className="p-1.5 h-auto" onClick={onPrint} title="Abrir PDF">
                        <FileDown size={16} className="hover:text-green-600" />
                    </Button>
                </div>
            </td>
        </tr>
    );
}
