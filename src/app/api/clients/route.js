import {
    getClientes,
    createCliente,
    getClienteById,
    updateCliente,
    deleteCliente,
} from '@/modules/clients.service';
// Endpoint /api/clients
// GET: lista clientes (con busqueda opcional)
// POST: crea un nuevo cliente

export async function GET(req) {
    try {
        // Lee query param search para filtrar por nombre o RFC.
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const search = searchParams.get('search') || '';

        if (id) {
            const data = await getClienteById(id);
            return Response.json(data);
        }

        const data = await getClientes(search);

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
        // Toma el payload enviado por el formulario.
        const body = await req.json();

        const data = await createCliente(body);

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
        const id = body.id_cliente ?? body.id;

        if (!id) {
            return Response.json(
                { error: 'El id del cliente es requerido' },
                { status: 400 }
            );
        }

        const payload = { ...body };
        delete payload.id_cliente;
        delete payload.id;
        const data = await updateCliente(id, payload);

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
        const id = body.id_cliente ?? body.id;

        if (!id) {
            return Response.json(
                { error: 'El id del cliente es requerido' },
                { status: 400 }
            );
        }

        const data = await deleteCliente(id);

        return Response.json(data);
    } catch (error) {
        return Response.json(
            { error: error.message },
            { status: 400 }
        );
    }
}