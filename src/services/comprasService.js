const API_COMPRAS = "/api/compras";

async function parseOrThrow(res) {
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
}

export async function getCompras(search = "") {
    const url = search ? `${API_COMPRAS}?search=${encodeURIComponent(search)}` : API_COMPRAS;
    return parseOrThrow(await fetch(url));
}
