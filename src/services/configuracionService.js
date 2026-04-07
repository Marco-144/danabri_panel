const API_USUARIOS = "/api/configuracion/usuarios";
const API_ROLES = "/api/configuracion/roles";

async function parseOrThrow(res) {
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
}

export async function getUsuarios(search = "") {
    const url = search ? `${API_USUARIOS}?search=${encodeURIComponent(search)}` : API_USUARIOS;
    return parseOrThrow(await fetch(url));
}

export async function getRoles() {
    return parseOrThrow(await fetch(API_ROLES));
}
