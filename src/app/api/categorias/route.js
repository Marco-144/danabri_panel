import {
    getCategorias,
    createCategoria,
    getCategoryById,
    updateCategoria,
    deleteCategoria,
} from "@/modules/products.service";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (id) {
            const data = await getCategoryById(id);
            return Response.json(data);
        }

        const data = await getCategorias();
        return Response.json(data);
    } catch (error) {
        return Response.json(
            { error: error.message },
            { status: 400 }
        );
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const data = await createCategoria(body);
        return Response.json(data);
    } catch (error) {
        return Response.json(
            { error: error.message },
            { status: 400 }
        );
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const id = body.id_categoria ?? body.id;

        if (!id) {
            return Response.json(
                { error: "El id de categoria es requerido" },
                { status: 400 }
            );
        }

        const payload = { ...body };
        delete payload.id_categoria;
        delete payload.id;
        const data = await updateCategoria(id, payload);
        return Response.json(data);
    } catch (error) {
        return Response.json(
            { error: error.message },
            { status: 400 }
        );
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        const id = body.id_categoria ?? body.id;

        if (!id) {
            return Response.json(
                { error: "El id de categoria es requerido" },
                { status: 400 }
            );
        }

        const data = await deleteCategoria(id);
        return Response.json(data);
    } catch (error) {
        return Response.json(
            { error: error.message },
            { status: 400 }
        );
    }
}
