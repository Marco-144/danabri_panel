import {
    createRemisionCliente,
    deleteRemisionCliente,
    getRemisionClienteById,
    getRemisionesClientes,
    updateRemisionCliente,
} from "@/modules/remisiones-clientes.service";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id") || searchParams.get("id_remision") || "";

        if (id) {
            return Response.json(await getRemisionClienteById(id));
        }

        return Response.json(await getRemisionesClientes({
            search: searchParams.get("search") || "",
            estado: searchParams.get("estado") || "",
            facturado: searchParams.get("facturado") || "",
            id_cliente: searchParams.get("id_cliente") || "",
            desde: searchParams.get("desde") || "",
            hasta: searchParams.get("hasta") || "",
        }));
    } catch (error) {
        return Response.json({ error: error.message || "Error al consultar remisiones" }, { status: 400 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        return Response.json(await createRemisionCliente(body), { status: 201 });
    } catch (error) {
        return Response.json({ error: error.message || "Error al crear remision" }, { status: 400 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const id = body.id_remision ?? body.id;

        if (!id) {
            return Response.json({ error: "id_remision requerido" }, { status: 400 });
        }

        const payload = { ...body };
        delete payload.id_remision;
        delete payload.id;

        return Response.json(await updateRemisionCliente(id, payload));
    } catch (error) {
        return Response.json({ error: error.message || "Error al actualizar remision" }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        const id = body.id_remision ?? body.id;

        if (!id) {
            return Response.json({ error: "id_remision requerido" }, { status: 400 });
        }

        return Response.json(await deleteRemisionCliente(id));
    } catch (error) {
        return Response.json({ error: error.message || "Error al eliminar remision" }, { status: 400 });
    }
}
