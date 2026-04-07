import {
    getPresentacionesByProducto,
    createPresentacion,
    updatePresentacion,
    deletePresentacion,
} from "@/modules/products.service";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const idProducto = searchParams.get("id_producto") || searchParams.get("id");

        const data = await getPresentacionesByProducto(idProducto);
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
        const idProducto = body.id_producto ?? body.id;

        if (!idProducto) {
            return Response.json(
                { error: "El id del producto es requerido" },
                { status: 400 }
            );
        }

        const payload = { ...body };
        delete payload.id_producto;
        delete payload.id;

        const data = await createPresentacion(idProducto, payload);
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
        const id = body.id_presentacion ?? body.id;

        if (!id) {
            return Response.json(
                { error: "El id de la presentacion es requerido" },
                { status: 400 }
            );
        }

        const payload = { ...body };
        delete payload.id_presentacion;
        delete payload.id;
        const data = await updatePresentacion(id, payload);
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
        const id = body.id_presentacion ?? body.id;

        if (!id) {
            return Response.json(
                { error: "El id de la presentacion es requerido" },
                { status: 400 }
            );
        }

        const data = await deletePresentacion(id);
        return Response.json(data);
    } catch (error) {
        return Response.json(
            { error: error.message },
            { status: 400 }
        );
    }
}
