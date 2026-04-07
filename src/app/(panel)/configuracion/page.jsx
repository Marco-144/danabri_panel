"use client";

import { useCallback, useEffect, useState } from "react";
import PageTitle from "@/components/ui/PageTitle";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { getRoles, getUsuarios } from "@/services/configuracionService";

export default function ConfiguracionPage() {
    const [search, setSearch] = useState("");
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [u, r] = await Promise.all([getUsuarios(search), getRoles()]);
            setUsuarios(Array.isArray(u) ? u : []);
            setRoles(Array.isArray(r) ? r : []);
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

    return (
        <div className="space-y-4">
            <PageTitle title="Configuracion" subtitle="Usuarios y roles" />

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
        </div>
    );
}
