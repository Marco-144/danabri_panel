"use client";
// Vista de detalle de cliente.
// Obtiene datos por ID y muestra ficha completa.

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, UserRoundSearch, Loader, Plus, Pencil } from "lucide-react";
import Link from "next/link";
import { getClienteById } from "@/services/clientsService";
import { getCatalogosClientes } from "@/services/configuracionService";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";

export default function VerClienteView({ id: propId }) {
    const params = useParams();
    const id = propId ?? params?.id;
    const [cliente, setCliente] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [catalogos, setCatalogos] = useState({ tipos_cliente: [] });

    const isTrueFlag = (value) => value === 1 || value === "1" || value === true;

    useEffect(() => {
        const loadCatalogos = async () => {
            try {
                const data = await getCatalogosClientes();
                setCatalogos({
                    tipos_cliente: Array.isArray(data.tipos_cliente)
                        ? data.tipos_cliente.filter((item) => item.activo === 1 || item.activo === true)
                        : [],
                });
            } catch {
                setCatalogos({ tipos_cliente: [] });
            }
        };

        loadCatalogos();
    }, []);

    useEffect(() => {
        if (!id) return;

        // Carga el registro para visualizacion en modo detalle.
        const loadCliente = async () => {
            try {
                setLoading(true);
                const data = await getClienteById(id);
                setCliente(data.data || data);
                setError("");
            } catch {
                setError("No se pudo cargar el cliente");
            } finally {
                setLoading(false);
            }
        };

        loadCliente();
    }, [id]);

    const tipoClienteMeta = useMemo(() => {
        const tipo = String(cliente?.tipo_cliente || "").trim().toLowerCase();
        return catalogos.tipos_cliente.find((item) => String(item.nombre || "").trim().toLowerCase() === tipo) || null;
    }, [catalogos.tipos_cliente, cliente?.tipo_cliente]);

    const nivelPrecioLabel = tipoClienteMeta ? `Precio ${tipoClienteMeta.nivel_precio}` : "-";

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="animate-spin text-primary" />
            </div>
        );
    }

    if (error || !cliente) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                {error || "Cliente no encontrado"}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="bg-white border border-border rounded-2xl shadow-card overflow-hidden p-6">
                <PageTitle
                    breadcrumb="Clientes / Detalle"
                    title="Ver Cliente"
                    Icon={UserRoundSearch}
                    actions={(
                        <div className="flex gap-3">
                            <Link href={`/clientes?mode=edit&id=${cliente.id_cliente}`}>
                                <Button variant="outline" size="md" className="rounded-xl shadow-sm">
                                    <Pencil size={16} />
                                    Editar
                                </Button>
                            </Link>
                            <Link href="/clientes?mode=add">
                                <Button variant="accent" size="md" className="rounded-xl shadow-sm">
                                    <Plus size={16} />
                                    Nuevo Cliente
                                </Button>
                            </Link>
                            <Link href="/clientes">
                                <Button variant="primary" size="md" className="rounded-xl shadow-sm">
                                    <ArrowLeft size={18} />
                                    Regresar
                                </Button>
                            </Link>
                        </div>
                    )}
                />
            </section>

            {/* Body */}
            <div className="flex gap-4 items-start">

                {/* Sidebar */}
                <aside className="w-[252px] shrink-0 sticky top-4 bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="bg-primary px-6 py-6 flex flex-col items-center text-center">
                        {/* Avatar con inicial del nombre */}
                        <div className="w-[60px] h-[60px] rounded-full bg-white/20 flex items-center justify-center mb-3 ring-2 ring-white/30">
                            <span className="text-[18px] font-bold text-white tracking-wide font-oswald">
                                {cliente.nombre.charAt(0)}
                            </span>
                        </div>
                        <h2 className="text-white font-semibold text-md leading-snug font-oswald">
                            {cliente.nombre}
                        </h2>
                        <p className="text-white/55 text-xs mt-0.5 leading-snug">Ficha completa del cliente</p>
                        <span className={`mt-3 inline-flex items-center rounded-full font-medium px-3 py-1 text-xs ${isTrueFlag(cliente.activo)
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                            : 'bg-red-50 text-red-700 ring-1 ring-red-200'
                            }`}>
                            {isTrueFlag(cliente.activo) ? "Activo" : "Inactivo"}
                        </span>
                    </div>

                    {/* KPI's */}
                    <div className="p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.10em] text-slate-400 mb-2.5 px-1">
                            Indicadores clave
                        </p>
                        <div className="space-y-0.5">
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Total ventas</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0">
                                    ${cliente.total_ventas ? Number(cliente.total_ventas).toLocaleString("es-MX", { style: "currency", currency: "MXN" }) : "0"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Última venta</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0">
                                    {cliente.ultima_compra ? new Date(cliente.ultima_compra).toLocaleDateString("es-MX") : "N/A"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Saldo Pendiente</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0">
                                    ${cliente.saldo_pendiente ? Number(cliente.saldo_pendiente).toLocaleString("es-MX", { style: "currency", currency: "MXN" }) : "0"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Días de crédito</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0">
                                    {cliente.dias_credito !== undefined ? `${cliente.dias_credito} días` : "N/A"}
                                </span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Content */}
                <div className="flex-1 min-w-0 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-100">
                        <section className="px-8 py-6 border-b border-middleborder">
                            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 mb-5 font-oswald">
                                Perfil Completo
                            </h3>

                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Nombre</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{cliente.nombre}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Giro</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{cliente.giro || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Nivel de Precio</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{nivelPrecioLabel}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Días de Ruta</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{cliente.dias_ruta ?? cliente.dias_rutas ?? "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-1">Facturar sin Pagar</p>
                                    <span className={`inline-flex items-center rounded-full font-medium px-4 py-1 text-xs ${isTrueFlag(cliente.facturar_sin_pagar)
                                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                        : 'bg-red-50 text-red-700 ring-1 ring-red-200'
                                        }`}>
                                         {isTrueFlag(cliente.facturar_sin_pagar) ? "Sí" : "No"}
                                    </span>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-1">Crédito</p>
                                    <span className={`inline-flex items-center rounded-full font-medium px-4 py-1 text-xs ${isTrueFlag(cliente.credito_habilitado)
                                        ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                                        : 'bg-red-50 text-red-700 ring-1 ring-red-200'
                                        }`}>
                                         {isTrueFlag(cliente.credito_habilitado) ? "Habilitado" : "Deshabilitado"}
                                    </span>
                                </div>
                            </div>
                        </section>

                        <section className="px-8 py-6 border-b border-middleborder">
                            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 mb-5 font-oswald">
                                Datos Fiscales
                            </h3>

                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">RFC</p>
                                    <p className="text-[15px] text-slate-700">{cliente.rfc || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">CURP</p>
                                    <p className="text-sm text-slate-700">{cliente.curp || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Uso CFDI</p>
                                    <p className="text-sm text-slate-700 font-medium">{cliente.uso_cfdi || "-"}</p>
                                </div>
                                {/* <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-1.5">Regimen Fiscal</p>
                                    <p className="text-sm text-slate-700">{cliente.regimen_fiscal || "-"}</p>
                                </div> */}
                            </div>
                        </section>

                        <section className="px-8 py-6 border-b border-middleborder">
                            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 mb-5 font-oswald">
                                Crédito y Cobranza
                            </h3>

                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-1">Crédito habilitado</p>
                                    <span className={`inline-flex items-center rounded-full font-medium px-4 py-1 text-xs ${isTrueFlag(cliente.credito_habilitado)
                                        ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                                        : 'bg-red-50 text-red-700 ring-1 ring-red-200'
                                        }`}>
                                         {isTrueFlag(cliente.credito_habilitado) ? "Sí" : "No"}
                                    </span>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Límite de crédito</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{cliente.limite_credito ? `${Number(cliente.limite_credito).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}` : "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Días de crédito</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{`${cliente.dias_credito} días` ?? "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Saldo pendiente</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{cliente.saldo_pendiente ? `${Number(cliente.saldo_pendiente).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}` : "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Crédito Excedido</p>
                                    <p className="text-[15px] text-slate-700 font-medium">— {isTrueFlag(cliente.credito_excedido) ? "Excedido" : "No"}</p>
                                </div>
                            </div>
                        </section>

                        <section className="px-8 py-6">
                            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 mb-5 font-oswald">
                                Contacto y Dirección
                            </h3>
                            
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Teléfono</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{cliente.telefono || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Correo</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{cliente.email || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Código Postal</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{cliente.cp || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Calle</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{cliente.calle || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Número exterior</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{cliente.num_exterior || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Número interior</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{cliente.num_interior || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Colonia</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{cliente.colonia || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Ciudad</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{cliente.ciudad || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Estado</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{cliente.estado || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">País</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{cliente.pais || "-"}</p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
