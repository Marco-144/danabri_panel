import {
    searchClientesCatalog,
    searchPresentacionesCatalog,
    searchProductosCotizacionClienteCatalog,
} from "@/modules/cotizaciones-clientes.service";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const type = String(searchParams.get("type") || "").toLowerCase();
        const search = searchParams.get("search") || "";
        const limit = searchParams.get("limit") || "15";

        if (type === "clientes") {
            return Response.json(await searchClientesCatalog({ search, limit }));
        }

        if (type === "productos") {
            return Response.json(await searchProductosCotizacionClienteCatalog({ search, limit }));
        }

        if (type === "presentaciones") {
            const unidad = searchParams.get("unidad") || "";
            return Response.json(await searchPresentacionesCatalog({ search, limit, unidad }));
        }

        return Response.json({ error: "type invalido" }, { status: 400 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
