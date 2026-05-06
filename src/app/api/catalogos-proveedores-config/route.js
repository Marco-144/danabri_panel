import {
    createCatalogoProveedor,
    deleteCatalogoProveedor,
    getCatalogosProveedores,
} from "@/modules/configuracion.service";

export async function GET() {
    try {
        return Response.json(await getCatalogosProveedores());
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { tipo, nombre } = body;

        if (tipo !== "giro") {
            return Response.json({ error: "Solo el catalogo de giro es configurable" }, { status: 400 });
        }

        return Response.json(await createCatalogoProveedor({ tipo, nombre }));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        const { tipo, id } = body;

        if (tipo !== "giro") {
            return Response.json({ error: "Solo el catalogo de giro es configurable" }, { status: 400 });
        }

        return Response.json(await deleteCatalogoProveedor({ tipo, id }));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
