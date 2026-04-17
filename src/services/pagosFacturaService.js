const API = "/api/pagos-factura";

async function parseOrThrow(res) {
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
}

export async function getPagosByFactura(id_factura) {
    return parseOrThrow(await fetch(`${API}?id_factura=${encodeURIComponent(id_factura)}`));
}

export async function registrarPago(payload) {
    return parseOrThrow(
        await fetch(API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
    );
}

export async function cancelarFacturaPago(id_factura) {
    return parseOrThrow(
        await fetch(API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "cancelar-factura", id_factura }),
        })
    );
}

export async function deletePago(id_pago) {
    return parseOrThrow(
        await fetch(`${API}?id_pago=${encodeURIComponent(id_pago)}`, {
            method: "DELETE",
        })
    );
}
