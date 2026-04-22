"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, FileText, Loader, Pencil, Plus, ReceiptText, Search, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PageTitle from "@/components/ui/PageTitle";
import {
    deleteRemisionEmpresa,
    facturarRemisionEmpresa,
    getRemisionesEmpresas,
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
    const [estado, setEstado] = useState("");
    const [facturada, setFacturada] = useState("");
    const [facturaModal, setFacturaModal] = useState({ open: false, row: null });
    const [facturaForm, setFacturaForm] = useState({
        folio_factura: "",
        fecha_factura: new Date().toISOString().slice(0, 10),
        correo_destino: "",
        metodo_pago: "PUE",
        forma_pago: "03",
        uso_cfdi: "G03",
        regimen_fiscal: "601",
        observaciones: "",
    });

    async function loadData() {
        try {
            setLoading(true);
            const data = await getRemisionesEmpresas({ search, estado, facturada });
            setRows(Array.isArray(data) ? data : []);
            setError("");
        } catch (e) {
            setRows([]);
            setError(e.message || "No se pudieron cargar las remisiones");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

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

        try {
            await facturarRemisionEmpresa(facturaModal.row.id_remision_empresa, facturaForm);
            setFacturaModal({ open: false, row: null });
            await loadData();
        } catch (e) {
            setError(e.message || "No se pudo facturar la remision");
        }
    }

    return (
        <div className="space-y-5">
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

            <div className="p-4 flex flex-col xl:flex-row gap-3 xl:items-end bg-white rounded-2xl border border-border shadow-card">
                <div className="relative w-full xl:w-[460px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por folio, empresa, RFC o factura"
                        inputClassName="pl-9"
                    />
                </div>

                <Select
                    label="Estado"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    options={[
                        { value: "", label: "Todos" },
                        { value: "pendiente", label: "Pendiente" },
                        { value: "parcial", label: "Parcial" },
                        { value: "pagada", label: "Pagada" },
                        { value: "cancelada", label: "Cancelada" },
                    ]}
                />

                <Select
                    label="Facturada"
                    value={facturada}
                    onChange={(e) => setFacturada(e.target.value)}
                    options={[
                        { value: "", label: "Todas" },
                        { value: "1", label: "Facturadas" },
                        { value: "0", label: "Sin factura" },
                    ]}
                />

                <Button onClick={loadData}>Filtrar</Button>
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
                                <td className="p-3 text-center">{row.facturada ? (row.folio_factura || "Si") : "No"}</td>
                                <td className="p-3">
                                    <div className="flex justify-center gap-1">
                                        <Link href={`/empresas/remisiones?mode=view&id=${row.id_remision_empresa}`}>
                                            <Button variant="lightghost" className="p-1.5 h-auto" title="Ver">
                                                <Eye size={16} />
                                            </Button>
                                        </Link>
                                        <Link href={`/empresas/remisiones?mode=edit&id=${row.id_remision_empresa}`}>
                                            <Button variant="lightghost" className="p-1.5 h-auto" title="Editar">
                                                <Pencil size={16} />
                                            </Button>
                                        </Link>
                                        {!row.facturada ? (
                                            <Button
                                                variant="lightghost"
                                                className="p-1.5 h-auto"
                                                title="Facturar"
                                                onClick={() => {
                                                    setFacturaModal({ open: true, row });
                                                    setFacturaForm((prev) => ({
                                                        ...prev,
                                                        folio_factura: row.folio_factura || "",
                                                        correo_destino: "",
                                                    }));
                                                }}
                                            >
                                                <FileText size={16} />
                                            </Button>
                                        ) : null}
                                        <Link href={`/empresas/abonos?id_remision_empresa=${row.id_remision_empresa}`}>
                                            <Button variant="lightghost" className="p-1.5 h-auto" title="Abonos">
                                                <ReceiptText size={16} />
                                            </Button>
                                        </Link>
                                        <Button variant="lightghost" className="p-1.5 h-auto text-red-600" title="Eliminar" onClick={() => handleDelete(row)}>
                                            <Trash2 size={16} />
                                        </Button>
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Folio factura *" value={facturaForm.folio_factura} onChange={(e) => setFacturaForm((prev) => ({ ...prev, folio_factura: e.target.value }))} />
                            <Input label="Fecha factura *" type="date" value={facturaForm.fecha_factura} onChange={(e) => setFacturaForm((prev) => ({ ...prev, fecha_factura: e.target.value }))} />
                            <Input label="Correo destino" value={facturaForm.correo_destino} onChange={(e) => setFacturaForm((prev) => ({ ...prev, correo_destino: e.target.value }))} />
                            <Select
                                label="Metodo pago *"
                                value={facturaForm.metodo_pago}
                                onChange={(e) => setFacturaForm((prev) => ({ ...prev, metodo_pago: e.target.value }))}
                                options={[{ value: "PUE", label: "PUE" }, { value: "PPD", label: "PPD" }]}
                            />
                            <Select
                                label="Forma pago *"
                                value={facturaForm.forma_pago}
                                onChange={(e) => setFacturaForm((prev) => ({ ...prev, forma_pago: e.target.value }))}
                                options={[
                                    { value: "01", label: "01 - Efectivo" },
                                    { value: "03", label: "03 - Transferencia" },
                                    { value: "04", label: "04 - Tarjeta credito" },
                                    { value: "28", label: "28 - Tarjeta debito" },
                                    { value: "99", label: "99 - Por definir" },
                                ]}
                            />
                            <Select
                                label="Uso CFDI *"
                                value={facturaForm.uso_cfdi}
                                onChange={(e) => setFacturaForm((prev) => ({ ...prev, uso_cfdi: e.target.value }))}
                                options={[
                                    { value: "G01", label: "G01" },
                                    { value: "G03", label: "G03" },
                                    { value: "S01", label: "S01" },
                                ]}
                            />
                            <Select
                                label="Regimen fiscal *"
                                value={facturaForm.regimen_fiscal}
                                onChange={(e) => setFacturaForm((prev) => ({ ...prev, regimen_fiscal: e.target.value }))}
                                options={[
                                    { value: "601", label: "601" },
                                    { value: "603", label: "603" },
                                    { value: "612", label: "612" },
                                    { value: "626", label: "626" },
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
