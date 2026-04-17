import { renderToBuffer } from "@react-pdf/renderer";
import OrdenCompraPdf from "@/components/pdf/OrdenCompraPdf";
import {
    getOrdenesCompra,
    getOrdenCompraById,
    getKpisOrdenesCompra,
    createOrdenCompra,
    updateOrdenCompra,
    deleteOrdenCompra,
} from "@/modules/ordenesCompra.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        if (searchParams.get("kpis") === "1") {
            return Response.json(await getKpisOrdenesCompra());
        }

        const id = searchParams.get("id");
        const wantsPdf = searchParams.get("pdf") === "1";

        if (wantsPdf) {
            if (!id) {
                return Response.json({ error: "id requerido" }, { status: 400 });
            }

            const orden = await getOrdenCompraById(id);
            const buffer = await renderToBuffer(<OrdenCompraPdf orden={orden} />);
            const filename = `orden-${orden.folio || id}.pdf`;

            return new Response(buffer, {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `inline; filename="${filename}"`,
                    "Cache-Control": "no-store",
                },
            });
        }

        if (id) {
            return Response.json(await getOrdenCompraById(id));
        }

        const search = searchParams.get("search") || "";
        const status = searchParams.get("status") || "";
        return Response.json(await getOrdenesCompra({ search, status }));
    } catch (error) {
        const status = error.message === "Orden de compra no encontrada" ? 404 : 400;
        return Response.json({ error: error.message }, { status });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        return Response.json(await createOrdenCompra(body), { status: 201 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function PATCH(req) {
    try {
        const body = await req.json();
        const { id, ...rest } = body;
        if (!id) return Response.json({ error: "id requerido" }, { status: 400 });
        return Response.json(await updateOrdenCompra(id, rest));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return Response.json({ error: "id requerido" }, { status: 400 });
        return Response.json(await deleteOrdenCompra(id));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
