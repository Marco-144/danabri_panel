import { getInventario } from "@/modules/almacenes.service";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id_almacen = searchParams.get("id_almacen") || null;
        const search = searchParams.get("search") || "";
        const soloBajoMinimo = searchParams.get("soloBajoMinimo") === "1";

        const data = await getInventario({ id_almacen, search, soloBajoMinimo });
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function POST(req) {
    return Response.json({ error: "El inventario es solo de consulta" }, { status: 405 });
}

export async function PUT(req) {
    return Response.json({ error: "El inventario es solo de consulta" }, { status: 405 });
}

export async function DELETE(req) {
    return Response.json({ error: "El inventario es solo de consulta" }, { status: 405 });
}
