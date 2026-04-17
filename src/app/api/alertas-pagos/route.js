import {
    generarSnapshotAlertasDelDia,
    getAlertasDelDia,
    getAlertasVencidasYProximas,
    getKpisPagos,
} from "@/modules/alertas-pagos.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const mode = searchParams.get("mode") || "";

        if (mode === "kpis") {
            return Response.json(await getKpisPagos());
        }

        if (mode === "rango") {
            const dias = Number(searchParams.get("dias") || 5);
            return Response.json(await getAlertasVencidasYProximas(dias));
        }

        return Response.json(await getAlertasDelDia());
    } catch (error) {
        return Response.json({ error: error.message || "Error al obtener alertas" }, { status: 400 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json().catch(() => ({}));
        const action = body.action || "snapshot";

        if (action === "snapshot") {
            return Response.json(await generarSnapshotAlertasDelDia());
        }

        return Response.json({ error: "Accion no soportada" }, { status: 400 });
    } catch (error) {
        return Response.json({ error: error.message || "Error al generar snapshot" }, { status: 400 });
    }
}
