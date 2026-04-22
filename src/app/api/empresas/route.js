import {
    createEmpresa,
    deleteEmpresa,
    getEmpresaById,
    getEmpresas,
    updateEmpresa,
} from "@/modules/empresas.service";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (id) {
            return Response.json(await getEmpresaById(id));
        }

        const search = searchParams.get("search") || "";
        const cp = searchParams.get("cp") || "";
        const hasRfc = searchParams.get("has_rfc") || "all";

        return Response.json(
            await getEmpresas({
                search,
                cp,
                hasRfc,
            })
        );
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        return Response.json(await createEmpresa(body));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const id = body.id_empresa ?? body.id;

        if (!id) {
            return Response.json({ error: "El id de la empresa es requerido" }, { status: 400 });
        }

        const payload = { ...body };
        delete payload.id_empresa;
        delete payload.id;

        return Response.json(await updateEmpresa(id, payload));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        const id = body.id_empresa ?? body.id;

        if (!id) {
            return Response.json({ error: "El id de la empresa es requerido" }, { status: 400 });
        }

        return Response.json(await deleteEmpresa(id));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
