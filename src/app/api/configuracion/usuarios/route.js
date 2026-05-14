import {
    createUsuario,
    deleteUsuario,
    getUsuarioById,
    getUsuariosConRoles,
    updateUsuario,
} from "@/modules/configuracion.service";

async function readBody(req) {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        const body = {};

        for (const [key, value] of formData.entries()) {
            if (typeof value === "string") {
                if (key === "roles") {
                    try {
                        body[key] = JSON.parse(value);
                    } catch {
                        body[key] = value;
                    }
                } else {
                    body[key] = value;
                }
                continue;
            }

            body[key] = value;
        }

        return body;
    }

    return req.json();
}

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
        const body = await readBody(req);
        return Response.json(await createUsuario(body));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function PATCH(req) {
    try {
        const body = await readBody(req);
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
