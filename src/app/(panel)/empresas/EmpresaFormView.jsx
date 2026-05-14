"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageTitle from "@/components/ui/PageTitle";
import { createEmpresa, updateEmpresa } from "@/services/empresasService";

function createEmptyForm() {
    return {
        nombre: "",
        nombre_fiscal: "",
        pago_habitual: "",
        activo: true,
        rfc: "",
        direccion: "",
        colonia: "",
        ciudad: "",
        estado: "",
        cp: "",
    };
}

function buildFormFromData(data = {}) {
    return {
        nombre: data.nombre || "",
        nombre_fiscal: data.nombre_fiscal || "",
        pago_habitual: data.pago_habitual || "",
        activo: data.activo === 1 || data.activo === "1" || data.activo === true,
        rfc: data.rfc || "",
        direccion: data.direccion || "",
        colonia: data.colonia || "",
        ciudad: data.ciudad || "",
        estado: data.estado || "",
        cp: data.cp || "",
    };
}

export default function EmpresaFormView({ data = {}, isEdit = false }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState(() => (isEdit ? buildFormFromData(data) : createEmptyForm()));

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
        if (error) setError("");
    };

    const validate = () => {
        if (!String(form.nombre || "").trim()) return "El nombre es requerido";
        if (!String(form.nombre_fiscal || "").trim()) return "El nombre fiscal es requerido";
        if (!String(form.cp || "").trim()) return "El código postal es requerido";
        if (!String(form.direccion || "").trim()) return "La dirección es requerida";
        if (!String(form.colonia || "").trim()) return "La colonia es requerida";
        if (!String(form.ciudad || "").trim()) return "La ciudad es requerida";
        if (!String(form.estado || "").trim()) return "El estado es requerido";
        return "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validationMessage = validate();
        if (validationMessage) {
            setError(validationMessage);
            return;
        }

        const payload = {
            nombre: String(form.nombre || "").trim(),
            nombre_fiscal: String(form.nombre_fiscal || "").trim(),
            pago_habitual: String(form.pago_habitual || "").trim(),
            activo: form.activo ? 1 : 0,
            rfc: String(form.rfc || "").trim(),
            direccion: String(form.direccion || "").trim(),
            colonia: String(form.colonia || "").trim(),
            ciudad: String(form.ciudad || "").trim(),
            estado: String(form.estado || "").trim(),
            cp: String(form.cp || "").trim(),
        };

        try {
            setLoading(true);
            setError("");

            if (isEdit) {
                await updateEmpresa(data.id_empresa, payload);
            } else {
                await createEmpresa(payload);
            }

            router.push("/empresas");
            router.refresh();
        } catch (saveError) {
            setError(saveError.message || "No se pudo guardar la empresa");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageTitle
                breadcrumb={`Empresas / ${isEdit ? "Editar" : "Crear"}`}
                title={isEdit ? "Editar Empresa" : "Agregar Empresa"}
                icon={<Building2 size={20} />}
                actions={(
                    <Link href="/empresas">
                        <Button variant="outline" className="rounded-xl shadow-sm gap-2">
                            <ArrowLeft size={18} />
                            Regresar
                        </Button>
                    </Link>
                )}
            />

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white rounded-2xl border border-border shadow-card p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Nombre *" name="nombre" value={form.nombre} onChange={handleChange} />
                        <Input label="Nombre fiscal *" name="nombre_fiscal" value={form.nombre_fiscal} onChange={handleChange} />
                        <label className="flex items-center gap-2 text-sm text-primary">
                            <input
                                type="checkbox"
                                name="activo"
                                checked={Boolean(form.activo)}
                                onChange={handleChange}
                                className="h-4 w-4"
                            />
                            Empresa activa
                        </label>
                        <Input label="RFC" name="rfc" value={form.rfc} onChange={handleChange} />
                        <Input label="Pago habitual (opcional)" type="date" name="pago_habitual" value={form.pago_habitual} onChange={handleChange} />
                        <Input label="Código postal *" name="cp" value={form.cp} onChange={handleChange} />
                        <Input label="Dirección *" name="direccion" value={form.direccion} onChange={handleChange} />
                        <Input label="Colonia *" name="colonia" value={form.colonia} onChange={handleChange} />
                        <Input label="Ciudad *" name="ciudad" value={form.ciudad} onChange={handleChange} />
                        <Input label="Estado *" name="estado" value={form.estado} onChange={handleChange} />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <Link href="/empresas">
                            <Button variant="outline" disabled={loading}>
                                Cancelar
                            </Button>
                        </Link>
                        <Button variant="primary" disabled={loading} type="submit">
                            {loading ? "Guardando..." : "Guardar"}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}