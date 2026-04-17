"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader, Store, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { getProveedorById } from "@/services/suppliersService";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import FieldCard from "@/components/ui/FieldCard";

export default function VerProveedorView({ id: propId }) {
    const params = useParams();
    const id = propId ?? params?.id;
    const [proveedor, setProveedor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!id) return;

        const loadProveedor = async () => {
            try {
                setLoading(true);
                const data = await getProveedorById(id);
                setProveedor(data.data || data);
                setError("");
            } catch {
                setError("No se pudo cargar el proveedor");
            } finally {
                setLoading(false);
            }
        };

        loadProveedor();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="animate-spin text-primary" />
            </div>
        );
    }

    if (error || !proveedor) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                {error || "Proveedor no encontrado"}
            </div>
        );
    }

    const isActivo = proveedor.activo === 1 || proveedor.activo === "1" || proveedor.activo === true;

    return (
        <div className="space-y-6">
            <PageTitle
                breadcrumb="Proveedores / Detalle"
                title="Ver Proveedor"
                icon={Store}
                actions={(
                    <Link href="/proveedores">
                        <Button variant="primary" size="lg" className="rounded-xl shadow-sm">
                            <ArrowLeft size={18} />
                            Regresar
                        </Button>
                    </Link>
                )}
            />

            <section className="bg-white border border-border rounded-2xl shadow-card overflow-hidden">
                <header className="bg-background px-6 py-5 border-b border-border">
                    <h2 className="text-xl font-semibold text-primary">{proveedor.nombre}</h2>
                    <p className="text-sm text-muted mt-1">Ficha completa del proveedor</p>
                </header>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <FieldCard label="ID" value={proveedor.id_proveedor} />
                    <FieldCard label="Nombre" value={proveedor.nombre} />
                    <FieldCard label="Telefono" value={proveedor.telefono} />
                    <FieldCard label="Correo" value={proveedor.email || "-"} />
                    <FieldCard label="RFC" value={proveedor.rfc || "-"} />
                    <FieldCard label="Metodo de pago" value={proveedor.metodo_pago || "-"} />
                    <FieldCard label="Cuenta bancaria" value={proveedor.cuenta_bancaria || "-"} />
                    <FieldCard label="Calle" value={proveedor.calle || "-"} />
                    <FieldCard label="N° Ext." value={proveedor.num_exterior || "-"} />
                    <FieldCard label="N° Int." value={proveedor.num_interior || "-"} />
                    <FieldCard label="Colonia" value={proveedor.colonia || "-"} />
                    <FieldCard label="CP" value={proveedor.cp || "-"} />
                    <FieldCard label="Ciudad" value={proveedor.ciudad || "-"} />
                    <FieldCard label="Estado" value={proveedor.estado || "-"} />
                    <FieldCard label="Pais" value={proveedor.pais || "-"} />
                    <FieldCard
                        label="Estado registro"
                        value={(
                            <span className={`inline-flex items-center rounded-lg px-3.5 py-1 text-sm font-semibold ${isActivo ? "bg-activo text-white" : "bg-inactivo text-white"}`}>
                                {isActivo ? "Activo" : "Inactivo"}
                            </span>
                        )}
                    />
                </div>
            </section>

            <div className="flex justify-end gap-3">
                <Link href={`/proveedores?mode=edit&id=${proveedor.id_proveedor}`}>
                    <Button variant="outline">
                        <Pencil size={16} />
                        Editar
                    </Button>
                </Link>
                <Link href="/proveedores?mode=add">
                    <Button variant="accent">
                        <Plus size={16} />
                        Nuevo Proveedor
                    </Button>
                </Link>
            </div>
        </div>
    );
}
