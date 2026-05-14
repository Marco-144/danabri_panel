const API = "/api/remisiones-clientes";
const API_FACTURAR = "/api/remisiones-clientes/facturar";

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

export async function getRemisionesClientes(params = {}) {
    return parseOrThrow(await fetch(buildUrl(API, params)));
}

export async function getRemisionClienteById(id) {
    return parseOrThrow(await fetch(buildUrl(API, { id })));
}

export async function createRemisionCliente(payload) {
    return parseOrThrow(await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    }));
}

export async function updateRemisionCliente(id, payload) {
    return parseOrThrow(await fetch(API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_remision: id, ...payload }),
    }));
}

export async function deleteRemisionCliente(id) {
    return parseOrThrow(await fetch(API, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_remision: id }),
    }));
}

export async function facturarRemisionCliente(id, payload = {}) {
    const body = { id_remision: id, ...payload };
    return parseOrThrow(await fetch(API_FACTURAR, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }));
}
