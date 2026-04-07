import {
    getMarcas,
    createMarca,
    updateMarca,
    deleteMarca,
} from "@/modules/products.service";

export async function GET() {
    try {
        const data = await getMarcas();
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const data = await createMarca(body);
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const id = body.id_marca ?? body.id;

        if (!id) {
            return Response.json(
                { error: "El id de marca es requerido" },
                { status: 400 }
            );
        }

        const payload = { ...body };
        delete payload.id_marca;
        delete payload.id;

        const data = await updateMarca(id, payload);
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        const id = body.id_marca ?? body.id;

        if (!id) {
            return Response.json(
                { error: "El id de marca es requerido" },
                { status: 400 }
            );
        }

        const data = await deleteMarca(id);
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
