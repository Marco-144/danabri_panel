const API_BASE = "/api/empresas";

async function parseOrThrow(res) {
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
}

export async function getEmpresas(params = {}) {
    const url = new URL(
        API_BASE,
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
    );

    const search = String(params.search || "").trim();
    const cp = String(params.cp || "").trim();
    const hasRfc = params.has_rfc || "all";
    const activo = params.activo || "all";

    if (search) url.searchParams.set("search", search);
    if (cp) url.searchParams.set("cp", cp);
    if (["all", "0", "1"].includes(String(hasRfc))) {
        url.searchParams.set("has_rfc", String(hasRfc));
    }
    if (["all", "0", "1"].includes(String(activo))) {
        url.searchParams.set("activo", String(activo));
    }

    return parseOrThrow(await fetch(url.toString()));
}

export async function getEmpresaById(id) {
    return parseOrThrow(await fetch(`${API_BASE}?id=${encodeURIComponent(id)}`));
}

export async function createEmpresa(payload) {
    return parseOrThrow(
        await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function updateEmpresa(id, payload) {
    return parseOrThrow(
        await fetch(API_BASE, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_empresa: id, ...payload }),
        })
    );
}

export async function deleteEmpresa(id) {
    return parseOrThrow(
        await fetch(API_BASE, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_empresa: id }),
        })
    );
}
