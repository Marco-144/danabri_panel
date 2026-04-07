import { getVentas } from "@/modules/ventas.service";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";
        return Response.json(await getVentas({ search }));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
