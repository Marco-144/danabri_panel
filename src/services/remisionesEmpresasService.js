const API = "/api/remisiones-empresas";
const API_FACTURAR = "/api/remisiones-empresas/facturar";

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

export async function getRemisionesEmpresas(params = {}) {
    return parseOrThrow(await fetch(buildUrl(API, params)));
}

export async function getRemisionEmpresaById(id) {
    return parseOrThrow(await fetch(buildUrl(API, { id })));
}

export async function createRemisionEmpresa(payload) {
    return parseOrThrow(await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    }));
}

export async function updateRemisionEmpresa(id, payload) {
    return parseOrThrow(await fetch(API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_remision_empresa: id, ...payload }),
    }));
}

export async function deleteRemisionEmpresa(id) {
    return parseOrThrow(await fetch(API, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_remision_empresa: id }),
    }));
}

export async function facturarRemisionEmpresa(id, payload) {
    return parseOrThrow(await fetch(API_FACTURAR, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_remision_empresa: id, ...payload }),
    }));
}
