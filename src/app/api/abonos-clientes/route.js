import {
    deleteAbonoCliente,
    getAbonosClientes,
    registrarAbonoCliente,
} from "@/modules/abonos-clientes.service";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        return Response.json(await getAbonosClientes({
            id_remision: searchParams.get("id_remision") || "",
            search: searchParams.get("search") || "",
        }));
    } catch (error) {
        return Response.json({ error: error.message || "Error al consultar abonos" }, { status: 400 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        return Response.json(await registrarAbonoCliente(body), { status: 201 });
    } catch (error) {
        return Response.json({ error: error.message || "Error al registrar abono" }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id") || searchParams.get("id_pago") || "";

        if (!id) {
            return Response.json({ error: "id_pago requerido" }, { status: 400 });
        }

        return Response.json(await deleteAbonoCliente(id));
    } catch (error) {
        return Response.json({ error: error.message || "Error al eliminar abono" }, { status: 400 });
    }
}
