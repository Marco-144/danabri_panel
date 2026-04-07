import { getAlmacenes, createAlmacen, updateAlmacen, deleteAlmacen } from "@/modules/almacenes.service";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";
        const data = await getAlmacenes(search);
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const data = await createAlmacen(body);
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const { id, ...data } = body;
        if (!id) throw new Error("id es requerido");
        const result = await updateAlmacen(id, data);
        return Response.json(result);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        const { id } = body;
        if (!id) throw new Error("id es requerido");
        const result = await deleteAlmacen(id);
        return Response.json(result);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
