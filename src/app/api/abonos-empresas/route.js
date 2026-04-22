import {
    deleteAbonoEmpresa,
    getAbonosEmpresas,
    registrarAbonoEmpresa,
} from "@/modules/abonos-empresas.service";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        return Response.json(await getAbonosEmpresas({
            id_remision_empresa: searchParams.get("id_remision_empresa") || "",
            search: searchParams.get("search") || "",
        }));
    } catch (error) {
        return Response.json({ error: error.message || "Error al consultar abonos" }, { status: 400 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        return Response.json(await registrarAbonoEmpresa(body), { status: 201 });
    } catch (error) {
        return Response.json({ error: error.message || "Error al registrar abono" }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id") || searchParams.get("id_abono_remision_empresa") || "";

        if (!id) {
            return Response.json({ error: "id_abono_remision_empresa requerido" }, { status: 400 });
        }

        return Response.json(await deleteAbonoEmpresa(id));
    } catch (error) {
        return Response.json({ error: error.message || "Error al eliminar abono" }, { status: 400 });
    }
}
