const API_BASE = "/api/clients";
// Servicio cliente (frontend) para consumir endpoints REST de clientes.

export async function getClientes(search = "") {
    try {
        // Construye URL con query opcional de busqueda.
        const url = new URL(
            API_BASE,
            typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
        );
        if (search) url.searchParams.append("search", search);

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        return await res.json();
    } catch (error) {
        console.error("Error fetching clientes:", error);
        throw error;
    }
}

export async function getClienteById(id) {
    try {
        // Consulta un cliente puntual por ID.
        const res = await fetch(`${API_BASE}?id=${encodeURIComponent(id)}`);
        if (!res.ok) {
            if (res.status === 404) throw new Error("Cliente no encontrado");
            throw new Error(`HTTP ${res.status}`);
        }
        return await res.json();
    } catch (error) {
        console.error("Error fetching cliente:", error);
        throw error;
    }
}

export async function createCliente(data) {
    try {
        // Crea cliente nuevo enviando JSON.
        const res = await fetch(API_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || `HTTP ${res.status}`);
        }

        return await res.json();
    } catch (error) {
        console.error("Error creating cliente:", error);
        throw error;
    }
}

export async function updateCliente(id, data) {
    try {
        // Actualiza cliente existente por ID.
        const res = await fetch(API_BASE, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_cliente: id, ...data }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || `HTTP ${res.status}`);
        }

        return await res.json();
    } catch (error) {
        console.error("Error updating cliente:", error);
        throw error;
    }
}

export async function deleteCliente(id) {
    try {
        // Elimina cliente por ID.
        const res = await fetch(API_BASE, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_cliente: id }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || `HTTP ${res.status}`);
        }

        return await res.json();
    } catch (error) {
        console.error("Error deleting cliente:", error);
        throw error;
    }
}
