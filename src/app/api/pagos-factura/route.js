import {
    cancelarFactura,
    deletePago,
    cerrarFacturaInventario,
    getPagosByFactura,
    registrarPagoFactura,
} from "@/modules/pagos-factura.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id_factura = searchParams.get("id_factura") || searchParams.get("id_factura_proveedor") || searchParams.get("id") || "";

        if (!id_factura) {
            return Response.json({ error: "id_factura requerido" }, { status: 400 });
        }

        return Response.json(await getPagosByFactura(id_factura));
    } catch (error) {
        return Response.json({ error: error.message || "Error al obtener pagos" }, { status: 400 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const action = body.action || "";

        if (action === "cancelar-factura") {
            const id_factura = body.id_factura ?? body.id_factura_proveedor ?? body.id;
            if (!id_factura) {
                return Response.json({ error: "id_factura requerido" }, { status: 400 });
            }
            return Response.json(await cancelarFactura(id_factura));
        }

        if (action === "cerrar-factura") {
            const id_factura = body.id_factura ?? body.id_factura_proveedor ?? body.id;
            if (!id_factura) {
                return Response.json({ error: "id_factura requerido" }, { status: 400 });
            }
            return Response.json(await cerrarFacturaInventario(id_factura));
        }

        const id_factura = body.id_factura ?? body.id_factura_proveedor ?? body.id;
        if (!id_factura) {
            return Response.json({ error: "id_factura requerido" }, { status: 400 });
        }

        return Response.json(await registrarPagoFactura(id_factura, body), { status: 201 });
    } catch (error) {
        return Response.json({ error: error.message || "Error al registrar pago" }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id_pago = searchParams.get("id_pago") || searchParams.get("id_pagos_factura_proveedor") || searchParams.get("id") || "";

        if (!id_pago) {
            return Response.json({ error: "id_pago requerido" }, { status: 400 });
        }

        return Response.json(await deletePago(id_pago));
    } catch (error) {
        return Response.json({ error: error.message || "Error al eliminar pago" }, { status: 400 });
    }
}
