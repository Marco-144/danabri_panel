import {
    createRemisionEmpresa,
    deleteRemisionEmpresa,
    getRemisionEmpresaById,
    getRemisionesEmpresas,
    updateRemisionEmpresa,
} from "@/modules/remisiones-empresas.service";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id") || searchParams.get("id_remision_empresa") || "";

        if (id) {
            return Response.json(await getRemisionEmpresaById(id));
        }

        return Response.json(await getRemisionesEmpresas({
            search: searchParams.get("search") || "",
            estado: searchParams.get("estado") || "",
            facturada: searchParams.get("facturada") || "",
            id_empresa: searchParams.get("id_empresa") || "",
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
        return Response.json(await createRemisionEmpresa(body), { status: 201 });
    } catch (error) {
        return Response.json({ error: error.message || "Error al crear remision" }, { status: 400 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const id = body.id_remision_empresa ?? body.id;

        if (!id) {
            return Response.json({ error: "id_remision_empresa requerido" }, { status: 400 });
        }

        const payload = { ...body };
        delete payload.id_remision_empresa;
        delete payload.id;

        return Response.json(await updateRemisionEmpresa(id, payload));
    } catch (error) {
        return Response.json({ error: error.message || "Error al actualizar remision" }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        const id = body.id_remision_empresa ?? body.id;

        if (!id) {
            return Response.json({ error: "id_remision_empresa requerido" }, { status: 400 });
        }

        return Response.json(await deleteRemisionEmpresa(id));
    } catch (error) {
        return Response.json({ error: error.message || "Error al eliminar remision" }, { status: 400 });
    }
}
