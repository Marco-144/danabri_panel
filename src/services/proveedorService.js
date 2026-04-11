const API_BASE = "/api/proveedores";

export async function getProveedores(search = "") {
    const url = new URL(
        API_BASE,
        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
    );

    if (search) {
        url.searchParams.append("search", search);
    }

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

export async function getProveedorById(id) {
    const res = await fetch(`${API_BASE}?id=${encodeURIComponent(id)}`);
    if (!res.ok) {
        if (res.status === 404) throw new Error("Proveedor no encontrado");
        throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
}

export async function createProveedor(data) {
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
}

export async function updateProveedor(id, data) {
    const res = await fetch(API_BASE, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_proveedor: id, ...data }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return await res.json();
}

export async function deleteProveedor(id) {
    const res = await fetch(API_BASE, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_proveedor: id }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return await res.json();
}
