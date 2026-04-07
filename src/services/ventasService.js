const API_VENTAS = "/api/ventas";

async function parseOrThrow(res) {
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
}

export async function getVentas(search = "") {
    const url = search ? `${API_VENTAS}?search=${encodeURIComponent(search)}` : API_VENTAS;
    return parseOrThrow(await fetch(url));
}
