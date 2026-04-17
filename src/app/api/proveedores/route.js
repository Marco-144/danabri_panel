import {
    getProveedores,
    getProveedorById,
    createProveedor,
    updateProveedor,
    deleteProveedor,
} from "@/modules/suppliers.service";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const search = searchParams.get("search") || "";
        const activosParam = (searchParams.get("activos") || "").toLowerCase();
        const soloActivos = activosParam === "1" || activosParam === "true";

        if (id) {
            const data = await getProveedorById(id);
            return Response.json(data);
        }

        const data = await getProveedores({ search, soloActivos });
        return Response.json(data);
    } catch (error) {
        return Response.json(
            { error: error.message },
            { status: 400 }
        );
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const data = await createProveedor(body);
        return Response.json(data);
    } catch (error) {
        return Response.json(
            { error: error.message },
            { status: 400 }
        );
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const id = body.id_proveedor ?? body.id;

        if (!id) {
            return Response.json(
                { error: "El id del proveedor es requerido" },
                { status: 400 }
            );
        }

        const payload = { ...body };
        delete payload.id_proveedor;
        delete payload.id;

        const data = await updateProveedor(id, payload);
        return Response.json(data);
    } catch (error) {
        return Response.json(
            { error: error.message },
            { status: 400 }
        );
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        const id = body.id_proveedor ?? body.id;

        if (!id) {
            return Response.json(
                { error: "El id del proveedor es requerido" },
                { status: 400 }
            );
        }

        const data = await deleteProveedor(id);
        return Response.json(data);
    } catch (error) {
        return Response.json(
            { error: error.message },
            { status: 400 }
        );
    }
}
