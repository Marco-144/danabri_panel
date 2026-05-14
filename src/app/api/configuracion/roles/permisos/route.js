import {
    deleteRolAreaPermisos,
    upsertRolAreaPermisos,
} from "@/modules/configuracion.service";

export async function POST(req) {
    try {
        const body = await req.json();
        return Response.json(await upsertRolAreaPermisos(body));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        return Response.json(await deleteRolAreaPermisos(body));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
