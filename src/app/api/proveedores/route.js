import { getProveedores } from "@/modules/products.service";

export async function GET(req) {
    try {
        const data = await getProveedores();
        return Response.json(data);
    } catch (error) {
        return Response.json(
            { error: error.message },
            { status: 400 }
        );
    }
}
