import {
    createGiro,
    createTipoCliente,
    deleteGiro,
    deleteTipoCliente,
    getCatalogosClientes,
} from "@/modules/configuracion.service";

export async function GET() {
    try {
        return Response.json(await getCatalogosClientes());
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { tipo } = body;

        if (tipo === "giro") {
            return Response.json(await createGiro(body.nombre));
        }

        if (tipo === "tipo_cliente") {
            return Response.json(
                await createTipoCliente({
                    nombre: body.nombre,
                    nivel_precio: body.nivel_precio,
                })
            );
        }

        return Response.json(
            { error: "Tipo de catalogo inválido" },
            { status: 400 }
        );
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req) {
    try {
        const body = await req.json();
        const { tipo, id } = body;

        if (!id) {
            return Response.json({ error: "El id es requerido" }, { status: 400 });
        }

        if (tipo === "giro") {
            return Response.json(await deleteGiro(id));
        }

        if (tipo === "tipo_cliente") {
            return Response.json(await deleteTipoCliente(id));
        }

        return Response.json(
            { error: "Tipo de catalogo inválido" },
            { status: 400 }
        );
    } catch (error) {
        return Response.json({ error: error.message }, { status: 400 });
    }
}
