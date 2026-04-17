const API = "/api/facturas-proveedor";

async function parseOrThrow(res) {
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
}

export async function getFacturasProveedor(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value) !== "") {
            query.set(key, String(value));
        }
    });
    const qs = query.toString();
    return parseOrThrow(await fetch(`${API}${qs ? `?${qs}` : ""}`));
}

export async function getFacturaById(id) {
    return parseOrThrow(await fetch(`${API}?id=${encodeURIComponent(id)}`));
}

export async function createFactura(payload) {
    return parseOrThrow(
        await fetch(API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function updateFacturaDetalle(id_factura, detalles_updates) {
    return parseOrThrow(
        await fetch(API, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_factura, detalles_updates }),
        })
    );
}

export async function deleteLineaFactura(id_detalle) {
    return parseOrThrow(
        await fetch(`${API}?id_detalle=${encodeURIComponent(id_detalle)}`, {
            method: "DELETE",
        })
    );
}

export async function deleteFactura(id_factura) {
    return parseOrThrow(
        await fetch(`${API}?id_factura=${encodeURIComponent(id_factura)}`, {
            method: "DELETE",
        })
    );
}

export async function uploadArchivoFactura(file, folder = "general") {
    const fd = new FormData();
    fd.append("archivo", file);
    fd.append("folder", folder);

    return parseOrThrow(
        await fetch(`${API}?action=upload`, {
            method: "POST",
            body: fd,
        })
    );
}

export function getDownloadFacturaUrl(id, tipo = "pdf") {
    return `${API}?action=download&id=${encodeURIComponent(id)}&tipo=${encodeURIComponent(tipo)}`;
}

export async function cerrarFacturaInventario(id_factura) {
    return parseOrThrow(
        await fetch("/api/pagos-factura", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "cerrar-factura", id_factura }),
        })
    );
}
