"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, UserPlus } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import PageTitle from "@/components/ui/PageTitle";
import { getCatalogosClientes } from "@/services/configuracionService";

import {
    createCliente,
    updateCliente,
} from "@/services/clientsService";

const USO_CFDI = [
    { value: "601", label: "601 - General de Ley Personas Morales" },
    { value: "603", label: "603 - Personas Morales con Fines no Lucrativos" },
    { value: "605", label: "605 - Sueldos y Salarios e Ingresos Asimilados a Salarios" },
    { value: "606", label: "606 - Arrendamiento" },
    { value: "607", label: "607 - Régimen de Enajenación o Adquisición de Bienes" },
    { value: "608", label: "608 - Demás ingresos" },
    { value: "610", label: "610 - Residentes en el Extranjero sin Establecimiento Permanente en México" },
    { value: "611", label: "611 - Ingresos por Dividendos (socios y accionistas)" },
    { value: "612", label: "612 - Personas Físicas con Actividades Empresariales y Profesionales" },
    { value: "614", label: "614 - Ingresos por intereses" },
    { value: "615", label: "615 - Régimen de los ingresos por obtención de premios" },
    { value: "616", label: "616 - Sin obligaciones fiscales" },
    { value: "620", label: "620 - Sociedades Cooperativas de Producción que optan por diferir sus ingresos" },
    { value: "621", label: "621 - Incorporación Fiscal (RIF)" },
    { value: "622", label: "622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras" },
    { value: "623", label: "623 - Opcional para Grupos de Sociedades" },
    { value: "624", label: "624 - Coordinados" },
    { value: "625", label: "625 - Actividades Empresariales con ingresos a través de Plataformas Tecnológicas" },
    { value: "626", label: "626 - Régimen Simplificado de Confianza (RESICO)" },
    { value: "628", label: "628 - Hidrocarburos" },
    { value: "629", label: "629 - Regímenes Fiscales Preferentes y Empresas Multinacionales" },
    { value: "630", label: "630 - Enajenación de acciones en bolsa de valores" },
];

export default function ClienteFormView({ data = {}, isEdit = false }) {
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [error, setError] = useState("");
    const [catalogos, setCatalogos] = useState({ giros: [], tipos_cliente: [] });

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
        credito_habilitado: Boolean(data.credito_habilitado),
        limite_credito: data.limite_credito ?? "",
        dias_credito: data.dias_credito ?? "",
        facturar_sin_pagar: Boolean(data.facturar_sin_pagar),
        dias_ruta: data.dias_ruta ?? data.dias_rutas ?? "",
    });

    const girosOptions = catalogos.giros.map((item) => ({
        value: item.nombre,
        label: item.nombre,
    }));

    const tiposClienteOptions = catalogos.tipos_cliente.map((item) => ({
        value: item.nombre,
        label: `Precio ${item.nivel_precio}`,
    }));

    const loadCatalogos = async () => {
        try {
            const dataCatalogos = await getCatalogosClientes();
            setCatalogos({
                giros: Array.isArray(dataCatalogos.giros) ? dataCatalogos.giros.filter((item) => item.activo === 1 || item.activo === true) : [],
                tipos_cliente: Array.isArray(dataCatalogos.tipos_cliente) ? dataCatalogos.tipos_cliente.filter((item) => item.activo === 1 || item.activo === true) : [],
            });
        } catch {
            setCatalogos({ giros: [], tipos_cliente: [] });
        }
    };

    useEffect(() => {
        loadCatalogos();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
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
        if (!form.giro) newErrors.giro = "Selecciona un giro";
        if (!form.telefono) newErrors.telefono = "Teléfono requerido";
        if (!form.calle) newErrors.calle = "Calle requerida";
        if (!form.num_exterior) newErrors.num_exterior = "Número requerido";
        if (!form.colonia) newErrors.colonia = "Colonia requerida";
        if (!form.cp) newErrors.cp = "CP requerido";
        if (!form.ciudad) newErrors.ciudad = "Ciudad requerida";
        if (!form.estado) newErrors.estado = "Estado requerido";

        if (form.credito_habilitado) {
            if (form.limite_credito === "" || Number(form.limite_credito) <= 0) {
                newErrors.limite_credito = "Ingresa un límite de crédito válido";
            }
            if (form.dias_credito === "" || Number(form.dias_credito) <= 0) {
                newErrors.dias_credito = "Ingresa días de crédito válidos";
            }
        }

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
                limite_credito: form.credito_habilitado && form.limite_credito !== "" ? Number(form.limite_credito) : null,
                dias_credito: form.credito_habilitado && form.dias_credito !== "" ? Number(form.dias_credito) : null,
                dias_ruta: form.dias_ruta.trim() === "" ? null : form.dias_ruta.trim(),
            };

            if (isEdit) {
                await updateCliente(data.id_cliente, payload);
            } else {
                await createCliente(payload);
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
                Icon={UserPlus}
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
                        <Select
                            label="Giro *"
                            name="giro"
                            value={form.giro}
                            onChange={handleChange}
                            error={errors.giro}
                            options={girosOptions}
                            placeholder={girosOptions.length ? "Seleccionar" : "Sin giros configurados"}
                        />
                        <Select
                            label="Precio de Lista*"
                            name="tipo_cliente"
                            value={form.tipo_cliente}
                            onChange={handleChange}
                            error={errors.tipo_cliente}
                            options={tiposClienteOptions}
                            placeholder={tiposClienteOptions.length ? "Seleccionar" : "Sin tipos configurados"}
                        />
                        <Input label="Telefono *" name="telefono" value={form.telefono} onChange={handleChange} error={errors.telefono} />
                        <Input label="Correo" name="email" value={form.email} onChange={handleChange} />
                        <Input
                            label="Dias de ruta"
                            name="dias_ruta"
                            value={form.dias_ruta}
                            onChange={handleChange}
                            placeholder="Ej. Lunes, Miércoles y Viernes"
                        />
                    </Section>
                </Card>

                <Card>
                    <Section title="Datos Fiscales" subtitle="Datos fiscales mostrados también en la vista de detalle.">
                        <Input label="RFC" name="rfc" value={form.rfc} onChange={handleChange} error={errors.rfc} />
                        <Input label="CURP" name="curp" value={form.curp} onChange={handleChange} error={errors.curp} />
                        <Select label="Uso CFDI" name="uso_cfdi" value={form.uso_cfdi} onChange={handleChange} options={USO_CFDI} />
                    </Section>
                </Card>

                <Card>
                    <Section title="Credito y Facturacion" subtitle="Configura crédito, facturación y condiciones de pago para el cliente.">
                        <label className="flex items-center gap-2 text-sm text-primary">
                            <input
                                type="checkbox"
                                name="credito_habilitado"
                                checked={Boolean(form.credito_habilitado)}
                                onChange={handleChange}
                                className="h-4 w-4"
                            />
                            Habilitar credito
                        </label>

                        {form.credito_habilitado ? (
                            <>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    label="Limite de credito ($)"
                                    name="limite_credito"
                                    value={form.limite_credito}
                                    onChange={handleChange}
                                    error={errors.limite_credito}
                                    placeholder="0.00"
                                />

                                <Input
                                    type="number"
                                    min="0"
                                    label="Dias de credito"
                                    name="dias_credito"
                                    value={form.dias_credito}
                                    onChange={handleChange}
                                    error={errors.dias_credito}
                                    placeholder="0"
                                />
                            </>
                        ) : null}

                        <label className="flex items-center gap-2 text-sm text-primary md:col-span-3">
                            <input
                                type="checkbox"
                                name="facturar_sin_pagar"
                                checked={Boolean(form.facturar_sin_pagar)}
                                onChange={handleChange}
                                className="h-4 w-4"
                            />
                            Facturar sin pagar
                        </label>
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
