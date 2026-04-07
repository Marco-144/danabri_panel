// Wrapper simple para API de clientes.
// Nota: existe tambien clientsService.js con manejo de errores mas completo.
export const getClientes = async (search = "") => {
    const res = await fetch(`/api/clients?search=${search}`);
    return res.json();
};

export const getCliente = async (id) => {
    // Obtiene detalle por id.
    const res = await fetch(`/api/clients?id=${encodeURIComponent(id)}`);
    return res.json();
};

export const createCliente = async (data) => {
    // Crea un cliente.
    const res = await fetch(`/api/clients`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    return res.json();
};

export const updateCliente = async (id, data) => {
    // Actualiza un cliente existente.
    const res = await fetch(`/api/clients`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id_cliente: id, ...data })
    });

    return res.json();
};

export const deleteCliente = async (id) => {
    // Elimina un cliente.
    const res = await fetch(`/api/clients`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id_cliente: id })
    });

    return res.json();
};