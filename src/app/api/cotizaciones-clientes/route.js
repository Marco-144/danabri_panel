import {
    createCotizacionCliente,
    deleteCotizacionCliente,
    getCotizacionClienteById,
    getCotizacionesClientes,
    updateCotizacionCliente,
} from "@/modules/cotizaciones-clientes.service";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (id) {
            return Response.json(await getCotizacionClienteById(id));
        }

        return Response.json(await getCotizacionesClientes({
            search: searchParams.get("search") || "",
            id_cliente: searchParams.get("id_cliente") || "",
            estado: searchParams.get("estado") || "",
            fecha_desde: searchParams.get("fecha_desde") || "",
            fecha_hasta: searchParams.get("fecha_hasta") || "",
        }));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        return Response.json(await createCotizacionCliente(body), { status: 201 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const id = body.id_cotizacion ?? body.id;

        if (!id) {
            return Response.json({ error: "El id de la cotizacion es requerido" }, { status: 400 });
        }

        const payload = { ...body };
        delete payload.id_cotizacion;
        delete payload.id;

        return Response.json(await updateCotizacionCliente(id, payload));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        const id = body.id_cotizacion ?? body.id;

        if (!id) {
            return Response.json({ error: "El id de la cotizacion es requerido" }, { status: 400 });
        }

        return Response.json(await deleteCotizacionCliente(id));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
