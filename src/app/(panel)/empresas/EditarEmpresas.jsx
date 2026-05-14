"use client";

import { useEffect, useState } from "react";
import { Loader } from "lucide-react";
import { getEmpresaById } from "@/services/empresasService";
import EmpresaFormView from "./EmpresaFormView";

export default function EditarEmpresas({ id: propId }) {
    const id = propId;
    const [empresa, setEmpresa] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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

    return <EmpresaFormView data={empresa} isEdit={true} />;
}