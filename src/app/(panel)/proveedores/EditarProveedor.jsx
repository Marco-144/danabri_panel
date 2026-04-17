"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader } from "lucide-react";
import ProveedorFormView from "./ProveedorFormView";
import { getProveedorById } from "@/services/suppliersService";

export default function EditarProveedor({ id: propId }) {
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

    return <ProveedorFormView data={proveedor} isEdit={true} />;
}
