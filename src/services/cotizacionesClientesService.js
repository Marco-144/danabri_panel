const API_BASE = "/api/cotizaciones-clientes";
const API_CATALOGOS = "/api/cotizaciones-clientes/catalogos";

async function parseOrThrow(response) {
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
    return data;
}

function buildUrl(basePath, params = {}) {
    const url = new URL(
        basePath,
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
    );

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value) !== "") {
            url.searchParams.set(key, String(value));
        }
    });

    return url.toString();
}

export async function getCotizacionesClientes(params = {}) {
    return parseOrThrow(await fetch(buildUrl(API_BASE, params)));
}

export async function getCotizacionClienteById(id) {
    return parseOrThrow(await fetch(buildUrl(API_BASE, { id })));
}

export async function createCotizacionCliente(payload) {
    return parseOrThrow(await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    }));
}

export async function updateCotizacionCliente(id, payload) {
    return parseOrThrow(await fetch(API_BASE, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_cotizacion: id, ...payload }),
    }));
}

export async function deleteCotizacionCliente(id) {
    return parseOrThrow(await fetch(API_BASE, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_cotizacion: id }),
    }));
}

export async function searchClientesCotizacion(search = "", limit = 15) {
    return parseOrThrow(await fetch(buildUrl(API_CATALOGOS, { type: "clientes", search, limit })));
}

export async function searchProductosCotizacionCliente(search = "", limit = 20) {
    return parseOrThrow(await fetch(buildUrl(API_CATALOGOS, { type: "productos", search, limit })));
}

export async function searchPresentacionesCliente(search = "", limit = 20, unidad = "") {
    return parseOrThrow(await fetch(buildUrl(API_CATALOGOS, { type: "presentaciones", search, limit, unidad })));
}
