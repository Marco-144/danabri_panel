import {
    getPresentacionCatalogoItems,
    createPresentacionCatalogoItem,
    updatePresentacionCatalogoItem,
    deletePresentacionCatalogoItem,
} from "@/modules/products.service";

function getCampoFromRequest(req, bodyCampo) {
    const { searchParams } = new URL(req.url);
    return (bodyCampo || searchParams.get("campo") || "").toString().trim().toLowerCase();
}

export async function GET(req) {
    try {
        const campo = getCampoFromRequest(req);
        if (!campo) {
            return Response.json({ error: "El campo es requerido" }, { status: 400 });
        }

        const data = await getPresentacionCatalogoItems(campo);
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const campo = getCampoFromRequest(req, body.campo);
        if (!campo) {
            return Response.json({ error: "El campo es requerido" }, { status: 400 });
        }

        const payload = { ...body };
        delete payload.campo;

        const data = await createPresentacionCatalogoItem(campo, payload);
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const campo = getCampoFromRequest(req, body.campo);
        const id = body.id;

        if (!campo) {
            return Response.json({ error: "El campo es requerido" }, { status: 400 });
        }

        if (!id) {
            return Response.json({ error: "El id es requerido" }, { status: 400 });
        }

        const payload = { ...body };
        delete payload.campo;
        delete payload.id;

        const data = await updatePresentacionCatalogoItem(campo, id, payload);
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        const campo = getCampoFromRequest(req, body.campo);
        const id = body.id;

        if (!campo) {
            return Response.json({ error: "El campo es requerido" }, { status: 400 });
        }

        if (!id) {
            return Response.json({ error: "El id es requerido" }, { status: 400 });
        }

        const data = await deletePresentacionCatalogoItem(campo, id);
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
