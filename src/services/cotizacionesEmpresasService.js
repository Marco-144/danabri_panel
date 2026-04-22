const API_BASE = "/api/cotizaciones-empresas";
const API_CATALOGOS = "/api/cotizaciones-empresas/catalogos";

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

export async function getCotizacionesEmpresas(params = {}) {
    const url = buildUrl(API_BASE, params);
    return parseOrThrow(await fetch(url));
}

export async function getCotizacionEmpresaById(id) {
    const url = buildUrl(API_BASE, { id });
    return parseOrThrow(await fetch(url));
}

export async function createCotizacionEmpresa(payload) {
    return parseOrThrow(
        await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function updateCotizacionEmpresa(id, payload) {
    return parseOrThrow(
        await fetch(API_BASE, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_cotizacion_empresa: id, ...payload }),
        })
    );
}

export async function deleteCotizacionEmpresa(id) {
    return parseOrThrow(
        await fetch(API_BASE, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_cotizacion_empresa: id }),
        })
    );
}

export async function searchEmpresasCotizacion(search = "", limit = 15) {
    const url = buildUrl(API_CATALOGOS, { type: "empresas", search, limit });
    return parseOrThrow(await fetch(url));
}

export async function searchProductosCotizacion(search = "", limit = 20) {
    const url = buildUrl(API_CATALOGOS, { type: "productos", search, limit });
    return parseOrThrow(await fetch(url));
}
