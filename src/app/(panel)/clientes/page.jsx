"use client";
// Entrada principal del modulo de clientes.
// Soporta modos por query: listado, alta, edicion y detalle.


import { Search, ChevronLeft, ChevronRight, Loader, AlertTriangle, Plus, Pencil, Eye, Trash } from "lucide-react";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getClientes, deleteCliente, updateCliente } from "@/services/clientsService";
import { getCatalogosClientes } from "@/services/configuracionService";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageTitle from "@/components/ui/PageTitle";

import AgregarClientesView from "./AgregarClientesView";
import EditarClientes from "./EditarClientes";
import VerClienteView from "./VerClienteView";

export default function ClientesPage() {
  return (
    <Suspense fallback={<ClientesPageFallback />}>
      <ClientesPageContent />
    </Suspense>
  );
}

function ClientesPageFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader className="animate-spin text-primary" />
    </div>
  );
}

function ClientesPageContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const selectedId = searchParams.get("id");

  if (mode === "add") {
    return <AgregarClientesView />;
  }

  if (mode === "edit" && selectedId) {
    return <EditarClientes id={selectedId} />;
  }

  if (mode === "view" && selectedId) {
    return <VerClienteView id={selectedId} />;
  }

  return <ClientesListView />;
}

function ClientesListView() {
  // Estado de datos, UI y acciones sobre clientes.

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [pendingId, setPendingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: null,
    client: null,
  });
  const [filters, setFilters] = useState({
    tipo_cliente: "all",
    giro: "all",
    activo: "all",
  });
  const [catalogos, setCatalogos] = useState({ giros: [], tipos_cliente: [] });
  const pageSize = 10;

  useEffect(() => {
    // Carga inicial de clientes desde la API.
    const loadClientes = async () => {
      try {
        setLoading(true);
        const result = await getClientes();
        setData(Array.isArray(result.data) ? result.data : result);
        setError("");
      } catch {
        setError("Error al cargar clientes");
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    loadClientes();
  }, []);

  useEffect(() => {
    const loadCatalogos = async () => {
      try {
        const result = await getCatalogosClientes();
        setCatalogos({
          giros: Array.isArray(result.giros) ? result.giros.filter((item) => item.activo === 1 || item.activo === true) : [],
          tipos_cliente: Array.isArray(result.tipos_cliente) ? result.tipos_cliente.filter((item) => item.activo === 1 || item.activo === true) : [],
        });
      } catch {
        setCatalogos({ giros: [], tipos_cliente: [] });
      }
    };

    loadCatalogos();
  }, []);

  const filteredData = data.filter(
    (cliente) => {
      // Filtros combinados: busqueda, tipo y estado.
      const bySearch =
        cliente.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.rfc?.toLowerCase().includes(searchTerm.toLowerCase());

      const byTipo =
        filters.tipo_cliente === "all" ||
        String(cliente.tipo_cliente).toLowerCase() === filters.tipo_cliente;

      const byGiro =
        filters.giro === "all" ||
        String(cliente.giro || "").toLowerCase() === filters.giro;

      const isActivo = cliente.activo === 1 || cliente.activo === "1";
      const byActivo =
        filters.activo === "all" ||
        (filters.activo === "activo" && isActivo) ||
        (filters.activo === "inactivo" && !isActivo);

      return bySearch && byTipo && byGiro && byActivo;
    }
  );

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
    // Reinicia a pagina 1 cuando cambia busqueda o filtros.
    setCurrentPage(1);
  }, [searchTerm, filters]);

  useEffect(() => {
    if (currentPage < 1) {
      setCurrentPage(1);
      return;
    }

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const tiposClienteDisponibles = Array.from(
    new Set(
      data
        .map((cliente) => String(cliente.tipo_cliente || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

  const girosDisponibles = catalogos.giros
    .map((giro) => String(giro.nombre || "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

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
    // Abre modal para confirmar eliminacion.
    const client = data.find((item) => String(item.id_cliente ?? item.id) === String(id));
    if (!client) return;
    setConfirmModal({ open: true, type: "delete", client });
  };

  const openToggleStatusModal = (client) => {
    // Abre modal para confirmar cambio activo/inactivo.
    setConfirmModal({ open: true, type: "toggle", client });
  };

  const closeModal = () => {
    setConfirmModal({ open: false, type: null, client: null });
  };

  const handleConfirmAction = async () => {
    // Ejecuta accion confirmada en modal: eliminar o cambiar estado.
    const client = confirmModal.client;
    if (!client) return;

    const id = client.id_cliente ?? client.id;

    try {
      setActionError("");
      setPendingId(id);

      if (confirmModal.type === "delete") {
        await deleteCliente(id);
        setData((prev) => prev.filter((item) => String(item.id_cliente ?? item.id) !== String(id)));
      }

      if (confirmModal.type === "toggle") {
        const isActivo = client.activo === 1 || client.activo === "1";
        const nextActivo = isActivo ? 0 : 1;
        await updateCliente(id, { activo: nextActivo });
        setData((prev) => prev.map((item) => (
          String(item.id_cliente ?? item.id) === String(id)
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
        title="Clientes"
        subtitle="Lista de clientes"
        actions={(
          <Link href="/clientes?mode=add">
            <Button variant="primary" className="rounded-xl shadow-sm gap-2"><Plus size={16} />Agregar Cliente</Button>
          </Link>
        )}
      />

      {/* Filtros */}
      <div className="p-4 rounded-2xl flex flex-col md:flex-row mb-4 gap-3 md:items-center">
        <ClientesFiltersInline
          value={filters}
          giros={girosDisponibles}
          tiposCliente={tiposClienteDisponibles}
          onApply={setFilters}
          onClear={() => setFilters({ tipo_cliente: "all", giro: "all", activo: "all" })}
        />

        <div className="relative inline-block w-full md:w-[460px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <Input
            type="text"
            placeholder="Buscar por nombre o RFC del cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            inputClassName="bg-white text-primary w-full py-2.5 pl-10 pr-4 rounded-full"
          />
        </div>
      </div>

      {/* Tabla de clientes */}
      {actionError && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {actionError}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card border border-border overflow-hidden">
        <ClienteTableInline
          data={paginatedData}
          onDelete={openDeleteModal}
          onToggleStatus={openToggleStatusModal}
          pendingId={pendingId}
        />

        <div className="border-t border-border px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white flex-wrap">
          <p className="text-sm text-muted">
            {totalItems === 0
              ? "No hay resultados para mostrar."
              : `Mostrando ${startItem}-${endItem} de ${totalItems} clientes`}
          </p>

          {totalPages > 1 && (
            <div className="flex justify-end items-center gap-2 flex-wrap">
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
                    ? `Se eliminará el cliente ${confirmModal.client?.nombre}. Esta acción no se puede deshacer.`
                    : (() => {
                      const isActivo = confirmModal.client?.activo === 1 || confirmModal.client?.activo === "1";
                      return `El cliente ${confirmModal.client?.nombre} pasará a ${isActivo ? "Inactivo" : "Activo"}.`;
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

function ClientesFiltersInline({ value, giros = [], tiposCliente = [], onApply, onClear }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || { tipo_cliente: "all", giro: "all", activo: "all" });

  const handleApply = () => {
    onApply?.(draft);
    setOpen(false);
  };

  const handleClear = () => {
    const reset = { tipo_cliente: "all", giro: "all", activo: "all" };
    setDraft(reset);
    onClear?.();
    setOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row mb-4 gap-3 md:items-center translate-y-2">
      <div className="relative inline-block">
        <Button
          onClick={() => {
            setDraft(value || { tipo_cliente: "all", giro: "all", activo: "all" });
            setOpen(!open);
          }}
          variant="outline"
          className="bg-white font-medium pl-10 pr-10 py-2.5 rounded-full min-w-[210px] text-left"
        >
          Filtrar por...
        </Button>

        {open && (
          <div className="absolute z-20 mt-2 w-[290px] rounded-2xl border border-border bg-white shadow-card p-4">
            <div className="mb-4">
              <p className="text-xs text-muted mb-2">Tipo cliente</p>
              <div className="flex gap-2 flex-wrap">
                <FilterBtn active={draft.tipo_cliente === "all"} onClick={() => setDraft((prev) => ({ ...prev, tipo_cliente: "all" }))}>Todos</FilterBtn>
                {tiposCliente.map((tipo) => {
                  const valueTipo = tipo.toLowerCase();
                  return (
                    <FilterBtn
                      key={tipo}
                      active={draft.tipo_cliente === valueTipo}
                      onClick={() => setDraft((prev) => ({ ...prev, tipo_cliente: valueTipo }))}>
                      {tipo}
                    </FilterBtn>
                  );
                })}
              </div>
            </div>

            <div className="mb-2">
              <p className="text-xs text-muted mb-2">Giro</p>
              <div className="flex gap-2 flex-wrap">
                <FilterBtn active={draft.giro === "all"} onClick={() => setDraft((prev) => ({ ...prev, giro: "all" }))}>Todos</FilterBtn>
                {giros.map((giro) => {
                  const valueGiro = giro.toLowerCase();
                  return (
                    <FilterBtn
                      key={giro}
                      active={draft.giro === valueGiro}
                      onClick={() => setDraft((prev) => ({ ...prev, giro: valueGiro }))}>
                      {giro}
                    </FilterBtn>
                  );
                })}
              </div>
            </div>

            <div className="mb-2">
              <p className="text-xs text-muted mb-2">Estado</p>
              <div className="flex gap-2">
                <FilterBtn active={draft.activo === "all"} onClick={() => setDraft((prev) => ({ ...prev, activo: "all" }))}>Todos</FilterBtn>
                <FilterBtn active={draft.activo === "activo"} onClick={() => setDraft((prev) => ({ ...prev, activo: "activo" }))}>Activo</FilterBtn>
                <FilterBtn active={draft.activo === "inactivo"} onClick={() => setDraft((prev) => ({ ...prev, activo: "inactivo" }))}>Inactivo</FilterBtn>
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

function ClienteTableInline({ data, onDelete, onToggleStatus, pendingId }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-background text-primary">
        <tr>
          <th className="text-left p-3">Nombre</th>
          <th className="text-left p-3">Giro</th>
          <th className="text-left p-3">Telefono</th>
          <th className="text-left p-3">Tipo</th>
          <th className="text-left p-3">Dias de Ruta</th>
          <th className="text-left p-3">Estado</th>
          <th className="text-center p-3">Acciones</th>
        </tr>
      </thead>

      <tbody>
        {data.length === 0 && (
          <tr>
            <td colSpan={6} className="p-6 text-center text-muted">No hay clientes para mostrar.</td>
          </tr>
        )}

        {data.map((c) => (
          <tr key={c.id_cliente ?? c.id} className="border-t border-border hover:bg-background/60">
            <td className="p-3">{c.nombre}</td>
            <td className="p-3">{c.giro}</td>
            <td className="p-3">{c.telefono}</td>
            <td className="p-3">{c.tipo_cliente}</td>
            <td className="p-3">{c.dias_rutas || "-"}</td>
            <td className="p-3">
              {(() => {
                const isActivo = c.activo === 1 || c.activo === "1";
                return (
                  <Button
                    onClick={() => onToggleStatus?.(c)}
                    disabled={pendingId === (c.id_cliente ?? c.id)}
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
                <Link href={`/clientes?mode=view&id=${c.id_cliente ?? c.id}`}>
                  <Button variant="lightghost" className="p-0 h-auto"><Eye size={18} className="hover:text-primary" /></Button>
                </Link>
                <Link href={`/clientes?mode=edit&id=${c.id_cliente ?? c.id}`}>
                  <Button variant="lightghost" className="p-0 h-auto"><Pencil size={18} className="hover:text-yellow-700" /></Button>
                </Link>
                <Button variant="lightghost" className="p-0 h-auto" onClick={() => onDelete?.(c.id_cliente ?? c.id)} disabled={pendingId === (c.id_cliente ?? c.id)} aria-label="Eliminar cliente">
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
