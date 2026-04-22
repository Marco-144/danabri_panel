import {
    createCotizacionEmpresa,
    deleteCotizacionEmpresa,
    getCotizacionEmpresaById,
    getCotizacionesEmpresas,
    updateCotizacionEmpresa,
} from "@/modules/cotizaciones-empresas.service";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (id) {
            return Response.json(await getCotizacionEmpresaById(id));
        }

        return Response.json(
            await getCotizacionesEmpresas({
                search: searchParams.get("search") || "",
                id_empresa: searchParams.get("id_empresa") || "",
                fecha_desde: searchParams.get("fecha_desde") || "",
                fecha_hasta: searchParams.get("fecha_hasta") || "",
            })
        );
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        return Response.json(await createCotizacionEmpresa(body));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const id = body.id_cotizacion_empresa ?? body.id;

        if (!id) {
            return Response.json({ error: "El id de la cotizacion es requerido" }, { status: 400 });
        }

        const payload = { ...body };
        delete payload.id_cotizacion_empresa;
        delete payload.id;

        return Response.json(await updateCotizacionEmpresa(id, payload));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        const id = body.id_cotizacion_empresa ?? body.id;

        if (!id) {
            return Response.json({ error: "El id de la cotizacion es requerido" }, { status: 400 });
        }

        return Response.json(await deleteCotizacionEmpresa(id));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
