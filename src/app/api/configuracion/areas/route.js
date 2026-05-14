import {
    createArea,
    deleteArea,
    getAreas,
    updateArea,
} from "@/modules/configuracion.service";

export async function GET() {
    try {
        return Response.json(await getAreas());
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        return Response.json(await createArea(body));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function PATCH(req) {
    try {
        const body = await req.json();
        return Response.json(await updateArea(body.id_area, body));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        return Response.json(await deleteArea(body.id_area));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
