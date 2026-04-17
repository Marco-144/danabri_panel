const API_USUARIOS = "/api/configuracion/usuarios";
const API_ROLES = "/api/configuracion/roles";
const API_CATALOGOS_CLIENTES = "/api/configuracion/catalogos-clientes";
const API_CATALOGOS_PROVEEDORES = "/api/configuracion/catalogos-proveedores";

async function parseOrThrow(res) {
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
}

export async function getUsuarios(search = "") {
    const url = search ? `${API_USUARIOS}?search=${encodeURIComponent(search)}` : API_USUARIOS;
    return parseOrThrow(await fetch(url));
}

export async function getUsuarioById(id) {
    return parseOrThrow(await fetch(`${API_USUARIOS}?id=${encodeURIComponent(id)}`));
}

export async function createUsuario(payload) {
    return parseOrThrow(
        await fetch(API_USUARIOS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function updateUsuario(payload) {
    return parseOrThrow(
        await fetch(API_USUARIOS, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function deleteUsuario(payload) {
    return parseOrThrow(
        await fetch(API_USUARIOS, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function getRoles() {
    return parseOrThrow(await fetch(API_ROLES));
}

export async function getCatalogosClientes() {
    return parseOrThrow(await fetch(API_CATALOGOS_CLIENTES));
}

export async function createCatalogoCliente(payload) {
    return parseOrThrow(
        await fetch(API_CATALOGOS_CLIENTES, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function deleteCatalogoCliente(payload) {
    return parseOrThrow(
        await fetch(API_CATALOGOS_CLIENTES, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function getCatalogosProveedores() {
    return parseOrThrow(await fetch(API_CATALOGOS_PROVEEDORES));
}

export async function createCatalogoProveedor(payload) {
    return parseOrThrow(
        await fetch(API_CATALOGOS_PROVEEDORES, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function deleteCatalogoProveedor(payload) {
    return parseOrThrow(
        await fetch(API_CATALOGOS_PROVEEDORES, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}
