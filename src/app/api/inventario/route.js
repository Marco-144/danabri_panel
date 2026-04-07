import { getInventario, createInventario, updateInventario, deleteInventario } from "@/modules/almacenes.service";

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
    try {
        const body = await req.json();
        return Response.json(await createInventario(body));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const { id, ...payload } = body;
        return Response.json(await updateInventario(id, payload));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        return Response.json(await deleteInventario(body.id));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
