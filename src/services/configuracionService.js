const API_USUARIOS = "/api/configuracion/usuarios";
const API_ROLES = "/api/configuracion/roles";
const API_AREAS = "/api/configuracion/areas";
const API_ROLES_PERMISOS = "/api/configuracion/roles/permisos";
const API_CATALOGOS_CLIENTES = "/api/catalogos-clientes-config";
const API_CATALOGOS_PROVEEDORES = "/api/catalogos-proveedores-config";
const API_BASE_PATH = String(process.env.NEXT_PUBLIC_API_BASE_PATH || "").replace(/\/$/, "");
const USER_DOCUMENT_KEYS = [
    "rfc",
    "nss",
    "acta_nacimiento",
    "ine",
    "comprobante_domicilio",
    "cartas_recomendacion",
    "solicitud_empleo",
    "contrato",
];

function resolveApiUrl(path) {
    if (!path.startsWith("/")) {
        return path;
    }

    return API_BASE_PATH ? `${API_BASE_PATH}${path}` : path;
}

async function fetchApi(input, init) {
    return fetch(resolveApiUrl(String(input)), init);
}

async function parseOrThrow(res) {
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.toLowerCase().includes("application/json");
    const responseUrl = res.url || "(url desconocida)";

    if (!isJson) {
        const text = await res.text();
        const isHtml = text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html");
        const hint = isHtml
            ? "El servidor devolvio HTML en lugar de JSON (posible redireccion o error de ruta)."
            : "El servidor devolvio una respuesta no JSON.";

        throw new Error(`${hint} HTTP ${res.status}. URL: ${responseUrl}`);
    }

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}. URL: ${responseUrl}`);
    }

    return data;
}

function isFileLike(value) {
    return value && typeof value === "object" && typeof value.arrayBuffer === "function";
}

function buildUsuarioFormData(payload) {
    const formData = new FormData();
    formData.append("nombre", payload.nombre ?? "");
    formData.append("email", payload.email ?? "");
    formData.append("password", payload.password ?? "");
    formData.append("area", payload.area ?? "");
    formData.append("padecimientos_alergias", payload.padecimientos_alergias ?? "");
    formData.append("tipo_sangre", payload.tipo_sangre ?? "");
    formData.append("activo", String(Boolean(payload.activo)));
    formData.append("roles", JSON.stringify(Array.isArray(payload.roles) ? payload.roles : []));

    const documentos = payload.documentos && typeof payload.documentos === "object" ? payload.documentos : {};
    for (const key of USER_DOCUMENT_KEYS) {
        const value = documentos[key];
        if (isFileLike(value)) {
            formData.append(key, value);
        }
    }

    if (payload.id_usuario !== undefined && payload.id_usuario !== null && payload.id_usuario !== "") {
        formData.append("id_usuario", String(payload.id_usuario));
    }

    return formData;
}

export async function getUsuarios(search = "") {
    const url = search ? `${API_USUARIOS}?search=${encodeURIComponent(search)}` : API_USUARIOS;
    return parseOrThrow(await fetchApi(url));
}

export async function getUsuarioById(id) {
    return parseOrThrow(await fetchApi(`${API_USUARIOS}?id=${encodeURIComponent(id)}`));
}

export async function createUsuario(payload) {
    return parseOrThrow(
        await fetchApi(API_USUARIOS, {
            method: "POST",
            body: buildUsuarioFormData(payload),
        })
    );
}

export async function updateUsuario(payload) {
    return parseOrThrow(
        await fetchApi(API_USUARIOS, {
            method: "PATCH",
            body: buildUsuarioFormData(payload),
        })
    );
}

export async function deleteUsuario(payload) {
    return parseOrThrow(
        await fetchApi(API_USUARIOS, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function getRoles() {
    return parseOrThrow(await fetchApi(API_ROLES));
}

export async function createRol(payload) {
    return parseOrThrow(
        await fetchApi(API_ROLES, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function updateRol(payload) {
    return parseOrThrow(
        await fetchApi(API_ROLES, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function deleteRol(payload) {
    return parseOrThrow(
        await fetchApi(API_ROLES, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function getAreas() {
    return parseOrThrow(await fetchApi(API_AREAS));
}

export async function createArea(payload) {
    return parseOrThrow(
        await fetchApi(API_AREAS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function updateArea(payload) {
    return parseOrThrow(
        await fetchApi(API_AREAS, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function deleteArea(payload) {
    return parseOrThrow(
        await fetchApi(API_AREAS, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function updateRolPermisos(payload) {
    return parseOrThrow(
        await fetchApi(API_ROLES_PERMISOS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function deleteRolPermisos(payload) {
    return parseOrThrow(
        await fetchApi(API_ROLES_PERMISOS, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function getCatalogosClientes() {
    return parseOrThrow(await fetchApi(API_CATALOGOS_CLIENTES));
}

export async function createCatalogoCliente(payload) {
    return parseOrThrow(
        await fetchApi(API_CATALOGOS_CLIENTES, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function deleteCatalogoCliente(payload) {
    return parseOrThrow(
        await fetchApi(API_CATALOGOS_CLIENTES, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function getCatalogosProveedores() {
    return parseOrThrow(await fetchApi(API_CATALOGOS_PROVEEDORES));
}

export async function createCatalogoProveedor(payload) {
    return parseOrThrow(
        await fetchApi(API_CATALOGOS_PROVEEDORES, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function deleteCatalogoProveedor(payload) {
    return parseOrThrow(
        await fetchApi(API_CATALOGOS_PROVEEDORES, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}
