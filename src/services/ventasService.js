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

export async function getVentaById(id) {
    return parseOrThrow(await fetch(`${API_VENTAS}?id=${encodeURIComponent(id)}`));
}

export async function getVentaTicketById(id) {
    return parseOrThrow(await fetch(`${API_VENTAS}?id=${encodeURIComponent(id)}&ticket=1`));
}

export async function getVentasCatalog({ id_almacen, search = "" } = {}) {
    const params = new URLSearchParams();
    params.set("catalog", "1");
    if (id_almacen) params.set("id_almacen", String(id_almacen));
    if (search) params.set("search", search);
    return parseOrThrow(await fetch(`${API_VENTAS}?${params.toString()}`));
}

export async function createVenta(payload) {
    return parseOrThrow(
        await fetch(API_VENTAS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function updateVenta(id, payload) {
    return parseOrThrow(
        await fetch(API_VENTAS, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...payload }),
        })
    );
}

export async function deleteVenta(id) {
    return parseOrThrow(
        await fetch(API_VENTAS, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        })
    );
}
