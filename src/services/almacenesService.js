const API_ALMACENES = "/api/almacenes";
const API_INVENTARIO = "/api/inventario";
const API_MOVIMIENTOS = "/api/movimientos-inventario";

async function parseOrThrow(res) {
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
}

export async function getAlmacenes(search = "") {
    const url = search ? `${API_ALMACENES}?search=${encodeURIComponent(search)}` : API_ALMACENES;
    return parseOrThrow(await fetch(url));
}

export async function createAlmacen(payload) {
    return parseOrThrow(
        await fetch(API_ALMACENES, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function updateAlmacen(id, payload) {
    return parseOrThrow(
        await fetch(API_ALMACENES, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...payload }),
        })
    );
}

export async function deleteAlmacen(id) {
    return parseOrThrow(
        await fetch(API_ALMACENES, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        })
    );
}

export async function getInventario({ id_almacen = "", search = "", soloBajoMinimo = false } = {}) {
    const q = new URLSearchParams();
    if (id_almacen) q.set("id_almacen", String(id_almacen));
    if (search) q.set("search", search);
    if (soloBajoMinimo) q.set("soloBajoMinimo", "1");
    return parseOrThrow(await fetch(`${API_INVENTARIO}?${q.toString()}`));
}

export async function createInventario(payload) {
    return parseOrThrow(
        await fetch(API_INVENTARIO, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function updateInventario(id, payload) {
    return parseOrThrow(
        await fetch(API_INVENTARIO, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...payload }),
        })
    );
}

export async function deleteInventario(id) {
    return parseOrThrow(
        await fetch(API_INVENTARIO, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        })
    );
}

export async function ajusteInventario(payload) {
    return parseOrThrow(
        await fetch(`${API_INVENTARIO}/ajuste`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function traspasoInventario(payload) {
    return parseOrThrow(
        await fetch(`${API_INVENTARIO}/traspaso`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function getMovimientos({ id_almacen = "", tipo = "", origen = "", desde = "", hasta = "", search = "" } = {}) {
    const q = new URLSearchParams();
    if (id_almacen) q.set("id_almacen", String(id_almacen));
    if (tipo) q.set("tipo", tipo);
    if (origen) q.set("origen", origen);
    if (desde) q.set("desde", desde);
    if (hasta) q.set("hasta", hasta);
    if (search) q.set("search", search);
    return parseOrThrow(await fetch(`${API_MOVIMIENTOS}?${q.toString()}`));
}

export async function createMovimiento(payload) {
    return parseOrThrow(
        await fetch(API_MOVIMIENTOS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function updateMovimiento(id, payload) {
    return parseOrThrow(
        await fetch(API_MOVIMIENTOS, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...payload }),
        })
    );
}

export async function deleteMovimiento(id) {
    return parseOrThrow(
        await fetch(API_MOVIMIENTOS, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        })
    );
}

export async function getAlertasStock({ id_almacen = "", search = "" } = {}) {
    const q = new URLSearchParams();
    if (id_almacen) q.set("id_almacen", String(id_almacen));
    if (search) q.set("search", search);
    return parseOrThrow(await fetch(`${API_INVENTARIO}/alertas?${q.toString()}`));
}

export async function createAlertaStock(payload) {
    return parseOrThrow(
        await fetch(`${API_INVENTARIO}/alertas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function updateAlertaStock(id, payload) {
    return parseOrThrow(
        await fetch(`${API_INVENTARIO}/alertas`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...payload }),
        })
    );
}

export async function deleteAlertaStock(id) {
    return parseOrThrow(
        await fetch(`${API_INVENTARIO}/alertas`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        })
    );
}
