import { getAlertasStock, createAlertaStock, updateAlertaStock, deleteAlertaStock } from "@/modules/almacenes.service";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id_almacen = searchParams.get("id_almacen") || null;
        const search = searchParams.get("search") || "";

        const data = await getAlertasStock({ id_almacen, search });
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        return Response.json(await createAlertaStock(body));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const { id, ...payload } = body;
        return Response.json(await updateAlertaStock(id, payload));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        return Response.json(await deleteAlertaStock(body.id));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
