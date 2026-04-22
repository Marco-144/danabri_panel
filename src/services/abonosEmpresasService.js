const API = "/api/abonos-empresas";

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

export async function getAbonosEmpresas(params = {}) {
    return parseOrThrow(await fetch(buildUrl(API, params)));
}

export async function registrarAbonoEmpresa(payload) {
    return parseOrThrow(await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    }));
}

export async function deleteAbonoEmpresa(id) {
    return parseOrThrow(await fetch(`${API}?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
    }));
}
