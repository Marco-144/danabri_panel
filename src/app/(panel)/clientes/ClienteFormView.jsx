"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, UserPlus } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PageTitle from "@/components/ui/PageTitle";

import {
    createCliente,
    updateCliente,
} from "@/services/clientsService";

const GIROS = [
    { value: "Comercio", label: "Comercio" },
    { value: "Servicios", label: "Servicios" },
    { value: "Manufactura", label: "Manufactura" },
    { value: "Otro", label: "Otro" },
];

const TIPOS_CLIENTE = [
    { value: "menudeo", label: "Menudeo" },
    { value: "mayoreo", label: "Mayoreo" },
];

const USO_CFDI = [
    { value: "P01", label: "Por cuenta propia" },
    { value: "P02", label: "Terceros" },
];

export default function ClienteFormView({ data = {}, isEdit = false }) {
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        nombre: data.nombre || "",
        tipo_cliente: data.tipo_cliente || "",
        rfc: data.rfc || "",
        curp: data.curp || "",
        uso_cfdi: data.uso_cfdi || "",
        telefono: data.telefono || "",
        email: data.email || "",
        calle: data.calle || "",
        num_exterior: data.num_exterior || "",
        num_interior: data.num_interior || "",
        colonia: data.colonia || "",
        cp: data.cp || "",
        ciudad: data.ciudad || "",
        estado: data.estado || "",
        pais: data.pais || "México",
        giro: data.giro || "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value
        }));

        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: ""
            }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!form.nombre) newErrors.nombre = "Nombre requerido";
        if (!form.tipo_cliente) newErrors.tipo_cliente = "Selecciona tipo";
        if (!form.telefono) newErrors.telefono = "Teléfono requerido";
        if (!form.rfc) newErrors.rfc = "RFC requerido";
        if (!form.curp) newErrors.curp = "CURP requerido";
        if (!form.calle) newErrors.calle = "Calle requerida";
        if (!form.num_exterior) newErrors.num_exterior = "Número requerido";
        if (!form.colonia) newErrors.colonia = "Colonia requerida";
        if (!form.cp) newErrors.cp = "CP requerido";
        if (!form.ciudad) newErrors.ciudad = "Ciudad requerida";
        if (!form.estado) newErrors.estado = "Estado requerido";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        try {
            setLoading(true);
            setError("");

            if (isEdit) {
                await updateCliente(data.id_cliente, form);
            } else {
                await createCliente(form);
            }

            router.push("/clientes");
            router.refresh();
        } catch (err) {
            setError(err.message || "Error al guardar cliente");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageTitle
                breadcrumb={`Clientes / ${isEdit ? "Editar" : "Crear"}`}
                title={isEdit ? "Editar Cliente" : "Agregar Cliente"}
                icon={UserPlus}
                actions={(
                    <Link href="/clientes">
                        <Button variant="primary" size="lg" className="rounded-xl shadow-sm">
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
                <Card>
                    <Section title="Datos Generales" subtitle="Información base del cliente para identificarlo en el sistema.">
                        <Input label="Nombre *" name="nombre" value={form.nombre} onChange={handleChange} error={errors.nombre} />
                        <Select label="Giro *" name="giro" value={form.giro} onChange={handleChange} options={GIROS} />
                        <Select label="Tipo de cliente *" name="tipo_cliente" value={form.tipo_cliente} onChange={handleChange} error={errors.tipo_cliente} options={TIPOS_CLIENTE} />
                        <Input label="Telefono *" name="telefono" value={form.telefono} onChange={handleChange} error={errors.telefono} />
                        <Input label="Correo" name="email" value={form.email} onChange={handleChange} />
                    </Section>
                </Card>

                <Card>
                    <Section title="Datos Fiscales" subtitle="Datos fiscales mostrados también en la vista de detalle.">
                        <Input label="RFC *" name="rfc" value={form.rfc} onChange={handleChange} error={errors.rfc} />
                        <Input label="CURP *" name="curp" value={form.curp} onChange={handleChange} error={errors.curp} />
                        <Select label="Uso CFDI *" name="uso_cfdi" value={form.uso_cfdi} onChange={handleChange} options={USO_CFDI} />
                    </Section>
                </Card>

                <Card>
                    <Section title="Dirección">
                        <Input label="Calle *" name="calle" value={form.calle} onChange={handleChange} error={errors.calle} />
                        <Input label="Numero exterior *" name="num_exterior" value={form.num_exterior} onChange={handleChange} error={errors.num_exterior} />
                        <Input label="Numero interior" name="num_interior" value={form.num_interior} onChange={handleChange} />
                        <Input label="Colonia *" name="colonia" value={form.colonia} onChange={handleChange} error={errors.colonia} />
                        <Input label="Codigo postal *" name="cp" value={form.cp} onChange={handleChange} error={errors.cp} />
                        <Input label="Ciudad *" name="ciudad" value={form.ciudad} onChange={handleChange} error={errors.ciudad} />
                        <Input label="Estado *" name="estado" value={form.estado} onChange={handleChange} error={errors.estado} />
                        <Input label="Pais" name="pais" value={form.pais} onChange={handleChange} />
                    </Section>
                </Card>

                <div className="sticky bottom-0 bg-background/95 backdrop-blur border border-border rounded-2xl p-4 flex justify-end gap-3">
                    <Link href="/clientes">
                        <Button type="button" variant="outline">
                            Cancelar
                        </Button>
                    </Link>

                    <Button type="submit" disabled={loading} variant="accent">
                        <Save size={16} />
                        {loading ? "Guardando..." : (isEdit ? "Guardar Cambios" : "Guardar")}
                    </Button>
                </div>
            </form>
        </div>
    );
}

function Section({ title, subtitle, children }) {
    return (
        <div className="mb-6">
            <h3 className="font-semibold text-primary mb-1">{title}</h3>
            {subtitle ? <p className="text-sm text-muted mb-4">{subtitle}</p> : null}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{children}</div>
        </div>
    );
}
