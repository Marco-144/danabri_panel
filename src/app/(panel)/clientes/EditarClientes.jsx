"use client";
// Vista de edicion de cliente.
// Carga el cliente por ID y pasa los datos al formulario.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader } from "lucide-react";
import ClienteFormView from "./ClienteFormView";
import { getClienteById } from "@/services/clientsService";

export default function EditarClientes({ id: propId }) {
    const params = useParams();
    const id = propId ?? params?.id;
    const [cliente, setCliente] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!id) return;

        // Consulta el cliente actual para precargar campos.
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

    return <ClienteFormView data={cliente} isEdit={true} />;
}
