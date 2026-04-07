import { traspasoInventario } from "@/modules/almacenes.service";

export async function POST(req) {
    try {
        const body = await req.json();
        const data = await traspasoInventario(body);
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
