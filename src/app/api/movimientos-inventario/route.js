import { getMovimientos } from "@/modules/almacenes.service";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        const data = await getMovimientos({
            id_almacen: searchParams.get("id_almacen") || null,
            tipo: searchParams.get("tipo") || "",
            origen: searchParams.get("origen") || "",
            desde: searchParams.get("desde") || "",
            hasta: searchParams.get("hasta") || "",
            search: searchParams.get("search") || "",
        });

        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function POST(req) {
    return Response.json({ error: "Los movimientos son solo de consulta" }, { status: 405 });
}

export async function PUT(req) {
    return Response.json({ error: "Los movimientos son solo de consulta" }, { status: 405 });
}

export async function DELETE(req) {
    return Response.json({ error: "Los movimientos son solo de consulta" }, { status: 405 });
}
