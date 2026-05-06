import { facturarRemisionCliente } from "@/modules/remisiones-clientes.service";

export async function POST(req) {
    try {
        const body = await req.json();
        const id = body.id_remision ?? body.id;

        if (!id) {
            return Response.json({ error: "id_remision requerido" }, { status: 400 });
        }

        return Response.json(await facturarRemisionCliente(id));
    } catch (error) {
        return Response.json({ error: error.message || "Error al facturar remision" }, { status: 400 });
    }
}
