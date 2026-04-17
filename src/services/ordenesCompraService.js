const BASE = "/api/ordenes-compra";

async function parseOrThrow(res) {
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
}

export async function getOrdenesCompra({ search = "", status = "" } = {}) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const qs = params.toString();
    return parseOrThrow(await fetch(`${BASE}${qs ? `?${qs}` : ""}`));
}

export async function getOrdenCompraById(id) {
    return parseOrThrow(await fetch(`${BASE}?id=${id}`));
}

export async function getKpisOrdenesCompra() {
    return parseOrThrow(await fetch(`${BASE}?kpis=1`));
}

export async function createOrdenCompra(data) {
    return parseOrThrow(
        await fetch(BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
    );
}

export async function updateOrdenCompra(id, data) {
    return parseOrThrow(
        await fetch(BASE, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...data }),
        })
    );
}

export async function deleteOrdenCompra(id) {
    return parseOrThrow(
        await fetch(`${BASE}?id=${id}`, {
            method: "DELETE",
        })
    );
}

export async function getPresentacionesParaOrden() {
    return parseOrThrow(await fetch("/api/presentaciones"));
}

export async function getProveedoresActivos() {
    // Ajustado a tu API real: usa activos=1
    return parseOrThrow(await fetch("/api/proveedores?activos=1"));
}
