"use client";

import { useCallback, useEffect, useState } from "react";
import PageTitle from "@/components/ui/PageTitle";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
    createCatalogoCliente,
    deleteCatalogoCliente,
    getCatalogosClientes,
    getRoles,
    getUsuarios,
} from "@/services/configuracionService";

export default function ConfiguracionPage() {
    const [search, setSearch] = useState("");
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [catalogos, setCatalogos] = useState({ giros: [], tipos_cliente: [] });
    const [catalogoForm, setCatalogoForm] = useState({
        giro: "",
        tipo_cliente: "",
        nivel_precio: "1",
    });
    const [catalogoError, setCatalogoError] = useState("");
    const [catalogoLoading, setCatalogoLoading] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [u, r, c] = await Promise.all([getUsuarios(search), getRoles(), getCatalogosClientes()]);
            setUsuarios(Array.isArray(u) ? u : []);
            setRoles(Array.isArray(r) ? r : []);
            setCatalogos({
                giros: Array.isArray(c.giros) ? c.giros : [],
                tipos_cliente: Array.isArray(c.tipos_cliente) ? c.tipos_cliente : [],
            });
            setError("");
        } catch (e) {
            setError(e.message || "Error al cargar configuracion");
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        load();
    }, [load]);

    const handleAddGiro = async () => {
        if (!catalogoForm.giro.trim()) {
            setCatalogoError("El nombre del giro es requerido");
            return;
        }

        try {
            setCatalogoLoading(true);
            await createCatalogoCliente({ tipo: "giro", nombre: catalogoForm.giro.trim() });
            setCatalogoForm((prev) => ({ ...prev, giro: "" }));
            setCatalogoError("");
            await load();
        } catch (e) {
            setCatalogoError(e.message || "No se pudo agregar el giro");
        } finally {
            setCatalogoLoading(false);
        }
    };

    const handleDeleteGiro = async (id) => {
        try {
            setCatalogoLoading(true);
            await deleteCatalogoCliente({ tipo: "giro", id });
            setCatalogoError("");
            await load();
        } catch (e) {
            setCatalogoError(e.message || "No se pudo eliminar el giro");
        } finally {
            setCatalogoLoading(false);
        }
    };

    const handleAddTipoCliente = async () => {
        if (!catalogoForm.tipo_cliente.trim()) {
            setCatalogoError("El nombre del tipo de cliente es requerido");
            return;
        }

        try {
            setCatalogoLoading(true);
            await createCatalogoCliente({
                tipo: "tipo_cliente",
                nombre: catalogoForm.tipo_cliente.trim(),
                nivel_precio: Number(catalogoForm.nivel_precio),
            });
            setCatalogoForm((prev) => ({ ...prev, tipo_cliente: "", nivel_precio: "1" }));
            setCatalogoError("");
            await load();
        } catch (e) {
            setCatalogoError(e.message || "No se pudo agregar el tipo de cliente");
        } finally {
            setCatalogoLoading(false);
        }
    };

    const handleDeleteTipoCliente = async (id) => {
        try {
            setCatalogoLoading(true);
            await deleteCatalogoCliente({ tipo: "tipo_cliente", id });
            setCatalogoError("");
            await load();
        } catch (e) {
            setCatalogoError(e.message || "No se pudo eliminar el tipo de cliente");
        } finally {
            setCatalogoLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <PageTitle title="Configuracion" subtitle="Usuarios, roles y catalogos de clientes" />

            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

            <Card className="p-4">
                <div className="flex gap-2 items-end">
                    <Input label="Buscar usuario" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre o email" />
                    <Button onClick={load}>Consultar</Button>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="p-4 lg:col-span-2">
                    <h3 className="font-semibold text-primary mb-3">Usuarios</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[700px]">
                            <thead className="bg-background text-primary">
                                <tr>
                                    <th className="text-left p-3">Nombre</th>
                                    <th className="text-left p-3">Email</th>
                                    <th className="text-left p-3">Roles</th>
                                    <th className="text-left p-3">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={4} className="p-6 text-center text-muted">Cargando...</td></tr>
                                ) : usuarios.length === 0 ? (
                                    <tr><td colSpan={4} className="p-6 text-center text-muted">Sin usuarios</td></tr>
                                ) : usuarios.map((u) => (
                                    <tr key={u.id_usuario} className="border-t border-border hover:bg-background/50">
                                        <td className="p-3">{u.nombre}</td>
                                        <td className="p-3">{u.email}</td>
                                        <td className="p-3">{u.roles || "-"}</td>
                                        <td className="p-3">{u.activo ? "Activo" : "Inactivo"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="p-4">
                    <h3 className="font-semibold text-primary mb-3">Roles</h3>
                    <ul className="space-y-2 text-sm">
                        {roles.map((r) => (
                            <li key={r.id_rol} className="border border-border rounded-lg p-2">{r.nombre}</li>
                        ))}
                        {!loading && roles.length === 0 ? <li className="text-muted">Sin roles</li> : null}
                    </ul>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card className="p-4">
                    <h3 className="font-semibold text-primary mb-3">Catalogo de giros</h3>

                    <div className="flex flex-col md:flex-row gap-2 md:items-end mb-4">
                        <Input
                            label="Nuevo giro"
                            placeholder="Ej. Refaccionaria"
                            value={catalogoForm.giro}
                            onChange={(e) => setCatalogoForm((prev) => ({ ...prev, giro: e.target.value }))}
                        />
                        <Button onClick={handleAddGiro} disabled={catalogoLoading}>Agregar</Button>
                    </div>

                    <ul className="space-y-2 text-sm">
                        {catalogos.giros.map((giro) => (
                            <li key={giro.id_giro} className="border border-border rounded-lg p-2 flex items-center justify-between gap-2">
                                <span>{giro.nombre}</span>
                                <Button variant="outline" onClick={() => handleDeleteGiro(giro.id_giro)} disabled={catalogoLoading}>
                                    Eliminar
                                </Button>
                            </li>
                        ))}
                        {!loading && catalogos.giros.length === 0 ? <li className="text-muted">Sin giros</li> : null}
                    </ul>
                </Card>

                <Card className="p-4">
                    <h3 className="font-semibold text-primary mb-3">Catalogo de tipos de cliente</h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                        <Input
                            className="md:col-span-2"
                            label="Nuevo tipo de cliente"
                            placeholder="Ej. Constructora"
                            value={catalogoForm.tipo_cliente}
                            onChange={(e) => setCatalogoForm((prev) => ({ ...prev, tipo_cliente: e.target.value }))}
                        />
                        <Select
                            label="Precio"
                            value={catalogoForm.nivel_precio}
                            onChange={(e) => setCatalogoForm((prev) => ({ ...prev, nivel_precio: e.target.value }))}
                            options={[
                                { value: "1", label: "Precio 1" },
                                { value: "2", label: "Precio 2" },
                                { value: "3", label: "Precio 3" },
                                { value: "4", label: "Precio 4" },
                                { value: "5", label: "Precio 5" },
                            ]}
                        />
                    </div>

                    <Button onClick={handleAddTipoCliente} disabled={catalogoLoading} className="mb-4">Agregar tipo de cliente</Button>

                    <ul className="space-y-2 text-sm">
                        {catalogos.tipos_cliente.map((tipo) => (
                            <li key={tipo.id_tipo_cliente} className="border border-border rounded-lg p-2 flex items-center justify-between gap-2">
                                <span>{tipo.nombre} (Precio {tipo.nivel_precio})</span>
                                <Button variant="outline" onClick={() => handleDeleteTipoCliente(tipo.id_tipo_cliente)} disabled={catalogoLoading}>
                                    Eliminar
                                </Button>
                            </li>
                        ))}
                        {!loading && catalogos.tipos_cliente.length === 0 ? <li className="text-muted">Sin tipos de cliente</li> : null}
                    </ul>
                </Card>
            </div>

            {catalogoError ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{catalogoError}</div> : null}
        </div>
    );
}
