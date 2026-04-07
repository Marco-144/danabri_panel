import {
    getLineas,
    createLinea,
    updateLinea,
    deleteLinea,
} from "@/modules/products.service";

export async function GET() {
    try {
        const data = await getLineas();
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const data = await createLinea(body);
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const id = body.id_linea ?? body.id;

        if (!id) {
            return Response.json(
                { error: "El id de linea es requerido" },
                { status: 400 }
            );
        }

        const payload = { ...body };
        delete payload.id_linea;
        delete payload.id;

        const data = await updateLinea(id, payload);
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        const id = body.id_linea ?? body.id;

        if (!id) {
            return Response.json(
                { error: "El id de linea es requerido" },
                { status: 400 }
            );
        }

        const data = await deleteLinea(id);
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
