"use client";

import { useCallback, useEffect, useState } from "react";
import PageTitle from "@/components/ui/PageTitle";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Pencil, Trash2, Users, Plus, Shield, Building2 } from "lucide-react";
import ReactSelect from "react-select";
import {
    createArea,
    createRol,
    createUsuario,
    deleteArea,
    deleteRol,
    deleteUsuario,
    getAreas,
    updateUsuario,
    updateArea,
    updateRol,
    updateRolPermisos,
    getUsuarios,
    getUsuarioById,
    getRoles,
} from "@/services/configuracionService";

const TIPO_SANGRE_OPTIONS = [
    { value: "A+", label: "A+" },
    { value: "A-", label: "A-" },
    { value: "B+", label: "B+" },
    { value: "B-", label: "B-" },
    { value: "AB+", label: "AB+" },
    { value: "AB-", label: "AB-" },
    { value: "O+", label: "O+" },
    { value: "O-", label: "O-" },
];

const ESTADO_OPTIONS = [
    { value: "1", label: "Activo" },
    { value: "0", label: "Inactivo" },
];

const ESTADO_AREA_OPTIONS = [
    { value: "1", label: "Activa" },
    { value: "0", label: "Inactiva" },
];

const USUARIO_DOCUMENTOS = [
    { key: "rfc", label: "RFC" },
    { key: "nss", label: "NSS" },
    { key: "acta_nacimiento", label: "Acta de nacimiento" },
    { key: "ine", label: "INE" },
    { key: "comprobante_domicilio", label: "Comprobante de domicilio" },
    { key: "cartas_recomendacion", label: "Cartas de recomendación" },
    { key: "solicitud_empleo", label: "Solicitud de empleo" },
    { key: "contrato", label: "Contrato" },
];

const isFileLike = (value) => value && typeof value === "object" && typeof value.arrayBuffer === "function";

const getDocumentoDisplayName = (documento) => {
    if (!documento) return "";
    if (isFileLike(documento)) return documento.name || "Archivo seleccionado";
    return documento.nombre_original || documento.archivo_url || "Archivo cargado";
};

const emptyUsuarioForm = {
    nombre: "",
    email: "",
    password: "",
    area: "",
    rol_area: null,
    padecimientos_alergias: "",
    tipo_sangre: "",
    activo: true,
    roles: [],
    documentos: {},
};

const TABS = [
    { key: "usuarios", label: "Usuarios", icon: <Users size={16} /> },
    { key: "areas", label: "Areas", icon: <Building2 size={16} /> },
    { key: "roles", label: "Roles y permisos", icon: <Shield size={16} /> },
];

export default function UsuariosPage() {
    const [activeTab, setActiveTab] = useState("usuarios");
    const [search, setSearch] = useState("");
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [areas, setAreas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [usuarioModalOpen, setUsuarioModalOpen] = useState(false);
    const [usuarioEditingId, setUsuarioEditingId] = useState(null);
    const [usuarioForm, setUsuarioForm] = useState(emptyUsuarioForm);
    const [usuarioLoading, setUsuarioLoading] = useState(false);
    const [usuarioError, setUsuarioError] = useState("");
    const [generalError, setGeneralError] = useState("");

    const [areaForm, setAreaForm] = useState({ id_area: null, nombre: "", activo: true });
    const [areaLoading, setAreaLoading] = useState(false);

    const [rolForm, setRolForm] = useState({ id_rol: null, nombre: "" });
    const [rolLoading, setRolLoading] = useState(false);
    const [selectedRolPermisos, setSelectedRolPermisos] = useState(null);

    const ITEMS_PER_PAGE_USUARIOS = 8;
    const [pageUsuarios, setPageUsuarios] = useState(1);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [u, r, a] = await Promise.all([getUsuarios(search), getRoles(), getAreas()]);
            setUsuarios(Array.isArray(u) ? u : []);
            setRoles(Array.isArray(r) ? r : []);
            setAreas(Array.isArray(a) ? a : []);
            setGeneralError("");
        } catch (e) {
            setGeneralError(e.message || "No se pudo cargar la vista de usuarios");
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => setPageUsuarios(1), [search]);

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
            const rolAreaId = Array.isArray(detalle.role_ids) && detalle.role_ids.length ? detalle.role_ids[0] : null;
            const rolAreaOption = roles.find((r) => r.id_rol === rolAreaId);
            const rolAreaLabel = rolAreaOption?.nombre || detalle.area || "";

            setUsuarioForm({
                nombre: detalle.nombre || "",
                email: detalle.email || "",
                password: "",
                area: rolAreaLabel || "",
                rol_area: rolAreaId || null,
                padecimientos_alergias: detalle.padecimientos_alergias || "",
                tipo_sangre: detalle.tipo_sangre || "",
                activo: Boolean(detalle.activo),
                roles: Array.isArray(detalle.role_ids) ? detalle.role_ids : [],
                documentos: detalle.documentos || {},
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

    const handleUsuarioDocumentoChange = (documentKey, file) => {
        setUsuarioForm((prev) => ({
            ...prev,
            documentos: {
                ...(prev.documentos || {}),
                [documentKey]: file || null,
            },
        }));
    };

    const handleSubmitUsuario = async () => {
        const nombre = String(usuarioForm.nombre || "").trim();
        const email = String(usuarioForm.email || "").trim();
        const password = String(usuarioForm.password || "").trim();
        const area = String(usuarioForm.area || "").trim();
        const padecimientos_alergias = String(usuarioForm.padecimientos_alergias || "").trim();
        const tipo_sangre = String(usuarioForm.tipo_sangre || "").trim();

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
                area,
                rol_area: usuarioForm.rol_area || null,
                padecimientos_alergias,
                tipo_sangre,
                roles: usuarioForm.roles,
                documentos: usuarioForm.documentos,
            };

            if (password) payload.password = password;

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

    const handleSaveArea = async () => {
        const nombre = String(areaForm.nombre || "").trim();
        if (!nombre) {
            setGeneralError("El nombre del area es requerido");
            return;
        }

        try {
            setAreaLoading(true);
            setGeneralError("");
            if (areaForm.id_area) {
                await updateArea(areaForm);
            } else {
                await createArea(areaForm);
            }
            setAreaForm({ id_area: null, nombre: "", activo: true });
            await load();
        } catch (e) {
            setGeneralError(e.message || "No se pudo guardar el area");
        } finally {
            setAreaLoading(false);
        }
    };

    const handleEditArea = (area) => {
        setAreaForm({
            id_area: area.id_area,
            nombre: area.nombre || "",
            activo: Boolean(area.activo),
        });
    };

    const handleDeleteArea = async (area) => {
        const confirmar = window.confirm(`¿Eliminar el area ${area.nombre}?`);
        if (!confirmar) return;

        try {
            setAreaLoading(true);
            setGeneralError("");
            await deleteArea({ id_area: area.id_area });
            await load();
        } catch (e) {
            setGeneralError(e.message || "No se pudo eliminar el area");
        } finally {
            setAreaLoading(false);
        }
    };

    const handleSaveRol = async () => {
        const nombre = String(rolForm.nombre || "").trim();
        if (!nombre) {
            setGeneralError("El nombre del rol es requerido");
            return;
        }

        try {
            setRolLoading(true);
            setGeneralError("");
            if (rolForm.id_rol) {
                await updateRol(rolForm);
            } else {
                await createRol(rolForm);
            }
            setRolForm({ id_rol: null, nombre: "" });
            await load();
        } catch (e) {
            setGeneralError(e.message || "No se pudo guardar el rol");
        } finally {
            setRolLoading(false);
        }
    };

    const handleEditRol = (rol) => {
        setRolForm({ id_rol: rol.id_rol, nombre: rol.nombre || "" });
    };

    const handleDeleteRol = async (rol) => {
        const confirmar = window.confirm(`¿Eliminar el rol ${rol.nombre}?`);
        if (!confirmar) return;

        try {
            setRolLoading(true);
            setGeneralError("");
            await deleteRol({ id_rol: rol.id_rol });
            if (selectedRolPermisos?.value === rol.id_rol) {
                setSelectedRolPermisos(null);
            }
            await load();
        } catch (e) {
            setGeneralError(e.message || "No se pudo eliminar el rol");
        } finally {
            setRolLoading(false);
        }
    };

    const handlePermisosChange = async (idArea, key, value) => {
        if (!selectedRolPermisos?.value) {
            setGeneralError("Selecciona un rol para editar permisos");
            return;
        }

        const selectedRole = roles.find((item) => item.id_rol === selectedRolPermisos.value);
        const permisoActual = selectedRole?.permisos_por_area?.find((item) => item.id_area === idArea) || {
            puede_asignar_usuarios: false,
            puede_gestionar_permisos: false,
        };

        const payload = {
            id_rol: selectedRolPermisos.value,
            id_area: idArea,
            puede_asignar_usuarios: key === "puede_asignar_usuarios" ? value : Boolean(permisoActual.puede_asignar_usuarios),
            puede_gestionar_permisos: key === "puede_gestionar_permisos" ? value : Boolean(permisoActual.puede_gestionar_permisos),
        };

        try {
            setRolLoading(true);
            setGeneralError("");
            await updateRolPermisos(payload);
            await load();
        } catch (e) {
            setGeneralError(e.message || "No se pudieron actualizar los permisos");
        } finally {
            setRolLoading(false);
        }
    };

    const handleDeleteUsuario = async (usuario) => {
        const confirmar = window.confirm(`¿Eliminar al usuario ${usuario.nombre}?`);
        if (!confirmar) return;
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

    const rolesOptions = roles.map((r) => ({ value: r.id_rol, label: r.nombre }));
    const selectedRoleData = roles.find((item) => item.id_rol === selectedRolPermisos?.value);

    return (
        <div className="space-y-4">
            <PageTitle title="Usuarios" subtitle="Gestión de usuarios y RH" icon={<Users />} />

            {generalError ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{generalError}</div> : null}

            <Card className="p-3">
                <div className="flex flex-wrap gap-2">
                    {TABS.map((tab) => (
                        <Button
                            key={tab.key}
                            variant={activeTab === tab.key ? "primary" : "outline"}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.icon}
                            {tab.label}
                        </Button>
                    ))}
                </div>
            </Card>

            {activeTab === "usuarios" ? (
                <Card className="p-4">
                    <p className="text-sm text-muted mb-2">Buscar Usuario</p>
                    <Input className="w-full md:w-[360px] mb-6" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre o email" />
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
                        <table className="w-full text-sm min-w-[760px]">
                            <thead className="bg-background text-primary">
                                <tr>
                                    <th className="text-left p-3">Nombre</th>
                                    <th className="text-left p-3">Email</th>
                                    <th className="text-left p-3">Área</th>
                                    <th className="text-left p-3">Rol</th>
                                    <th className="text-left p-3">Sangre</th>
                                    <th className="text-left p-3">Estado</th>
                                    <th className="text-left p-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} className="p-6 text-center text-muted">Cargando...</td></tr>
                                ) : usuarios.slice((pageUsuarios - 1) * ITEMS_PER_PAGE_USUARIOS, pageUsuarios * ITEMS_PER_PAGE_USUARIOS).length === 0 ? (
                                    <tr><td colSpan={7} className="p-6 text-center text-muted">Sin usuarios</td></tr>
                                ) : usuarios.slice((pageUsuarios - 1) * ITEMS_PER_PAGE_USUARIOS, pageUsuarios * ITEMS_PER_PAGE_USUARIOS).map((u) => (
                                    <tr key={u.id_usuario} className="border-t border-border hover:bg-background/50">
                                        <td className="p-3">{u.nombre}</td>
                                        <td className="p-3 text-xs">{u.email}</td>
                                        <td className="p-3 text-xs">{u.area || "-"}</td>
                                        <td className="p-3">{u.roles || "-"}</td>
                                        <td className="p-3 text-xs">{u.tipo_sangre || "-"}</td>
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
                                <button onClick={() => setPageUsuarios(Math.max(1, pageUsuarios - 1))} disabled={pageUsuarios === 1} className="px-2 py-1 rounded hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed">←</button>
                                <span className="px-2 py-1">{pageUsuarios} / {Math.ceil(usuarios.length / ITEMS_PER_PAGE_USUARIOS)}</span>
                                <button onClick={() => setPageUsuarios(Math.min(Math.ceil(usuarios.length / ITEMS_PER_PAGE_USUARIOS), pageUsuarios + 1))} disabled={pageUsuarios >= Math.ceil(usuarios.length / ITEMS_PER_PAGE_USUARIOS)} className="px-2 py-1 rounded hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed">→</button>
                            </div>
                        </div>
                    )}
                </Card>
            ) : null}

            {activeTab === "areas" ? (
                <Card className="p-4 space-y-4">
                    <h3 className="font-semibold text-primary">CRUD de Areas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Input
                            className="md:col-span-2"
                            label="Nombre del area"
                            value={areaForm.nombre}
                            onChange={(e) => setAreaForm((prev) => ({ ...prev, nombre: e.target.value }))}
                        />
                        <div>
                            <label className="block text-sm text-muted mb-1">Estado</label>
                            <ReactSelect
                                options={ESTADO_AREA_OPTIONS}
                                value={ESTADO_AREA_OPTIONS.find((opt) => opt.value === (areaForm.activo ? "1" : "0")) || null}
                                onChange={(opt) => setAreaForm((prev) => ({ ...prev, activo: opt?.value === "1" }))}
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleSaveArea} disabled={areaLoading}>{areaForm.id_area ? "Actualizar area" : "Crear area"}</Button>
                        {areaForm.id_area ? (
                            <Button variant="outline" onClick={() => setAreaForm({ id_area: null, nombre: "", activo: true })}>Cancelar edición</Button>
                        ) : null}
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-sm">
                            <thead className="bg-background text-primary">
                                <tr>
                                    <th className="text-left p-3">Area</th>
                                    <th className="text-left p-3">Estado</th>
                                    <th className="text-left p-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {areas.length ? areas.map((area) => (
                                    <tr key={area.id_area} className="border-t border-border">
                                        <td className="p-3">{area.nombre}</td>
                                        <td className="p-3">{area.activo ? "Activa" : "Inactiva"}</td>
                                        <td className="p-3">
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleEditArea(area)}><Pencil size={16} /></Button>
                                                <Button variant="danger" size="sm" onClick={() => handleDeleteArea(area)}><Trash2 size={16} /></Button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={3} className="p-6 text-center text-muted">Sin areas</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : null}

            {activeTab === "roles" ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <Card className="p-4 space-y-4">
                        <h3 className="font-semibold text-primary">CRUD de Roles</h3>
                        <Input
                            label="Nombre del rol"
                            value={rolForm.nombre}
                            onChange={(e) => setRolForm((prev) => ({ ...prev, nombre: e.target.value }))}
                        />
                        <div className="flex gap-2">
                            <Button onClick={handleSaveRol} disabled={rolLoading}>{rolForm.id_rol ? "Actualizar rol" : "Crear rol"}</Button>
                            {rolForm.id_rol ? <Button variant="outline" onClick={() => setRolForm({ id_rol: null, nombre: "" })}>Cancelar edición</Button> : null}
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-border">
                            <table className="w-full text-sm">
                                <thead className="bg-background text-primary">
                                    <tr>
                                        <th className="text-left p-3">Rol</th>
                                        <th className="text-left p-3">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {roles.length ? roles.map((rol) => (
                                        <tr key={rol.id_rol} className="border-t border-border">
                                            <td className="p-3">{rol.nombre}</td>
                                            <td className="p-3">
                                                <div className="flex gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleEditRol(rol)}><Pencil size={16} /></Button>
                                                    <Button variant="danger" size="sm" onClick={() => handleDeleteRol(rol)}><Trash2 size={16} /></Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={2} className="p-6 text-center text-muted">Sin roles</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card className="p-4 space-y-4">
                        <h3 className="font-semibold text-primary">Permisos del sistema por area</h3>
                        <div>
                            <label className="block text-sm text-muted mb-1">Rol a configurar</label>
                            <ReactSelect
                                options={rolesOptions}
                                value={selectedRolPermisos}
                                onChange={(option) => setSelectedRolPermisos(option)}
                                placeholder="Selecciona un rol"
                            />
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-border">
                            <table className="w-full text-sm min-w-[520px]">
                                <thead className="bg-background text-primary">
                                    <tr>
                                        <th className="text-left p-3">Area</th>
                                        <th className="text-left p-3">Asignar usuarios</th>
                                        <th className="text-left p-3">Gestionar permisos</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!selectedRolPermisos ? (
                                        <tr><td colSpan={3} className="p-6 text-center text-muted">Selecciona un rol para editar permisos</td></tr>
                                    ) : !areas.length ? (
                                        <tr><td colSpan={3} className="p-6 text-center text-muted">No hay areas registradas</td></tr>
                                    ) : areas.map((area) => {
                                        const permiso = selectedRoleData?.permisos_por_area?.find((item) => item.id_area === area.id_area);
                                        const puedeAsignar = Boolean(permiso?.puede_asignar_usuarios);
                                        const puedeGestionar = Boolean(permiso?.puede_gestionar_permisos);

                                        return (
                                            <tr key={area.id_area} className="border-t border-border">
                                                <td className="p-3">{area.nombre}</td>
                                                <td className="p-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={puedeAsignar}
                                                        onChange={(e) => handlePermisosChange(area.id_area, "puede_asignar_usuarios", e.target.checked)}
                                                        disabled={rolLoading}
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={puedeGestionar}
                                                        onChange={(e) => handlePermisosChange(area.id_area, "puede_gestionar_permisos", e.target.checked)}
                                                        disabled={rolLoading}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            ) : null}

            {activeTab === "usuarios" && usuarioModalOpen && (
                <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
                    <Card className="p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white">
                        <h3 className="text-lg font-semibold text-primary mb-4">{usuarioEditingId ? "Editar usuario" : "Agregar usuario"}</h3>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Input label="Nombre" value={usuarioForm.nombre} onChange={(e) => setUsuarioForm((prev) => ({ ...prev, nombre: e.target.value }))} inputClassName="py-2" />
                                    <Input label="Email" type="email" value={usuarioForm.email} onChange={(e) => setUsuarioForm((prev) => ({ ...prev, email: e.target.value }))} inputClassName="py-2" />

                                    <div className="md:col-span-1">
                                        <label className="block text-sm text-muted mb-1">Rol del área</label>
                                        <ReactSelect
                                            options={rolesOptions}
                                            value={usuarioForm.rol_area ? rolesOptions.find((o) => o.value === usuarioForm.rol_area) : null}
                                            onChange={(opt) => setUsuarioForm((prev) => ({ ...prev, rol_area: opt ? opt.value : null, area: opt ? opt.label : "" }))}
                                            isClearable
                                            placeholder="Seleccionar rol del área"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-muted mb-1">Tipo de sangre</label>
                                        <ReactSelect
                                            options={TIPO_SANGRE_OPTIONS}
                                            value={TIPO_SANGRE_OPTIONS.find((opt) => opt.value === usuarioForm.tipo_sangre) || null}
                                            onChange={(opt) => setUsuarioForm((prev) => ({ ...prev, tipo_sangre: opt?.value || "" }))}
                                            isClearable
                                            placeholder="Seleccionar"
                                        />
                                    </div>

                                    <Input label={usuarioEditingId ? "Contraseña nueva" : "Contraseña"} type="password" value={usuarioForm.password} onChange={(e) => setUsuarioForm((prev) => ({ ...prev, password: e.target.value }))} inputClassName="py-2" />

                                    <div>
                                        <label className="block text-sm text-muted mb-1">Estado</label>
                                        <ReactSelect
                                            options={ESTADO_OPTIONS}
                                            value={ESTADO_OPTIONS.find((opt) => opt.value === (usuarioForm.activo ? "1" : "0")) || null}
                                            onChange={(opt) => setUsuarioForm((prev) => ({ ...prev, activo: opt?.value === "1" }))}
                                        />
                                    </div>
                                </div>

                                <Textarea label="Padecimientos / alergias" value={usuarioForm.padecimientos_alergias} onChange={(e) => setUsuarioForm((prev) => ({ ...prev, padecimientos_alergias: e.target.value }))} placeholder="Información médica o alergias relevantes" textareaClassName="min-h-28" />
                            </div>

                            <div className="space-y-4 rounded-xl border border-border bg-background/40 p-4">
                                <div>
                                    <h4 className="font-semibold text-primary mb-1">Documentos del usuario</h4>
                                    <p className="text-xs text-muted">Carga cada archivo en PDF. Si editas un usuario, puedes dejar vacío un campo para conservar el archivo actual.</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {USUARIO_DOCUMENTOS.map((documento) => {
                                        const currentDocumento = usuarioForm.documentos?.[documento.key];
                                        return (
                                            <div key={documento.key} className="rounded-lg border border-border bg-white/70 p-3 space-y-2">
                                                <div>
                                                    <label className="block text-sm text-muted mb-1">{documento.label}</label>
                                                    <Input type="file" accept=".pdf,application/pdf" onChange={(e) => handleUsuarioDocumentoChange(documento.key, e.target.files?.[0] || null)} inputClassName="py-2" />
                                                </div>
                                                {currentDocumento ? (
                                                    <div className="text-xs text-muted space-y-1">
                                                        <p className="truncate">{getDocumentoDisplayName(currentDocumento)}</p>
                                                        {!isFileLike(currentDocumento) && currentDocumento.archivo_url ? (
                                                            <a href={currentDocumento.archivo_url} target="_blank" rel="noreferrer" className="text-secondary underline underline-offset-2">Ver archivo actual</a>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted">Sin archivo cargado</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm text-muted mb-2">Roles</p>
                            <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {roles.map((rol) => (
                                    <label key={rol.id_rol} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-background/50 cursor-pointer">
                                        <input type="checkbox" checked={usuarioForm.roles.includes(rol.id_rol)} onChange={() => toggleUsuarioRole(rol.id_rol)} />
                                        <span>{rol.nombre}</span>
                                    </label>
                                ))}
                                {!roles.length ? <p className="text-xs text-muted">Sin roles disponibles</p> : null}
                            </div>
                        </div>

                        <p className="text-xs text-muted mb-4">{usuarioEditingId ? "Deja la contraseña vacía para conservar la actual." : "La contraseña se guardará hasheada en la base de datos."}</p>

                        {usuarioError ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">{usuarioError}</div> : null}

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={closeUsuarioModal} disabled={usuarioLoading}>Cancelar</Button>
                            <Button variant="primary" onClick={handleSubmitUsuario} disabled={usuarioLoading}>{usuarioLoading ? "Guardando..." : "Guardar"}</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
