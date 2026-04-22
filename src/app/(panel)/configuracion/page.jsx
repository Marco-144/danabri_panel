"use client";

import { useCallback, useEffect, useState } from "react";
import PageTitle from "@/components/ui/PageTitle";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Pencil, Trash2, Cog, Users, ListTree, Plus } from "lucide-react";
import {
    createCatalogoProveedor,
    createCatalogoCliente,
    createUsuario,
    deleteCatalogoProveedor,
    deleteCatalogoCliente,
    deleteUsuario,
    getCatalogosProveedores,
    getCatalogosClientes,
    getRoles,
    updateUsuario,
    getUsuarios,
    getUsuarioById,
} from "@/services/configuracionService";
import { Pen } from "lucide-react";

const emptyUsuarioForm = {
    nombre: "",
    email: "",
    password: "",
    activo: true,
    roles: [],
};

export default function ConfiguracionPage() {
    const [search, setSearch] = useState("");
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [usuarioModalOpen, setUsuarioModalOpen] = useState(false);
    const [usuarioEditingId, setUsuarioEditingId] = useState(null);
    const [usuarioForm, setUsuarioForm] = useState(emptyUsuarioForm);
    const [usuarioLoading, setUsuarioLoading] = useState(false);
    const [usuarioError, setUsuarioError] = useState("");
    const [catalogos, setCatalogos] = useState({ giros: [], tipos_cliente: [] });
    const [catalogosProveedor, setCatalogosProveedor] = useState({ giros: [] });
    const [catalogoForm, setCatalogoForm] = useState({
        giro: "",
        tipo_cliente: "",
        nivel_precio: "1",
        proveedor_giro: "",
    });
    const [catalogoError, setCatalogoError] = useState("");
    const [catalogoLoading, setCatalogoLoading] = useState(false);

    // Búsqueda local para cada catálogo
    const [searchGiros, setSearchGiros] = useState("");
    const [searchTiposCliente, setSearchTiposCliente] = useState("");
    const [searchGirosProveedor, setSearchGirosProveedor] = useState("");

    // Mostrar solo 5 elementos con scroll
    const MAX_VISIBLE_ITEMS = 5;

    // Modal de edición para catálogos
    const [editingCatalogo, setEditingCatalogo] = useState(null);
    const [editingValue, setEditingValue] = useState("");
    const [editingNivelPrecio, setEditingNivelPrecio] = useState("1");

    // Paginación para usuarios y roles
    const [pageUsuarios, setPageUsuarios] = useState(1);
    const [pageRoles, setPageRoles] = useState(1);
    const ITEMS_PER_PAGE_USUARIOS = 5;

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [u, r, c, cp] = await Promise.all([
                getUsuarios(search),
                getRoles(),
                getCatalogosClientes(),
                getCatalogosProveedores(),
            ]);
            setUsuarios(Array.isArray(u) ? u : []);
            setRoles(Array.isArray(r) ? r : []);
            setCatalogos({
                giros: Array.isArray(c.giros) ? c.giros : [],
                tipos_cliente: Array.isArray(c.tipos_cliente) ? c.tipos_cliente : [],
            });
            setCatalogosProveedor({
                giros: Array.isArray(cp.giros) ? cp.giros : [],
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

    useEffect(() => {
        setPageUsuarios(1);
    }, [search]);

    const closeUsuarioModal = () => {
        setUsuarioModalOpen(false);
        setUsuarioEditingId(null);
        setUsuarioForm(emptyUsuarioForm);
        setUsuarioError("");
    };

    const openCreateUsuario = () => {
        setUsuarioEditingId(null);
        setUsuarioForm(emptyUsuarioForm);
        setUsuarioError("");
        setUsuarioModalOpen(true);
    };

    const openEditUsuario = async (usuario) => {
        try {
            setUsuarioLoading(true);
            setUsuarioError("");

            const detalle = await getUsuarioById(usuario.id_usuario);

            setUsuarioEditingId(detalle.id_usuario);
            setUsuarioForm({
                nombre: detalle.nombre || "",
                email: detalle.email || "",
                password: "",
                activo: Boolean(detalle.activo),
                roles: Array.isArray(detalle.role_ids) ? detalle.role_ids : [],
            });
            setUsuarioModalOpen(true);
        } catch (e) {
            setUsuarioError(e.message || "No se pudo cargar el usuario");
            setUsuarioModalOpen(true);
        } finally {
            setUsuarioLoading(false);
        }
    };

    const toggleUsuarioRole = (idRol) => {
        setUsuarioForm((prev) => {
            const exists = prev.roles.includes(idRol);
            return {
                ...prev,
                roles: exists ? prev.roles.filter((roleId) => roleId !== idRol) : [...prev.roles, idRol],
            };
        });
    };

    const handleSubmitUsuario = async () => {
        const nombre = String(usuarioForm.nombre || "").trim();
        const email = String(usuarioForm.email || "").trim();
        const password = String(usuarioForm.password || "").trim();

        if (!nombre) {
            setUsuarioError("El nombre es requerido");
            return;
        }

        if (!email) {
            setUsuarioError("El email es requerido");
            return;
        }

        if (!usuarioEditingId && !password) {
            setUsuarioError("La contraseña es requerida para crear el usuario");
            return;
        }

        try {
            setUsuarioLoading(true);
            setUsuarioError("");

            const payload = {
                nombre,
                email,
                activo: Boolean(usuarioForm.activo),
                roles: usuarioForm.roles,
            };

            if (password) {
                payload.password = password;
            }

            if (usuarioEditingId) {
                payload.id_usuario = usuarioEditingId;
                await updateUsuario(payload);
            } else {
                await createUsuario(payload);
            }

            closeUsuarioModal();
            await load();
        } catch (e) {
            setUsuarioError(e.message || "No se pudo guardar el usuario");
        } finally {
            setUsuarioLoading(false);
        }
    };

    const handleDeleteUsuario = async (usuario) => {
        const confirmar = window.confirm(`¿Eliminar al usuario ${usuario.nombre}?`);
        if (!confirmar) {
            return;
        }

        try {
            setUsuarioLoading(true);
            await deleteUsuario({ id_usuario: usuario.id_usuario });
            await load();
        } catch (e) {
            setUsuarioError(e.message || "No se pudo eliminar el usuario");
        } finally {
            setUsuarioLoading(false);
        }
    };

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

    const handleAddCatalogoProveedor = async (tipo, valueKey, errorText) => {
        const nombre = String(catalogoForm[valueKey] || "").trim();
        if (!nombre) {
            setCatalogoError(errorText);
            return;
        }

        try {
            setCatalogoLoading(true);
            await createCatalogoProveedor({ tipo, nombre });
            setCatalogoForm((prev) => ({ ...prev, [valueKey]: "" }));
            setCatalogoError("");
            await load();
        } catch (e) {
            setCatalogoError(e.message || "No se pudo agregar el catalogo de proveedor");
        } finally {
            setCatalogoLoading(false);
        }
    };

    const handleDeleteCatalogoProveedor = async (tipo, id) => {
        try {
            setCatalogoLoading(true);
            await deleteCatalogoProveedor({ tipo, id });
            setCatalogoError("");
            await load();
        } catch (e) {
            setCatalogoError(e.message || "No se pudo eliminar el catalogo de proveedor");
        } finally {
            setCatalogoLoading(false);
        }
    };

    // Handlers para editar catálogos
    const handleEditGiro = (giro) => {
        setEditingCatalogo({ tipo: "giro", id: giro.id_giro, nombre: giro.nombre });
        setEditingValue(giro.nombre);
    };

    const handleEditTipoCliente = (tipo) => {
        setEditingCatalogo({ tipo: "tipo_cliente", id: tipo.id_tipo_cliente, nombre: tipo.nombre, nivel_precio: tipo.nivel_precio });
        setEditingValue(tipo.nombre);
        setEditingNivelPrecio(String(tipo.nivel_precio));
    };

    const handleEditGirosProveedor = (giro) => {
        setEditingCatalogo({ tipo: "giro_proveedor", id: giro.id_giro_proveedor, nombre: giro.nombre });
        setEditingValue(giro.nombre);
    };

    const handleSaveEdit = async () => {
        if (!editingValue.trim()) {
            setCatalogoError("El nombre no puede estar vacío");
            return;
        }

        try {
            setCatalogoLoading(true);

            if (editingCatalogo.tipo === "giro") {
                // Delete y recrear con nuevo nombre
                await deleteCatalogoCliente({ tipo: "giro", id: editingCatalogo.id });
                await createCatalogoCliente({ tipo: "giro", nombre: editingValue.trim() });
            } else if (editingCatalogo.tipo === "tipo_cliente") {
                await deleteCatalogoCliente({ tipo: "tipo_cliente", id: editingCatalogo.id });
                await createCatalogoCliente({ tipo: "tipo_cliente", nombre: editingValue.trim(), nivel_precio: Number(editingNivelPrecio) });
            } else if (editingCatalogo.tipo === "giro_proveedor") {
                await deleteCatalogoProveedor({ tipo: "giro", id: editingCatalogo.id });
                await createCatalogoProveedor({ tipo: "giro", nombre: editingValue.trim() });
            }

            setEditingCatalogo(null);
            setEditingValue("");
            setEditingNivelPrecio("1");
            setCatalogoError("");
            await load();
        } catch (e) {
            setCatalogoError(e.message || "No se pudo actualizar");
        } finally {
            setCatalogoLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <PageTitle title="Configuracion" subtitle="Usuarios, roles y catalogos de clientes" icon={<Cog />} />

            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div> : null}

            <Card className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                        <p className="text-sm text-muted mb-2">Buscar Usuario</p>
                        <Input className="w-[360px] mb-6" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre o email" />

                        <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                                <Users size={22} className="-translate-y-1.5" />
                                <h3 className="font-semibold text-primary">Usuarios</h3>
                            </div>
                            <Button onClick={openCreateUsuario}>
                                <Plus size={16} />
                                Agregar usuario
                            </Button>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-border">
                            <table className="w-full text-sm min-w-[600px]">
                                <thead className="bg-background text-primary">
                                    <tr>
                                        <th className="text-left p-3">Nombre</th>
                                        <th className="text-left p-3">Email</th>
                                        <th className="text-left p-3">Rol</th>
                                        <th className="text-left p-3">Estado</th>
                                        <th className="text-left p-3">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={5} className="p-6 text-center text-muted">Cargando...</td></tr>
                                    ) : usuarios.slice((pageUsuarios - 1) * ITEMS_PER_PAGE_USUARIOS, pageUsuarios * ITEMS_PER_PAGE_USUARIOS).length === 0 ? (
                                        <tr><td colSpan={5} className="p-6 text-center text-muted">Sin usuarios</td></tr>
                                    ) : usuarios.slice((pageUsuarios - 1) * ITEMS_PER_PAGE_USUARIOS, pageUsuarios * ITEMS_PER_PAGE_USUARIOS).map((u) => (
                                        <tr key={u.id_usuario} className="border-t border-border hover:bg-background/50">
                                            <td className="p-3">{u.nombre}</td>
                                            <td className="p-3 text-xs">{u.email}</td>
                                            <td className="p-3">{u.roles || "-"}</td>
                                            <td className="p-3">{u.activo ? "Activo" : "Inactivo"}</td>
                                            <td className="p-3">
                                                <div className="flex gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => openEditUsuario(u)} disabled={usuarioLoading}>
                                                        <Pencil size={16} />
                                                    </Button>
                                                    <Button variant="danger" size="sm" onClick={() => handleDeleteUsuario(u)} disabled={usuarioLoading}>
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {usuarios.length > ITEMS_PER_PAGE_USUARIOS && (
                            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted">
                                <span>Mostrando {(pageUsuarios - 1) * ITEMS_PER_PAGE_USUARIOS + 1} a {Math.min(pageUsuarios * ITEMS_PER_PAGE_USUARIOS, usuarios.length)} de {usuarios.length}</span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setPageUsuarios(Math.max(1, pageUsuarios - 1))}
                                        disabled={pageUsuarios === 1}
                                        className="px-2 py-1 rounded hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ←
                                    </button>
                                    <span className="px-2 py-1">{pageUsuarios} / {Math.ceil(usuarios.length / ITEMS_PER_PAGE_USUARIOS)}</span>
                                    <button
                                        onClick={() => setPageUsuarios(Math.min(Math.ceil(usuarios.length / ITEMS_PER_PAGE_USUARIOS), pageUsuarios + 1))}
                                        disabled={pageUsuarios >= Math.ceil(usuarios.length / ITEMS_PER_PAGE_USUARIOS)}
                                        className="px-2 py-1 rounded hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-1">
                        <h3 className="font-semibold text-primary mb-3">Roles</h3>
                        <div className="border border-border rounded-lg overflow-y-auto" style={{ maxHeight: `${ITEMS_PER_PAGE_USUARIOS * 40 + 8}px` }}>
                            <ul className="space-y-0 text-sm divide-y divide-border">
                                {roles.slice((pageRoles - 1) * ITEMS_PER_PAGE_USUARIOS, pageRoles * ITEMS_PER_PAGE_USUARIOS).map((r) => (
                                    <li key={r.id_rol} className="p-3 hover:bg-background/50">{r.nombre}</li>
                                ))}
                                {!loading && roles.length === 0 ? <li className="p-3 text-center text-muted text-xs">Sin roles</li> : null}
                            </ul>
                        </div>

                        {roles.length > ITEMS_PER_PAGE_USUARIOS && (
                            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted">
                                <span>{Math.ceil(roles.length / ITEMS_PER_PAGE_USUARIOS)} págs</span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setPageRoles(Math.max(1, pageRoles - 1))}
                                        disabled={pageRoles === 1}
                                        className="px-2 py-1 rounded hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ←
                                    </button>
                                    <span className="px-2 py-1">{pageRoles}</span>
                                    <button
                                        onClick={() => setPageRoles(Math.min(Math.ceil(roles.length / ITEMS_PER_PAGE_USUARIOS), pageRoles + 1))}
                                        disabled={pageRoles >= Math.ceil(roles.length / ITEMS_PER_PAGE_USUARIOS)}
                                        className="px-2 py-1 rounded hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-2">
                        <ListTree size={22} className="-translate-y-1.5" />
                        <h3 className="font-semibold text-primary mb-3">Catalogo de giros</h3>
                    </div>

                    <div className="flex flex-col md:flex-row gap-2 md:items-end mb-4">
                        <Input
                            label="Nuevo giro"
                            placeholder="Ej. Refaccionaria"
                            value={catalogoForm.giro}
                            onChange={(e) => setCatalogoForm((prev) => ({ ...prev, giro: e.target.value }))}
                        />
                        <Button onClick={handleAddGiro} disabled={catalogoLoading}>
                            <Plus size={16} className="mr-2" />
                            Agregar
                        </Button>
                    </div>

                    <div className="mb-3">
                        <Input
                            label="Buscar"
                            placeholder="Filtrar giros..."
                            value={searchGiros}
                            onChange={(e) => setSearchGiros(e.target.value)}
                            inputClassName="py-2 text-sm"
                        />
                    </div>

                    <div className="border border-border rounded-lg overflow-y-auto" style={{ maxHeight: `${MAX_VISIBLE_ITEMS * 44 + 8}px` }}>
                        <ul className="space-y-0 text-sm divide-y divide-border">
                            {catalogos.giros
                                .filter((giro) => giro.nombre.toLowerCase().includes(searchGiros.toLowerCase()))
                                .map((giro) => (
                                    <li key={giro.id_giro} className="p-2 flex items-center justify-between gap-2 hover:bg-background/50">
                                        <span className="truncate">{giro.nombre}</span>
                                        <div className="flex gap-1">
                                            <Button variant="outline" size="sm" onClick={() => handleEditGiro(giro)} disabled={catalogoLoading}>
                                                <Pencil size={16} className="hover:text-yellow-600" />
                                            </Button>
                                            <Button variant="danger" size="sm" onClick={() => handleDeleteGiro(giro.id_giro)} disabled={catalogoLoading}>
                                                <Trash2 size={16} className="hover:text-red-600" />
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            {!loading && catalogos.giros.filter((g) => g.nombre.toLowerCase().includes(searchGiros.toLowerCase())).length === 0 && (
                                <li className="p-3 text-center text-muted text-xs">Sin giros</li>
                            )}
                        </ul>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-2">
                        <ListTree size={22} className="-translate-y-1.5" />
                        <h3 className="font-semibold text-primary mb-3">Catalogo de tipos de cliente</h3>
                    </div>

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

                    <Button onClick={handleAddTipoCliente} disabled={catalogoLoading} className="mb-4">
                        <Plus size={16} className="mr-2" />
                        Agregar tipo de cliente
                    </Button>

                    <div className="mb-3">
                        <Input
                            label="Buscar"
                            placeholder="Filtrar tipos..."
                            value={searchTiposCliente}
                            onChange={(e) => setSearchTiposCliente(e.target.value)}
                            inputClassName="py-2 text-sm"
                        />
                    </div>

                    <div className="border border-border rounded-lg overflow-y-auto" style={{ maxHeight: `${MAX_VISIBLE_ITEMS * 44 + 8}px` }}>
                        <ul className="space-y-0 text-sm divide-y divide-border">
                            {catalogos.tipos_cliente
                                .filter((tipo) => tipo.nombre.toLowerCase().includes(searchTiposCliente.toLowerCase()))
                                .map((tipo) => (
                                    <li key={tipo.id_tipo_cliente} className="p-2 flex items-center justify-between gap-2 hover:bg-background/50">
                                        <span className="truncate">{tipo.nombre} (Precio {tipo.nivel_precio})</span>
                                        <div className="flex gap-1">
                                            <Button variant="outline" size="sm" onClick={() => handleEditTipoCliente(tipo)} disabled={catalogoLoading}>
                                                <Pencil size={16} className="hover:text-yellow-600" />
                                            </Button>
                                            <Button variant="danger" size="sm" onClick={() => handleDeleteTipoCliente(tipo.id_tipo_cliente)} disabled={catalogoLoading}>
                                                <Trash2 size={16} className="hover:text-red-600" />
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            {!loading && catalogos.tipos_cliente.filter((t) => t.nombre.toLowerCase().includes(searchTiposCliente.toLowerCase())).length === 0 && (
                                <li className="p-3 text-center text-muted text-xs">Sin tipos de cliente</li>
                            )}
                        </ul>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-2">
                        <ListTree size={22} className="-translate-y-1.5" />
                        <h3 className="font-semibold text-primary mb-3">Catalogo de giros de proveedor</h3>
                    </div>

                    <div className="flex flex-col md:flex-row gap-2 md:items-end mb-4">
                        <Input
                            label="Nuevo giro"
                            placeholder="Ej. Ferreteria"
                            value={catalogoForm.proveedor_giro}
                            onChange={(e) => setCatalogoForm((prev) => ({ ...prev, proveedor_giro: e.target.value }))}
                        />
                        <Button onClick={() => handleAddCatalogoProveedor("giro", "proveedor_giro", "El giro del proveedor es requerido")} disabled={catalogoLoading}>
                            <Plus size={16} className="mr-2" />
                            Agregar
                        </Button>
                    </div>

                    <div className="mb-3">
                        <Input
                            label="Buscar"
                            placeholder="Filtrar giros..."
                            value={searchGirosProveedor}
                            onChange={(e) => setSearchGirosProveedor(e.target.value)}
                            inputClassName="py-2 text-sm"
                        />
                    </div>

                    <div className="border border-border rounded-lg overflow-y-auto" style={{ maxHeight: `${MAX_VISIBLE_ITEMS * 44 + 8}px` }}>
                        <ul className="space-y-0 text-sm divide-y divide-border">
                            {catalogosProveedor.giros
                                .filter((item) => item.nombre.toLowerCase().includes(searchGirosProveedor.toLowerCase()))
                                .map((item) => (
                                    <li key={item.id_giro_proveedor} className="p-2 flex items-center justify-between gap-2 hover:bg-background/50">
                                        <span className="truncate">{item.nombre}</span>
                                        <div className="flex gap-1">
                                            <Button variant="outline" size="sm" onClick={() => handleEditGirosProveedor(item)} disabled={catalogoLoading}>
                                                <Pencil size={16} className="hover:text-yellow-600" />
                                            </Button>
                                            <Button variant="danger" size="sm" onClick={() => handleDeleteCatalogoProveedor("giro", item.id_giro_proveedor)} disabled={catalogoLoading}>
                                                <Trash2 size={16} className="hover:text-red-600" />
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            {!loading && catalogosProveedor.giros.filter((g) => g.nombre.toLowerCase().includes(searchGirosProveedor.toLowerCase())).length === 0 && (
                                <li className="p-3 text-center text-muted text-xs">Sin giros de proveedor</li>
                            )}
                        </ul>
                    </div>
                </Card>
            </div>

            {usuarioModalOpen && (
                <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
                    <Card className="p-6 w-full max-w-2xl">
                        <h3 className="text-lg font-semibold text-primary mb-4">
                            {usuarioEditingId ? "Editar usuario" : "Agregar usuario"}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            <Input
                                label="Nombre"
                                value={usuarioForm.nombre}
                                onChange={(e) => setUsuarioForm((prev) => ({ ...prev, nombre: e.target.value }))}
                                inputClassName="py-2"
                            />
                            <Input
                                label="Email"
                                type="email"
                                value={usuarioForm.email}
                                onChange={(e) => setUsuarioForm((prev) => ({ ...prev, email: e.target.value }))}
                                inputClassName="py-2"
                            />
                            <Input
                                label={usuarioEditingId ? "Contraseña nueva" : "Contraseña"}
                                type="password"
                                value={usuarioForm.password}
                                onChange={(e) => setUsuarioForm((prev) => ({ ...prev, password: e.target.value }))}
                                inputClassName="py-2"
                            />
                            <Select
                                label="Estado"
                                value={usuarioForm.activo ? "1" : "0"}
                                onChange={(e) => setUsuarioForm((prev) => ({ ...prev, activo: e.target.value === "1" }))}
                                options={[
                                    { value: "1", label: "Activo" },
                                    { value: "0", label: "Inactivo" },
                                ]}
                            />
                        </div>

                        <div className="mb-4">
                            <p className="text-sm text-muted mb-2">Roles</p>
                            <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {roles.map((rol) => (
                                    <label key={rol.id_rol} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-background/50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={usuarioForm.roles.includes(rol.id_rol)}
                                            onChange={() => toggleUsuarioRole(rol.id_rol)}
                                        />
                                        <span>{rol.nombre}</span>
                                    </label>
                                ))}
                                {!roles.length ? <p className="text-xs text-muted">Sin roles disponibles</p> : null}
                            </div>
                        </div>

                        <p className="text-xs text-muted mb-4">
                            {usuarioEditingId ? "Deja la contraseña vacía para conservar la actual." : "La contraseña se guardará hasheada en la base de datos."}
                        </p>

                        {usuarioError ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">{usuarioError}</div> : null}

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={closeUsuarioModal} disabled={usuarioLoading}>Cancelar</Button>
                            <Button variant="primary" onClick={handleSubmitUsuario} disabled={usuarioLoading}>
                                {usuarioLoading ? "Guardando..." : "Guardar"}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {catalogoError ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{catalogoError}</div> : null}

            {editingCatalogo && (
                <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
                    <Card className="p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-primary mb-4">
                            Editar {editingCatalogo.tipo === "tipo_cliente" ? "tipo de cliente" : "giro"}
                        </h3>

                        <div className="space-y-3 mb-4">
                            <Input
                                label="Nombre"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                inputClassName="py-2"
                            />
                            {editingCatalogo.tipo === "tipo_cliente" && (
                                <Select
                                    label="Nivel de precio"
                                    value={editingNivelPrecio}
                                    onChange={(e) => setEditingNivelPrecio(e.target.value)}
                                    options={[
                                        { value: "1", label: "Precio 1" },
                                        { value: "2", label: "Precio 2" },
                                        { value: "3", label: "Precio 3" },
                                        { value: "4", label: "Precio 4" },
                                        { value: "5", label: "Precio 5" },
                                    ]}
                                />
                            )}
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setEditingCatalogo(null)}>Cancelar</Button>
                            <Button variant="primary" onClick={handleSaveEdit} disabled={catalogoLoading}>Guardar</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
