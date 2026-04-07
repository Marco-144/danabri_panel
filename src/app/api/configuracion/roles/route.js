import { getRoles } from "@/modules/configuracion.service";

export async function GET() {
    try {
        return Response.json(await getRoles());
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
