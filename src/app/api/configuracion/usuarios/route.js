import {
    createUsuario,
    deleteUsuario,
    getUsuarioById,
    getUsuariosConRoles,
    updateUsuario,
} from "@/modules/configuracion.service";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const search = searchParams.get("search") || "";

        if (id) {
            return Response.json(await getUsuarioById(id));
        }

        return Response.json(await getUsuariosConRoles({ search }));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        return Response.json(await createUsuario(body));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function PATCH(req) {
    try {
        const body = await req.json();
        const id = body.id_usuario ?? body.id;

        if (!id) {
            return Response.json({ error: "El id del usuario es requerido" }, { status: 400 });
        }

        return Response.json(await updateUsuario(id, body));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        const id = body.id_usuario ?? body.id;

        if (!id) {
            return Response.json({ error: "El id del usuario es requerido" }, { status: 400 });
        }

        return Response.json(await deleteUsuario(id));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
