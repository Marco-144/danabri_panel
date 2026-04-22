import { facturarRemisionEmpresa } from "@/modules/remisiones-empresas.service";

export async function POST(req) {
    try {
        const body = await req.json();
        const id = body.id_remision_empresa ?? body.id;

        if (!id) {
            return Response.json({ error: "id_remision_empresa requerido" }, { status: 400 });
        }

        const payload = { ...body };
        delete payload.id_remision_empresa;
        delete payload.id;

        return Response.json(await facturarRemisionEmpresa(id, payload));
    } catch (error) {
        return Response.json({ error: error.message || "Error al facturar remision" }, { status: 400 });
    }
}
