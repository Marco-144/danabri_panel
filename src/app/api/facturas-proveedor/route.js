import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import {
    createFacturaFromOrden,
    deleteFactura,
    deleteLineaFactura,
    getFacturaById,
    getFacturasProveedor,
    updateFacturaDetalle,
} from "@/modules/facturas-proveedor.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeFileName(fileName = "archivo") {
    return String(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function saveUploadedFile(file, folderName) {
    const ext = path.extname(file.name || "").toLowerCase();
    const timePart = Date.now();
    const safeName = sanitizeFileName(file.name || `archivo-${timePart}${ext}`);
    const targetDir = path.join(process.cwd(), "public", "uploads", "facturas", folderName);
    await mkdir(targetDir, { recursive: true });

    const filePath = path.join(targetDir, `${timePart}-${safeName}`);
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(arrayBuffer));

    const relativePath = `/uploads/facturas/${folderName}/${timePart}-${safeName}`;
    return {
        archivo_url: relativePath,
        archivo_nombre: safeName,
        archivo_mime: file.type || "application/octet-stream",
    };
}

function fileMimeByExt(filePath) {
    const lower = String(filePath || "").toLowerCase();
    if (lower.endsWith(".pdf")) return "application/pdf";
    if (lower.endsWith(".xml")) return "application/xml";
    return "application/octet-stream";
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const action = searchParams.get("action") || "";
        const id = searchParams.get("id") || searchParams.get("id_factura_proveedor") || "";

        if (action === "download") {
            if (!id) return Response.json({ error: "id requerido" }, { status: 400 });

            const tipo = (searchParams.get("tipo") || "pdf").toLowerCase();
            const factura = await getFacturaById(id);
            const targetPath = tipo === "xml" ? factura.archivo_xml_url : factura.archivo_url;
            const fileName = tipo === "xml" ? factura.archivo_xml_nombre : factura.archivo_nombre;

            if (!targetPath) {
                return Response.json({ error: "Archivo no disponible" }, { status: 404 });
            }

            const absolutePath = path.join(process.cwd(), "public", targetPath.replace(/^\//, ""));
            const content = await readFile(absolutePath);

            return new Response(content, {
                headers: {
                    "Content-Type": fileMimeByExt(targetPath),
                    "Content-Disposition": `attachment; filename="${sanitizeFileName(fileName || path.basename(targetPath))}"`,
                    "Cache-Control": "no-store",
                },
            });
        }

        if (id) {
            return Response.json(await getFacturaById(id));
        }

        const search = searchParams.get("search") || "";
        const estado = searchParams.get("estado") || "";
        const id_proveedor = searchParams.get("id_proveedor") || "";
        const id_almacen = searchParams.get("id_almacen") || "";
        const desde = searchParams.get("desde") || "";
        const hasta = searchParams.get("hasta") || "";

        return Response.json(
            await getFacturasProveedor({ search, estado, id_proveedor, id_almacen, desde, hasta })
        );
    } catch (error) {
        return Response.json({ error: error.message || "Error al obtener facturas" }, { status: 400 });
    }
}

export async function POST(req) {
    try {
        const { searchParams } = new URL(req.url);
        const action = searchParams.get("action") || "";

        if (action === "upload") {
            const formData = await req.formData();
            const file = formData.get("archivo");
            const folder = String(formData.get("folder") || "general");

            if (!file || typeof file === "string") {
                return Response.json({ error: "archivo requerido" }, { status: 400 });
            }

            const mime = String(file.type || "").toLowerCase();
            const allowed = ["application/pdf", "text/xml", "application/xml"];
            if (!allowed.includes(mime)) {
                return Response.json({ error: "Solo se permite PDF/XML" }, { status: 400 });
            }

            const saved = await saveUploadedFile(file, folder);
            return Response.json(saved, { status: 201 });
        }

        const body = await req.json();
        const result = await createFacturaFromOrden(body);
        return Response.json(result, { status: 201 });
    } catch (error) {
        return Response.json({ error: error.message || "Error al crear factura" }, { status: 400 });
    }
}

export async function PUT(req) {
    try {
        const body = await req.json();
        const id_factura = body.id_factura ?? body.id_factura_proveedor ?? body.id;

        if (!id_factura) {
            return Response.json({ error: "id_factura requerido" }, { status: 400 });
        }

        const detalles_updates = Array.isArray(body.detalles_updates) ? body.detalles_updates : [];
        const result = await updateFacturaDetalle(id_factura, detalles_updates);
        return Response.json(result);
    } catch (error) {
        return Response.json({ error: error.message || "Error al actualizar factura" }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id_detalle = searchParams.get("id_detalle") || searchParams.get("id_detalle_facturas_proveedor") || "";
        const id_factura = searchParams.get("id_factura") || searchParams.get("id_factura_proveedor") || searchParams.get("id") || "";

        if (id_detalle) {
            return Response.json(await deleteLineaFactura(id_detalle));
        }

        if (!id_factura) {
            return Response.json({ error: "id_factura o id_detalle requerido" }, { status: 400 });
        }

        return Response.json(await deleteFactura(id_factura));
    } catch (error) {
        return Response.json({ error: error.message || "Error al eliminar" }, { status: 400 });
    }
}
