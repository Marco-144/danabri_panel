import {
    searchEmpresasCatalog,
    searchProductosCatalog,
} from "@/modules/cotizaciones-empresas.service";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const type = String(searchParams.get("type") || "").toLowerCase();
        const search = searchParams.get("search") || "";
        const limit = searchParams.get("limit") || "15";

        if (type === "empresas") {
            return Response.json(await searchEmpresasCatalog({ search, limit }));
        }

        if (type === "productos") {
            return Response.json(await searchProductosCatalog({ search, limit }));
        }

        return Response.json({ error: "type invalido" }, { status: 400 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
