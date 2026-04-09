"use client";
// Vista de detalle de cliente.
// Obtiene datos por ID y muestra ficha completa.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, UserRoundSearch, Loader } from "lucide-react";
import Link from "next/link";
import { getClienteById } from "@/services/clientsService";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import FieldCard from "@/components/ui/FieldCard";

export default function VerClienteView({ id: propId }) {
    const params = useParams();
    const id = propId ?? params?.id;
    const [cliente, setCliente] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const isTrueFlag = (value) => value === 1 || value === "1" || value === true;

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
            <PageTitle
                breadcrumb="Clientes / Detalle"
                title="Ver Cliente"
                icon={UserRoundSearch}
                actions={(
                    <Link href="/clientes">
                        <Button variant="primary" size="lg" className="rounded-xl shadow-sm">
                            <ArrowLeft size={18} />
                            Regresar
                        </Button>
                    </Link>
                )}
            />

            <section className="bg-white border border-border rounded-2xl shadow-card overflow-hidden">
                <header className="bg-background px-6 py-5 border-b border-border">
                    <h2 className="text-xl font-semibold text-primary">{cliente.nombre}</h2>
                    <p className="text-sm text-muted mt-1">Ficha completa del cliente</p>
                </header>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <FieldCard label="Nombre" value={cliente.nombre} />
                    <FieldCard label="Giro" value={cliente.giro} />
                    <FieldCard label="Tipo de cliente" value={cliente.tipo_cliente} />
                    <FieldCard label="RFC" value={cliente.rfc} />
                    <FieldCard label="CURP" value={cliente.curp} />
                    <FieldCard label="Uso CFDI" value={cliente.uso_cfdi} />
                    <FieldCard label="Teléfono" value={cliente.telefono} />
                    <FieldCard label="Correo" value={cliente.email || "-"} />
                    <FieldCard label="Calle" value={cliente.calle} />
                    <FieldCard label="Número exterior" value={cliente.num_exterior} />
                    <FieldCard label="Número interior" value={cliente.num_interior || "-"} />
                    <FieldCard label="Colonia" value={cliente.colonia} />
                    <FieldCard label="Código postal" value={cliente.cp} />
                    <FieldCard label="Ciudad" value={cliente.ciudad} />
                    <FieldCard label="Estado" value={cliente.estado} />
                    <FieldCard label="País" value={cliente.pais} />
                    <FieldCard label="Días de ruta" value={cliente.dias_ruta ?? cliente.dias_rutas ?? "-"} />
                    <FieldCard label="Crédito habilitado" value={isTrueFlag(cliente.credito_habilitado) ? "Sí" : "No"} />
                    <FieldCard label="Facturar sin pagar" value={isTrueFlag(cliente.facturar_sin_pagar) ? "Sí" : "No"} />
                    <FieldCard
                        label="Límite de crédito"
                        value={cliente.limite_credito ? `$${Number(cliente.limite_credito).toFixed(2)}` : "-"}
                    />
                    <FieldCard label="Días de crédito" value={cliente.dias_credito ?? "-"} />
                </div>
            </section>

            <div className="flex justify-end gap-3">
                <Link href={`/clientes?mode=edit&id=${cliente.id_cliente}`}>
                    <Button variant="outline">Editar Cliente</Button>
                </Link>
                <Link href="/clientes?mode=add">
                    <Button variant="accent">Nuevo Cliente</Button>
                </Link>
            </div>
        </div>
    );
}
