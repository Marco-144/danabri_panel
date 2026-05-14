import {
    createCotizacionCliente,
    deleteCotizacionCliente,
    getCotizacionClienteById,
    getCotizacionesClientes,
    updateCotizacionCliente,
} from "@/modules/cotizaciones-clientes.service";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import CotizacionClientePdf from "@/components/pdf/CotizacionClientePdf";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const wantsPdf = searchParams.get("pdf") === "1";
        const ivaParam = searchParams.get("iva");
        const includeIva = ivaParam === null ? true : ivaParam !== "0";

        if (wantsPdf) {
            if (!id) return Response.json({ error: "id requerido" }, { status: 400 });
            const cot = await getCotizacionClienteById(id);

            // try to find the logo in public using the actual project file names
            const logoCandidates = [
                path.join(process.cwd(), "public", "DanabriLogoRecortado.png"),
            ];
            const logoFile = logoCandidates.find((candidate) => fs.existsSync(candidate)) || null;
            const logoPath = logoFile ? `data:image/${path.extname(logoFile).slice(1)};base64,${fs.readFileSync(logoFile).toString("base64")}` : null;

            const papeleria = {
                nombre: process.env.PAPELERIA_NOMBRE || "",
                direccion: process.env.PAPELERIA_DIRECCION || "",
                telefono: process.env.PAPELERIA_TELEFONO || "",
                rfc: process.env.PAPELERIA_RFC || "",
                nota: process.env.PAPELERIA_NOTA || "",
            };

            const buffer = await renderToBuffer(
                createElement(CotizacionClientePdf, { cotizacion: cot, includeIva, papeleria, logoPath })
            );

            const filename = `cotizacion-${cot.folio || id}.pdf`;
            return new Response(buffer, {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `inline; filename="${filename}"`,
                    "Cache-Control": "no-store",
                },
            });
        }

        if (id) {
            return Response.json(await getCotizacionClienteById(id));
        }

        return Response.json(await getCotizacionesClientes({
            search: searchParams.get("search") || "",
            id_cliente: searchParams.get("id_cliente") || "",
            estado: searchParams.get("estado") || "",
            fecha_desde: searchParams.get("fecha_desde") || "",
            fecha_hasta: searchParams.get("fecha_hasta") || "",
        }));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        return Response.json(await createCotizacionCliente(body), { status: 201 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const id = body.id_cotizacion ?? body.id;

        if (!id) {
            return Response.json({ error: "El id de la cotizacion es requerido" }, { status: 400 });
        }

        const payload = { ...body };
        delete payload.id_cotizacion;
        delete payload.id;

        return Response.json(await updateCotizacionCliente(id, payload));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        const id = body.id_cotizacion ?? body.id;

        if (!id) {
            return Response.json({ error: "El id de la cotizacion es requerido" }, { status: 400 });
        }

        return Response.json(await deleteCotizacionCliente(id));
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
