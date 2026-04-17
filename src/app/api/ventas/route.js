import { getVentas, getVentasCatalog, getVentaById, createVenta, updateVenta, deleteVenta } from "@/modules/ventas.service";
import { verifyToken } from "@/modules/auth.utils";

function getAuthUserId(req) {
    const authHeader = req.headers.get("authorization") || "";
    const tokenFromHeader = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const token = tokenFromHeader || req.cookies.get("auth_token")?.value || "";
    const payload = verifyToken(token);

    if (!payload?.id) {
        throw new Error("Token requerido");
    }

    return payload.id;
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const catalog = searchParams.get("catalog") === "1";
        const search = searchParams.get("search") || "";
        const id_almacen = searchParams.get("id_almacen") || null;

        if (catalog) {
            return Response.json(await getVentasCatalog({ id_almacen, search }));
        }

        if (id) {
            return Response.json(await getVentaById(id));
        }

        return Response.json(await getVentas({ search }));
    } catch (error) {
        const status = error.message === "Token requerido" ? 401 : 400;
        return Response.json({ error: error.message }, { status });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const idUsuario = getAuthUserId(req);
        return Response.json(await createVenta(body, { id_usuario: idUsuario }));
    } catch (error) {
        const status = error.message === "Token requerido" ? 401 : 400;
        return Response.json({ error: error.message }, { status });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const { id, ...payload } = body;
        return Response.json(await updateVenta(id, payload));
    } catch (error) {
        const status = error.message === "Token requerido" ? 401 : 400;
        return Response.json({ error: error.message }, { status });
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        return Response.json(await deleteVenta(body.id));
    } catch (error) {
        const status = error.message === "Token requerido" ? 401 : 400;
        return Response.json({ error: error.message }, { status });
    }
}

