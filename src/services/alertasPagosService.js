const API = "/api/alertas-pagos";

async function parseOrThrow(res) {
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
}

export async function getAlertasPagos() {
    return parseOrThrow(await fetch(API));
}

export async function getAlertasPagosKpis() {
    return parseOrThrow(await fetch(`${API}?mode=kpis`));
}

export async function getAlertasPagosRango(dias = 5) {
    return parseOrThrow(await fetch(`${API}?mode=rango&dias=${encodeURIComponent(dias)}`));
}

export async function generarSnapshotAlertas() {
    return parseOrThrow(
        await fetch(API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "snapshot" }),
        })
    );
}
