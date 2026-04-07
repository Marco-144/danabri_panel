import { getMovimientos, createMovimiento, updateMovimiento, deleteMovimiento } from "@/modules/almacenes.service";

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
    try {
        const body = await req.json();
        return Response.json(await createMovimiento(body));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const { id, ...payload } = body;
        return Response.json(await updateMovimiento(id, payload));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        return Response.json(await deleteMovimiento(body.id));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
