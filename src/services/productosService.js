const API_PRODUCTOS = "/api/productos";
const API_CATEGORIAS = "/api/categorias";
const API_PRESENTACIONES = "/api/presentaciones";
const API_PRESENTACIONES_OPCIONES = "/api/presentaciones/opciones";
const API_PRESENTACIONES_CATALOGOS = "/api/presentaciones/catalogos";
const API_MARCAS = "/api/marcas";
const API_LINEAS = "/api/lineas";
const API_FAMILIAS = "/api/familias";

const toProductoFormData = (data) => {
    const formData = new FormData();
    formData.append("nombre", data.nombre ?? "");
    formData.append("descripcion", data.descripcion ?? "");
    formData.append("id_categoria", String(data.id_categoria ?? ""));
    formData.append("activo", String(Boolean(data.activo)));

    if (data.imagen instanceof File) {
        formData.append("imagen", data.imagen);
    }

    return formData;
};

export async function getProductos(search = "") {
    const url = search
        ? `${API_PRODUCTOS}?search=${encodeURIComponent(search)}`
        : API_PRODUCTOS;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

export async function getProductoById(id) {
    const res = await fetch(`${API_PRODUCTOS}?id=${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

export async function createProducto(data) {
    const body = toProductoFormData(data);

    const res = await fetch(API_PRODUCTOS, {
        method: "POST",
        body,
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return await res.json();
}

export async function updateProducto(id, data) {
    const body = toProductoFormData(data);
    body.append("id_producto", String(id));

    const res = await fetch(API_PRODUCTOS, {
        method: "PUT",
        body,
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return await res.json();
}

export async function deleteProducto(id) {
    const res = await fetch(API_PRODUCTOS, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_producto: id }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return await res.json();
}

export async function getCategorias() {
    const res = await fetch(API_CATEGORIAS);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

export async function createCategoria(data) {
    const res = await fetch(API_CATEGORIAS, {
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

export async function updateCategoria(id, data) {
    const res = await fetch(API_CATEGORIAS, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_categoria: id, ...data }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return await res.json();
}

export async function deleteCategoria(id) {
    const res = await fetch(API_CATEGORIAS, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_categoria: id }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return await res.json();
}

export async function getPresentacionesByProducto(idProducto) {
    const res = await fetch(`${API_PRESENTACIONES}?id_producto=${encodeURIComponent(idProducto)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

export async function createPresentacion(idProducto, data) {
    const res = await fetch(API_PRESENTACIONES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_producto: idProducto, ...data }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return await res.json();
}

export async function updatePresentacion(idPresentacion, data) {
    const res = await fetch(API_PRESENTACIONES, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_presentacion: idPresentacion, ...data }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return await res.json();
}

export async function deletePresentacion(idPresentacion) {
    const res = await fetch(API_PRESENTACIONES, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_presentacion: idPresentacion }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return await res.json();
}

export async function getPresentacionOpciones(campo) {
    const res = await fetch(`${API_PRESENTACIONES_OPCIONES}?campo=${encodeURIComponent(campo)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

export async function getPresentacionCatalogoItems(campo) {
    const res = await fetch(`${API_PRESENTACIONES_CATALOGOS}?campo=${encodeURIComponent(campo)}`);
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
    }
    return await res.json();
}

export async function createPresentacionCatalogoItem(campo, data) {
    const res = await fetch(API_PRESENTACIONES_CATALOGOS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campo, ...data }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return await res.json();
}

export async function updatePresentacionCatalogoItem(campo, id, data) {
    const res = await fetch(API_PRESENTACIONES_CATALOGOS, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campo, id, ...data }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return await res.json();
}

export async function deletePresentacionCatalogoItem(campo, id) {
    const res = await fetch(API_PRESENTACIONES_CATALOGOS, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campo, id }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    return await res.json();
}

export async function getMarcas() {
    const res = await fetch(API_MARCAS);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

export async function createMarca(data) {
    const res = await fetch(API_MARCAS, {
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

export async function updateMarca(id, data) {
    const res = await fetch(API_MARCAS, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_marca: id, ...data }),
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
    }
    return await res.json();
}

export async function deleteMarca(id) {
    const res = await fetch(API_MARCAS, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_marca: id }),
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
    }
    return await res.json();
}

export async function getLineas() {
    const res = await fetch(API_LINEAS);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

export async function createLinea(data) {
    const res = await fetch(API_LINEAS, {
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

export async function updateLinea(id, data) {
    const res = await fetch(API_LINEAS, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_linea: id, ...data }),
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
    }
    return await res.json();
}

export async function deleteLinea(id) {
    const res = await fetch(API_LINEAS, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_linea: id }),
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
    }
    return await res.json();
}

export async function getFamilias() {
    const res = await fetch(API_FAMILIAS);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}

export async function createFamilia(data) {
    const res = await fetch(API_FAMILIAS, {
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

export async function updateFamilia(id, data) {
    const res = await fetch(API_FAMILIAS, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_familia: id, ...data }),
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
    }
    return await res.json();
}

export async function deleteFamilia(id) {
    const res = await fetch(API_FAMILIAS, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_familia: id }),
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
    }
    return await res.json();
}

export async function getProveedores() {
    const res = await fetch("/api/proveedores");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
}
