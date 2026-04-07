import { loginUser } from "@/modules/auth.service";

export async function POST(req) {
    try {
        const { nombre, password } = await req.json();

        const data = await loginUser(nombre, password);

        return Response.json(data);
    } catch (error) {
        return Response.json(
            { error: error.message },
            { status: 400 }
        );
    }
}