import { ajusteInventario } from "@/modules/almacenes.service";

export async function POST(req) {
    try {
        const body = await req.json();
        const data = await ajusteInventario(body);
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
