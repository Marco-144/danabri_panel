import { getPresentacionOpciones } from "@/modules/products.service";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const campo = searchParams.get("campo") || "";

        if (!campo) {
            return Response.json({ error: "El campo es requerido" }, { status: 400 });
        }

        const data = await getPresentacionOpciones(campo);
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}