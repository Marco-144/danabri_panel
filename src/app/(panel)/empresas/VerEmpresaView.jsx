"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Building2, Loader, Pencil, Plus } from "lucide-react";
import { getEmpresaById } from "@/services/empresasService";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";

function fmtDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("es-MX");
}

export default function VerEmpresaView({ id }) {
    const [empresa, setEmpresa] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const isTrueFlag = (value) => value === 1 || value === "1" || value === true;

    useEffect(() => {
        if (!id) return;

        const loadEmpresa = async () => {
            try {
                setLoading(true);
                const result = await getEmpresaById(id);
                setEmpresa(result.data || result);
                setError("");
            } catch {
                setError("No se pudo cargar la empresa");
            } finally {
                setLoading(false);
            }
        };

        loadEmpresa();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="animate-spin text-primary" />
            </div>
        );
    }

    if (error || !empresa) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                {error || "Empresa no encontrada"}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="bg-white border border-border rounded-2xl shadow-card overflow-hidden p-6">
                <PageTitle
                    breadcrumb="Empresas / Detalle"
                    title="Ver Empresa"
                    Icon={Building2}
                    actions={(
                        <div className="flex gap-3">
                            <Link href={`/empresas?mode=edit&id=${empresa.id_empresa}`}>
                                <Button variant="outline" className="rounded-xl shadow-sm">
                                    <Pencil size={16} />
                                    Editar
                                </Button>
                            </Link>
                            <Link href="/empresas?mode=add">
                                <Button variant="accent" className="rounded-xl shadow-sm">
                                    <Plus size={16} />
                                    Nueva Empresa                                
                                </Button>
                            </Link>
                            <Link href="/empresas">
                                <Button variant="primary" className="rounded-xl shadow-sm">
                                    <ArrowLeft size={18} />
                                    Regresar
                                </Button>
                            </Link>
                        </div>
                    )}
                />
            </section>
            
            <div className="flex gap-4 items-start">

                {/* Sidebar */}
                <aside className="w-[252px] shrink-0 sticky top-4 bg-white rounded-xl border border-slate-200/80 -sm overflow-hidden">
                    <div className="bg-primary px-6 py-6 flex flex-col items-center text-center">
                        {/* Avatar con inicial del nombre */}
                        <div className="w-[60px] h-[60px] rounded-full bg-white/20 flex items-center justify-center mb-3 ring-2 ring-white/30">
                            <span className="text-[18px] font-bold text-white tracking-wide font-oswald" >
                                {empresa.nombre.charAt(0)}
                            </span>
                        </div>
                        <h2 className="text-white text-md font-semibold leading-snug font-oswald">
                            {empresa.nombre}
                        </h2>
                        <p className="text-white/55 text-xs mt-0.5 leading-snug">Empresa Corporativa</p>
                        <span className={`mt-3 inline-flex items-center rounded-full font-medium px-3 py-1 text-xs ${isTrueFlag(empresa.activo)
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-red-50 text-red-700 ring-1 ring-red-200"
                            }`}>
                            {isTrueFlag(empresa.activo) ? "Activo" : "Inactivo"}
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
                                    ${empresa.total_ventas ? Number(empresa.total_ventas).toLocaleString("es-MX", { style: "currency", currency: "MXN" }) : "0"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Última venta</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0">
                                    {empresa.ultima_compra ? new Date(empresa.ultima_compra).toLocaleDateString("es-MX") : "N/A"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
                                <span className="text-sm text-slate-500 leading-snug">Saldo Pendiente</span>
                                <span className="text-sm font-semibold text-slate-800 shrink-0">
                                    ${empresa.saldo_pendiente ? Number(empresa.saldo_pendiente).toLocaleString("es-MX", { style: "currency", currency: "MXN" }) : "0"}
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
                                Datos generales
                            </h3>

                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Razón Social</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{empresa.nombre_fiscal}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Nombre Comercial</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{empresa.nombre}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Giro</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{empresa.giro || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Estado</p>
                                    <span className={`inline-flex items-center rounded-full font-medium px-4 py-1 text-sm ${isTrueFlag(empresa.activo)
                                        ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                                        : 'bg-red-50 text-red-700 ring-1 ring-red-200'
                                        }`}>
                                         {isTrueFlag(empresa.activo) ? "Activo" : "Inactivo"}
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
                                    <p className="text-[15px] text-slate-700 font-medium">{empresa.rfc || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Uso CFDI</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{empresa.uso_cfdi || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Régimen Fiscal</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{empresa.regimen_fiscal || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Cuenta Bancaria</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{empresa.cuenta_bancaria || "-"}</p>
                                </div>
                            </div>
                        </section>

                        <section className="px-8 py-6 border-b border-middleborder">
                            <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-slate-400 mb-5 font-oswald">
                                Dirección Fiscal
                            </h3>

                             <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Calle</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{empresa.calle || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Núm. Exterior</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{empresa.numero_exterior || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Núm. Interior</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{empresa.numero_interior || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Colonia</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{empresa.colonia || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Ciudad</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{empresa.ciudad || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Estado</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{empresa.estado || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">Código Postal</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{empresa.cp || "-"}</p>
                                </div>
                                <div className="border-b border-middleborder rounded-lg bg-white mr-4 px-4 py-3 hover:bg-slate-100 transition-colors cursor-default">
                                    <p className="text-[12px] font-bold uppercase tracking-[0.05em] text-slate-400 mb-0.5">País</p>
                                    <p className="text-[15px] text-slate-700 font-medium">{empresa.pais || "-"}</p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>  
            </div>
        </div>
    );
}