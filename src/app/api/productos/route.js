import {
    getProductos,
    createProducto,
    getProductoById,
    updateProducto,
    deleteProducto,
} from "@/modules/products.service";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const uploadsDir = path.join(process.cwd(), "public", "productos_images");

const saveImageFile = async (file) => {
    if (!file || typeof file === "string") return null;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
        throw new Error("Formato de imagen no permitido");
    }

    await mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(file.name || "").toLowerCase() || ".jpg";
    const fileName = `${Date.now()}-${randomUUID()}${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(filePath, buffer);

    return `/productos_images/${fileName}`;
};

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const search = searchParams.get("search") || "";

        if (id) {
            const data = await getProductoById(id);
            return Response.json(data);
        }

        const data = await getProductos({ search });
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
        const contentType = req.headers.get("content-type") || "";
        let body;

        if (contentType.includes("multipart/form-data")) {
            const form = await req.formData();
            const imageFile = form.get("imagen");
            const imageUrl = await saveImageFile(imageFile);

            body = {
                nombre: form.get("nombre"),
                descripcion: form.get("descripcion"),
                id_categoria: form.get("id_categoria"),
                activo: form.get("activo") === "true" || form.get("activo") === "1",
                imagen_url: imageUrl,
            };
        } else {
            body = await req.json();
        }

        const data = await createProducto(body);
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
        const contentType = req.headers.get("content-type") || "";
        let id;
        let payload;

        if (contentType.includes("multipart/form-data")) {
            const form = await req.formData();
            id = form.get("id_producto") || form.get("id");

            if (!id) {
                return Response.json(
                    { error: "El id del producto es requerido" },
                    { status: 400 }
                );
            }

            const imageFile = form.get("imagen");
            const imageUrl = await saveImageFile(imageFile);

            payload = {
                nombre: form.get("nombre"),
                descripcion: form.get("descripcion"),
                id_categoria: form.get("id_categoria"),
                activo: form.get("activo") === "true" || form.get("activo") === "1",
            };

            if (imageUrl) {
                payload.imagen_url = imageUrl;
            }
        } else {
            const body = await req.json();
            id = body.id_producto ?? body.id;

            if (!id) {
                return Response.json(
                    { error: "El id del producto es requerido" },
                    { status: 400 }
                );
            }

            payload = { ...body };
            delete payload.id_producto;
            delete payload.id;
        }

        const data = await updateProducto(id, payload);
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
        const id = body.id_producto ?? body.id;

        if (!id) {
            return Response.json(
                { error: "El id del producto es requerido" },
                { status: 400 }
            );
        }

        const data = await deleteProducto(id);
        return Response.json(data);
    } catch (error) {
        return Response.json(
            { error: error.message },
            { status: 400 }
        );
    }
}
