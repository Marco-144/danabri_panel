"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Truck } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PageTitle from "@/components/ui/PageTitle";
import { createProveedor, updateProveedor } from "@/services/suppliersService";
import { getCatalogosProveedores } from "@/services/configuracionService";

const METODOS_PAGO_FALLBACK = [
    { value: "Transferencia", label: "Transferencia" },
    { value: "Efectivo", label: "Efectivo" },
    { value: "Tarjeta", label: "Tarjeta" },
    { value: "Cheque", label: "Cheque" },
    { value: "Credito", label: "Credito" },
    { value: "Otro", label: "Otro" },
];

const ESTADOS_FALLBACK = [
    { value: "Jalisco", label: "Jalisco" },
    { value: "Ciudad de Mexico", label: "Ciudad de Mexico" },
    { value: "Estado de Mexico", label: "Estado de Mexico" },
    { value: "Nuevo Leon", label: "Nuevo Leon" },
    { value: "Otro", label: "Otro" },
];

export default function ProveedorFormView({ data = {}, isEdit = false }) {
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [error, setError] = useState("");
    const [catalogosProveedor, setCatalogosProveedor] = useState({ giros: [] });

    const [form, setForm] = useState({
        nombre: data.nombre || "",
        telefono: data.telefono || "",
        giro: data.giro || "",
        email: data.email || "",
        rfc: data.rfc || "",
        metodo_pago: data.metodo_pago || "",
        cuenta_bancaria: data.cuenta_bancaria || "",
        calle: data.calle || "",
        num_exterior: data.num_exterior || "",
        num_interior: data.num_interior || "",
        colonia: data.colonia || "",
        cp: data.cp || "",
        ciudad: data.ciudad || "",
        estado: data.estado || "",
        pais: data.pais || "Mexico",
        activo: data.activo === undefined ? true : (data.activo === 1 || data.activo === "1" || data.activo === true),
    });

    useEffect(() => {
        const loadCatalogos = async () => {
            try {
                const result = await getCatalogosProveedores();
                setCatalogosProveedor({
                    giros: Array.isArray(result.giros) ? result.giros.filter((item) => item.activo === 1 || item.activo === true) : [],
                });
            } catch {
                setCatalogosProveedor({ giros: [] });
            }
        };

        loadCatalogos();
    }, []);

    const metodosPagoOptions = useMemo(() => {
        return METODOS_PAGO_FALLBACK;
    }, []);

    const giroOptions = useMemo(
        () => catalogosProveedor.giros.map((item) => ({ value: item.nombre, label: item.nombre })),
        [catalogosProveedor.giros]
    );

    const estadoOptions = useMemo(
        () => {
            return ESTADOS_FALLBACK;
        },
        []
    );

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!form.nombre.trim()) newErrors.nombre = "Nombre requerido";
        if (!form.telefono.trim()) newErrors.telefono = "Telefono requerido";
        if (!form.calle.trim()) newErrors.calle = "Calle requerida";
        if (!form.num_exterior.trim()) newErrors.num_exterior = "N° exterior requerido";
        if (!form.colonia.trim()) newErrors.colonia = "Colonia requerida";
        if (!form.cp.trim()) newErrors.cp = "CP requerido";
        if (!form.ciudad.trim()) newErrors.ciudad = "Ciudad requerida";
        if (!form.estado.trim()) newErrors.estado = "Estado requerido";
        if (!form.pais.trim()) newErrors.pais = "Pais requerido";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setLoading(true);
            setError("");

            const payload = {
                ...form,
                nombre: form.nombre.trim(),
                telefono: form.telefono.trim(),
                giro: form.giro.trim() || null,
                email: form.email.trim() || null,
                rfc: form.rfc.trim() || null,
                metodo_pago: form.metodo_pago.trim() || null,
                cuenta_bancaria: form.cuenta_bancaria.trim() || null,
                calle: form.calle.trim(),
                num_exterior: form.num_exterior.trim(),
                num_interior: form.num_interior.trim() || null,
                colonia: form.colonia.trim(),
                cp: form.cp.trim(),
                ciudad: form.ciudad.trim(),
                estado: form.estado.trim(),
                pais: form.pais.trim(),
            };

            if (isEdit) {
                await updateProveedor(data.id_proveedor, payload);
            } else {
                await createProveedor(payload);
            }

            router.push("/proveedores");
            router.refresh();
        } catch (err) {
            setError(err.message || "Error al guardar proveedor");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageTitle
                breadcrumb={`Proveedores / ${isEdit ? "Editar" : "Crear"}`}
                title={isEdit ? "Editar Proveedor" : "Agregar Proveedor"}
                icon={<Truck />}
                actions={(
                    <Link href="/proveedores">
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
                    <Section title="Datos Personales" subtitle="Nombre, telefono y correo de contacto.">
                        <Input label="Nombre *" name="nombre" value={form.nombre} onChange={handleChange} error={errors.nombre} />
                        <Input label="Telefono *" name="telefono" value={form.telefono} onChange={handleChange} error={errors.telefono} />
                        <Select
                            label="Giro"
                            name="giro"
                            value={form.giro}
                            onChange={handleChange}
                            options={giroOptions}
                            placeholder="Selecciona giro"
                        />
                        <Input label="Correo" name="email" value={form.email} onChange={handleChange} />
                    </Section>
                </Card>

                <Card>
                    <Section title="Datos Fiscales" subtitle="Identificación fiscal y forma de pago del proveedor.">
                        <Input label="RFC" name="rfc" value={form.rfc} onChange={handleChange} />
                        <Select
                            label="Metodo de pago"
                            name="metodo_pago"
                            value={form.metodo_pago}
                            onChange={handleChange}
                            options={metodosPagoOptions}
                            placeholder="Selecciona metodo"
                        />
                        <Input label="Cuenta bancaria" name="cuenta_bancaria" value={form.cuenta_bancaria} onChange={handleChange} />
                    </Section>
                </Card>

                <Card>
                    <Section title="Direccion" subtitle="Direccion fiscal/comercial del proveedor.">
                        <Input label="Calle *" name="calle" value={form.calle} onChange={handleChange} error={errors.calle} />
                        <Input label="N° Ext. *" name="num_exterior" value={form.num_exterior} onChange={handleChange} error={errors.num_exterior} />
                        <Input label="N° Int." name="num_interior" value={form.num_interior} onChange={handleChange} />
                        <Input label="Colonia *" name="colonia" value={form.colonia} onChange={handleChange} error={errors.colonia} />
                        <Input label="CP *" name="cp" value={form.cp} onChange={handleChange} error={errors.cp} />
                        <Input label="Ciudad *" name="ciudad" value={form.ciudad} onChange={handleChange} error={errors.ciudad} />
                        <Select
                            label="Estado *"
                            name="estado"
                            value={form.estado}
                            onChange={handleChange}
                            options={estadoOptions}
                            placeholder="Selecciona estado"
                            error={errors.estado}
                        />
                        <Input label="Pais *" name="pais" value={form.pais} onChange={handleChange} error={errors.pais} />
                    </Section>
                </Card>

                <div className="sticky bottom-0 bg-background/95 backdrop-blur border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <label className="inline-flex items-center gap-2 text-sm text-primary">
                        <input
                            type="checkbox"
                            name="activo"
                            checked={Boolean(form.activo)}
                            onChange={handleChange}
                            className="h-4 w-4"
                        />
                        Activo
                    </label>

                    <div className="flex items-center justify-end gap-3">
                        <Link href="/proveedores">
                            <Button type="button" variant="outline">Cancelar</Button>
                        </Link>

                        <Button type="submit" disabled={loading} variant="accent">
                            <Save size={16} />
                            {loading ? "Guardando..." : (isEdit ? "Guardar Cambios" : "Guardar")}
                        </Button>
                    </div>
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
