"use client";

import { Search, ChevronLeft, ChevronRight, Loader, AlertTriangle, Plus, Pencil, Eye, Trash } from "lucide-react";
import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getProveedores, deleteProveedor, updateProveedor } from "@/services/proveedorService";
import { getCatalogosProveedores } from "@/services/configuracionService";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageTitle from "@/components/ui/PageTitle";

import AgregarProveedorView from "./AgregarProveedorView";
import EditarProveedor from "./EditarProveedor";
import VerProveedorView from "./VerProveedorView";

export default function ProveedoresPage() {
    return (
        <Suspense fallback={<ProveedoresPageFallback />}>
            <ProveedoresPageContent />
        </Suspense>
    );
}

function ProveedoresPageFallback() {
    return (
        <div className="flex flex-col items-center justify-center h-64">
            <Loader className="animate-spin text-primary" />
        </div>
    );
}

function ProveedoresPageContent() {
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode");
    const selectedId = searchParams.get("id");

    if (mode === "add") {
        return <AgregarProveedorView />;
    }

    if (mode === "edit" && selectedId) {
        return <EditarProveedor id={selectedId} />;
    }

    if (mode === "view" && selectedId) {
        return <VerProveedorView id={selectedId} />;
    }

    return <ProveedoresListView />;
}

function ProveedoresListView() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");
    const [pendingId, setPendingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({ metodo_pago: "all", estado: "all", giro: "all" });
    const [catalogosProveedor, setCatalogosProveedor] = useState({ giros: [] });
    const [currentPage, setCurrentPage] = useState(1);
    const [confirmModal, setConfirmModal] = useState({
        open: false,
        type: null,
        proveedor: null,
    });

    const pageSize = 10;

    useEffect(() => {
        const loadProveedores = async () => {
            try {
                setLoading(true);
                const [result, catalogos] = await Promise.all([
                    getProveedores(),
                    getCatalogosProveedores(),
                ]);
                setData(Array.isArray(result.data) ? result.data : result);
                setCatalogosProveedor({
                    giros: Array.isArray(catalogos.giros) ? catalogos.giros.filter((item) => item.activo === 1 || item.activo === true) : [],
                });
                setError("");
            } catch {
                setError("Error al cargar proveedores");
                setData([]);
                setCatalogosProveedor({ giros: [] });
            } finally {
                setLoading(false);
            }
        };

        loadProveedores();
    }, []);

    const filteredData = data.filter((proveedor) => {
        const q = searchTerm.toLowerCase();
        const bySearch = (
            String(proveedor.nombre || "").toLowerCase().includes(q) ||
            String(proveedor.rfc || "").toLowerCase().includes(q)
        );

        const byMetodoPago =
            filters.metodo_pago === "all" ||
            String(proveedor.metodo_pago || "").toLowerCase() === filters.metodo_pago;

        const byEstado =
            filters.estado === "all" ||
            String(proveedor.estado || "").toLowerCase() === filters.estado;

        const byGiro =
            filters.giro === "all" ||
            String(proveedor.giro || "").toLowerCase() === filters.giro;

        return bySearch && byMetodoPago && byEstado && byGiro;
    });

    const metodosPagoDisponibles = useMemo(() => {
        return Array.from(new Set(
            data.map((proveedor) => String(proveedor.metodo_pago || "").trim()).filter(Boolean)
        )).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    }, [data]);

    const estadosDisponibles = useMemo(() => {
        return Array.from(new Set(
            data.map((proveedor) => String(proveedor.estado || "").trim()).filter(Boolean)
        )).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    }, [data]);

    const girosDisponibles = useMemo(() => {
        const fromCatalogo = catalogosProveedor.giros
            .map((item) => String(item.nombre || "").trim())
            .filter(Boolean);

        if (fromCatalogo.length > 0) {
            return Array.from(new Set(fromCatalogo)).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
        }

        return Array.from(new Set(
            data.map((proveedor) => String(proveedor.giro || "").trim()).filter(Boolean)
        )).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    }, [catalogosProveedor.giros, data]);

    const totalItems = filteredData.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

    const paginatedData = useMemo(() => {
        const startIndex = (safeCurrentPage - 1) * pageSize;
        return filteredData.slice(startIndex, startIndex + pageSize);
    }, [filteredData, safeCurrentPage]);

    const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
    const endItem = totalItems === 0 ? 0 : Math.min(safeCurrentPage * pageSize, totalItems);

    const maxVisiblePages = 5;
    const startPage = Math.max(
        1,
        Math.min(safeCurrentPage - Math.floor(maxVisiblePages / 2), totalPages - maxVisiblePages + 1)
    );
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    const visiblePages = Array.from(
        { length: endPage - startPage + 1 },
        (_, i) => startPage + i
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filters]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                {error}
            </div>
        );
    }

    const openDeleteModal = (id) => {
        const proveedor = data.find((item) => String(item.id_proveedor ?? item.id) === String(id));
        if (!proveedor) return;
        setConfirmModal({ open: true, type: "delete", proveedor });
    };

    const openToggleStatusModal = (proveedor) => {
        setConfirmModal({ open: true, type: "toggle", proveedor });
    };

    const closeModal = () => {
        setConfirmModal({ open: false, type: null, proveedor: null });
    };

    const handleConfirmAction = async () => {
        const proveedor = confirmModal.proveedor;
        if (!proveedor) return;

        const id = proveedor.id_proveedor ?? proveedor.id;

        try {
            setActionError("");
            setPendingId(id);

            if (confirmModal.type === "delete") {
                await deleteProveedor(id);
                setData((prev) => prev.filter((item) => String(item.id_proveedor ?? item.id) !== String(id)));
            }

            if (confirmModal.type === "toggle") {
                const isActivo = proveedor.activo === 1 || proveedor.activo === "1" || proveedor.activo === true;
                const nextActivo = isActivo ? 0 : 1;
                await updateProveedor(id, { activo: nextActivo });
                setData((prev) => prev.map((item) => (
                    String(item.id_proveedor ?? item.id) === String(id)
                        ? { ...item, activo: nextActivo }
                        : item
                )));
            }

            closeModal();
        } catch (err) {
            setActionError(err.message || "No se pudo completar la acción");
        } finally {
            setPendingId(null);
        }
    };



    return (
        <div>

            {/* Header */}
            <PageTitle
                title="Proveedores"
                subtitle="Lista de proveedores"
                actions={(
                    <Link href="/proveedores?mode=add">
                        <Button variant="primary" className="rounded-xl shadow-sm gap-2"><Plus size={16} />Agregar Proveedor</Button>
                    </Link>
                )}
            />

            {/* Filtros */}
            <div className="p-4 rounded-2xl flex flex-col md:flex-row mb-4 gap-3 md:items-center">

                <ProveedoresFiltersInline
                    value={filters}
                    metodosPago={metodosPagoDisponibles}
                    estados={estadosDisponibles}
                    giros={girosDisponibles}
                    onApply={setFilters}
                    onClear={() => setFilters({ metodo_pago: "all", estado: "all", giro: "all" })}
                />



                <div className="relative inline-block w-full md:w-[460px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <Input
                        type="text"
                        placeholder="Buscar por nombre o RFC del proveedor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        inputClassName="bg-white text-primary w-full py-2.5 pl-10 pr-4 rounded-full"
                    />
                </div>
            </div>

            {/* Tabla de proveedores */}
            {actionError && (
                <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                    {actionError}
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-card border border-border overflow-hidden">
                <ProveedorTableInline
                    data={paginatedData}
                    onDelete={openDeleteModal}
                    onToggleStatus={openToggleStatusModal}
                    pendingId={pendingId}
                />

                <div className="border-t border-border px-4 py-3 bg-white">
                    <p className="text-sm text-muted">
                        {totalItems === 0
                            ? "No hay resultados para mostrar."
                            : `Mostrando ${startItem}-${endItem} de ${totalItems} proveedores`}
                    </p>
                </div>

                {totalPages > 1 && (
                    <div className="border-t border-border px-4 py-3 flex justify-end items-center gap-2 bg-white flex-wrap">
                        {totalPages > maxVisiblePages && (
                            <Button
                                onClick={() => setCurrentPage(1)}
                                disabled={safeCurrentPage === 1}
                                variant="outline"
                                className="h-9 min-w-9 px-2"
                                aria-label="Primera página" >
                                «
                            </Button>
                        )}

                        <Button
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={safeCurrentPage === 1}
                            variant="outline"
                            className="h-9 w-9 p-0"
                            aria-label="Página anterior" >
                            <ChevronLeft size={16} className="mx-auto" />
                        </Button>

                        {visiblePages.map((page) => (
                            <Button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                variant={page === safeCurrentPage ? "tabActive" : "tabIdle"}
                                className="h-9 min-w-9 px-3 border text-sm" >
                                {page}
                            </Button>
                        ))}

                        <Button
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={safeCurrentPage === totalPages}
                            variant="outline"
                            className="h-9 w-9 p-0"
                            aria-label="Página siguiente">
                            <ChevronRight size={16} className="mx-auto" />
                        </Button>

                        {totalPages > maxVisiblePages && (
                            <Button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={safeCurrentPage === totalPages}
                                variant="outline"
                                className="h-9 min-w-9 px-2"
                                aria-label="Última página">
                                »
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {confirmModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-border bg-white shadow-card p-6">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-full bg-red-100 p-2 text-red-700">
                                <AlertTriangle size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-primary">
                                    {confirmModal.type === "delete" ? "Confirmar eliminación" : "Confirmar cambio de estado"}
                                </h3>
                                <p className="text-sm text-muted mt-1">
                                    {confirmModal.type === "delete"
                                        ? `Se eliminará el proveedor ${confirmModal.proveedor?.nombre}. Esta acción no se puede deshacer.`
                                        : (() => {
                                            const isActivo = confirmModal.proveedor?.activo === 1 || confirmModal.proveedor?.activo === "1";
                                            return `El proveedor ${confirmModal.proveedor?.nombre} pasará a ${isActivo ? "Inactivo" : "Activo"}.`;
                                        })()}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <Button
                                onClick={closeModal}
                                disabled={pendingId !== null}
                                variant="outline">
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleConfirmAction}
                                disabled={pendingId !== null}
                                variant="accent">
                                {pendingId !== null ? "Procesando..." : "Confirmar"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ProveedoresFiltersInline({ value, metodosPago, estados, giros, onApply, onClear }) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(value || { metodo_pago: "all", estado: "all", giro: "all" });

    const handleApply = () => {
        onApply?.(draft);
        setOpen(false);
    };

    const handleClear = () => {
        const reset = { metodo_pago: "all", estado: "all", giro: "all" };
        setDraft(reset);
        onClear?.();
        setOpen(false);
    };

    return (
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative inline-block">
                <Button
                    onClick={() => {
                        setDraft(value || { metodo_pago: "all", estado: "all", giro: "all" });
                        setOpen(!open);
                    }}
                    variant="outline"
                    className="bg-white font-medium pl-10 pr-10 py-2.5 rounded-full min-w-[210px] text-left"
                >
                    Filtrar por...
                </Button>

                {open && (
                    <div className="absolute z-20 mt-2 w-[340px] rounded-2xl border border-border bg-white shadow-card p-4">
                        <div className="mb-4">
                            <p className="text-xs text-muted mb-2">Metodo de pago</p>
                            <div className="flex gap-2 flex-wrap">
                                <FilterBtn active={draft.metodo_pago === "all"} onClick={() => setDraft((prev) => ({ ...prev, metodo_pago: "all" }))}>Todos</FilterBtn>
                                {metodosPago.map((valueMetodo) => {
                                    const normalized = valueMetodo.toLowerCase();
                                    return (
                                        <FilterBtn
                                            key={valueMetodo}
                                            active={draft.metodo_pago === normalized}
                                            onClick={() => setDraft((prev) => ({ ...prev, metodo_pago: normalized }))}
                                        >
                                            {valueMetodo}
                                        </FilterBtn>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mb-4">
                            <p className="text-xs text-muted mb-2">Estado</p>
                            <div className="flex gap-2 flex-wrap">
                                <FilterBtn active={draft.estado === "all"} onClick={() => setDraft((prev) => ({ ...prev, estado: "all" }))}>Todos</FilterBtn>
                                {estados.map((valueEstado) => {
                                    const normalized = valueEstado.toLowerCase();
                                    return (
                                        <FilterBtn
                                            key={valueEstado}
                                            active={draft.estado === normalized}
                                            onClick={() => setDraft((prev) => ({ ...prev, estado: normalized }))}
                                        >
                                            {valueEstado}
                                        </FilterBtn>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mb-2">
                            <p className="text-xs text-muted mb-2">Giro</p>
                            <div className="flex gap-2 flex-wrap">
                                <FilterBtn active={draft.giro === "all"} onClick={() => setDraft((prev) => ({ ...prev, giro: "all" }))}>Todos</FilterBtn>
                                {giros.map((valueGiro) => {
                                    const normalized = valueGiro.toLowerCase();
                                    return (
                                        <FilterBtn
                                            key={valueGiro}
                                            active={draft.giro === normalized}
                                            onClick={() => setDraft((prev) => ({ ...prev, giro: normalized }))}
                                        >
                                            {valueGiro}
                                        </FilterBtn>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t flex justify-between">
                            <Button variant="ghost" size="sm" className="text-sm text-muted" onClick={handleClear}>Limpiar</Button>
                            <Button variant="ghost" size="sm" className="text-sm" onClick={handleApply}>Aplicar</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function FilterBtn({ children, active, onClick }) {
    return (
        <Button
            onClick={onClick}
            variant={active ? "tabActive" : "tabIdle"}
            size="sm"
            className="rounded-full border"
        >
            {children}
        </Button>
    );
}

function ProveedorTableInline({ data, onDelete, onToggleStatus, pendingId }) {
    return (
        <table className="w-full text-sm">
            <thead className="bg-background text-primary">
                <tr>
                    <th className="text-left p-3">ID</th>
                    <th className="text-left p-3">Nombre</th>
                    <th className="text-left p-3">Telefono</th>
                    <th className="text-left p-3">Metodo de Pago</th>
                    <th className="text-left p-3">RFC</th>
                    <th className="text-left p-3">Estado</th>
                    <th className="text-center p-3">Acciones</th>
                </tr>
            </thead>

            <tbody>
                {data.length === 0 && (
                    <tr>
                        <td colSpan={7} className="p-6 text-center text-muted">No hay proveedores para mostrar.</td>
                    </tr>
                )}

                {data.map((p) => (
                    <tr key={p.id_proveedor ?? p.id} className="border-t border-border hover:bg-background/60">
                        <td className="p-3">{p.id_proveedor ?? p.id}</td>
                        <td className="p-3">{p.nombre}</td>
                        <td className="p-3">{p.telefono}</td>
                        <td className="p-3">{p.metodo_pago || "-"}</td>
                        <td className="p-3">{p.rfc || "-"}</td>
                        <td className="p-3">
                            {(() => {
                                const isActivo = p.activo === 1 || p.activo === "1" || p.activo === true;
                                return (
                                    <Button
                                        onClick={() => onToggleStatus?.(p)}
                                        disabled={pendingId === (p.id_proveedor ?? p.id)}
                                        variant={isActivo ? "activo" : "inactivo"}
                                        size="sm"
                                        className="rounded-full"
                                    >
                                        {isActivo ? "Activo" : "Inactivo"}
                                    </Button>
                                );
                            })()}
                        </td>

                        <td className="p-3">
                            <div className="flex justify-center text-muted">
                                <Link href={`/proveedores?mode=view&id=${p.id_proveedor ?? p.id}`}>
                                    <Button variant="lightghost" className="p-0 h-auto"><Eye size={18} className="hover:text-primary" /></Button>
                                </Link>
                                <Link href={`/proveedores?mode=edit&id=${p.id_proveedor ?? p.id}`}>
                                    <Button variant="lightghost" className="p-0 h-auto"><Pencil size={18} className="hover:text-yellow-700" /></Button>
                                </Link>
                                <Button variant="lightghost" className="p-0 h-auto" onClick={() => onDelete?.(p.id_proveedor ?? p.id)} disabled={pendingId === (p.id_proveedor ?? p.id)} aria-label="Eliminar proveedor">
                                    <Trash size={18} className="hover:text-red-600" />
                                </Button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}