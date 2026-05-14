import db from "@/lib/db";

function toPositiveId(value, fieldName = "id") {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new Error(`${fieldName} invalido`);
    return id;
}

function toNullableString(value) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text ? text : null;
}

function toNullableInt(value) {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

const VALID_STATUSES = ["pendiente", "recibida", "cancelada", "parcial"];

async function buildNextFolio(connection) {
    const [[{ nextFolio }]] = await connection.execute(
        "SELECT COALESCE(MAX(id_orden_compra), 0) + 1 AS nextFolio FROM ordenes_compra"
    );
    return `OC-${String(nextFolio).padStart(5, "0")}`;
}

function normalizeOrdenDetalle(item) {
    const cantidad = Number(item?.cantidad);
    const costoUnitario = Number(item?.costo_unitario);
    const idPresentacion = toNullableInt(item?.id_presentacion);
    const origenLinea = String(item?.origen_linea || (idPresentacion ? "catalogo" : "manual")).toLowerCase();
    const descripcionManual = toNullableString(item?.descripcion_manual || item?.nombre || item?.producto_nombre);
    const codigoManual = toNullableString(item?.codigo_manual || item?.codigo_barras);

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
        throw new Error("Cantidad invalida en partida");
    }

    if (Number.isNaN(costoUnitario) || costoUnitario < 0) {
        throw new Error("Costo invalido en partida");
    }

    if (idPresentacion) {
        return {
            id_presentacion: idPresentacion,
            origen_linea: "catalogo",
            descripcion_manual: null,
            codigo_manual: codigoManual,
            cantidad,
            costo_unitario: costoUnitario,
        };
    }

    if (!descripcionManual) {
        throw new Error("La descripcion del producto manual es requerida");
    }

    return {
        id_presentacion: null,
        origen_linea: origenLinea === "manual" ? "manual" : "manual",
        descripcion_manual: descripcionManual,
        codigo_manual: codigoManual,
        cantidad,
        costo_unitario: costoUnitario,
    };
}

function mapDetalleOrdenRow(row) {
    return {
        id_detalle: row.id_detalle,
        id_presentacion: row.id_presentacion,
        origen_linea: row.origen_linea || (row.id_presentacion ? "catalogo" : "manual"),
        descripcion_manual: row.descripcion_manual || null,
        codigo_manual: row.codigo_manual || null,
        presentacion_nombre: row.presentacion_nombre || row.descripcion_manual || "Producto manual",
        producto_nombre: row.producto_nombre || row.descripcion_manual || "Producto manual",
        codigo_barras: row.codigo_barras || row.codigo_manual || null,
        cantidad: Number(row.cantidad || 0),
        costo_unitario: Number(row.costo_unitario || 0),
        subtotal: Number(row.subtotal || 0),
    };
}

export async function getOrdenesCompra({ search = "", status = "" } = {}) {
    let sql = `
        SELECT
            oc.id_orden_compra,
            oc.folio,
            oc.status,
            oc.subtotal,
            oc.fecha,
            oc.notas,
            oc.created_at,
            p.id_proveedor,
            p.nombre AS proveedor_nombre,
            p.giro AS proveedor_giro,
            oc.id_almacen,
            a.nombre AS almacen_nombre,
            COALESCE(u.nombre, 'Sistema') AS usuario_nombre,
            COUNT(od.id_detalle_ordencompra) AS total_partidas,
            COALESCE(SUM(od.cantidad), 0) AS cantidad_total
        FROM ordenes_compra oc
        INNER JOIN proveedores p ON p.id_proveedor = oc.id_proveedor
        LEFT JOIN almacenes a ON a.id_almacen = oc.id_almacen
        LEFT JOIN usuarios u ON u.id_usuario = oc.id_usuario
        LEFT JOIN ordenes_compra_detalle od ON od.id_orden_compra = oc.id_orden_compra
        WHERE 1 = 1
    `;

    const params = [];

    if (search) {
        sql += " AND (oc.folio LIKE ? OR p.nombre LIKE ? OR oc.status LIKE ?)";
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status && VALID_STATUSES.includes(status)) {
        sql += " AND oc.status = ?";
        params.push(status);
    }

    sql += " GROUP BY oc.id_orden_compra ORDER BY oc.id_orden_compra DESC";

    const [rows] = await db.execute(sql, params);
    return rows;
}

export async function getOrdenCompraById(id) {
    const idOrden = toPositiveId(id, "id_orden_compra");

    const [rows] = await db.execute(
        `SELECT
            oc.id_orden_compra,
            oc.folio,
            oc.status,
            oc.subtotal,
            oc.fecha,
            oc.notas,
            oc.created_at,
            p.id_proveedor,
            p.nombre AS proveedor_nombre,
            p.giro AS proveedor_giro,
            oc.id_almacen,
            a.nombre AS almacen_nombre,
            COALESCE(u.nombre, 'Sistema') AS usuario_nombre
        FROM ordenes_compra oc
        INNER JOIN proveedores p ON p.id_proveedor = oc.id_proveedor
        LEFT JOIN almacenes a ON a.id_almacen = oc.id_almacen
        LEFT JOIN usuarios u ON u.id_usuario = oc.id_usuario
        WHERE oc.id_orden_compra = ?`,
        [idOrden]
    );

    if (rows.length === 0) throw new Error("Orden de compra no encontrada");

    const orden = rows[0];

    const [detalles] = await db.execute(
        `SELECT
            od.id_detalle_ordencompra,
            od.id_presentacion,
            NULL AS origen_linea,
            NULL AS descripcion_manual,
            NULL AS codigo_manual,
            od.cantidad,
            od.costo_unitario,
            od.subtotal,
            pp.nombre AS presentacion_nombre,
            pp.codigo_barras,
            p.nombre AS producto_nombre
        FROM ordenes_compra_detalle od
        LEFT JOIN producto_presentaciones pp ON pp.id_presentacion = od.id_presentacion
        LEFT JOIN productos p ON p.id_producto = pp.id_producto
        WHERE od.id_orden_compra = ?
        ORDER BY od.id_detalle_ordencompra ASC`,
        [idOrden]
    );

    return { ...orden, detalles: detalles.map(mapDetalleOrdenRow) };
}

export async function getKpisOrdenesCompra() {
    const [[totales]] = await db.execute(`
        SELECT
            COUNT(*) AS total_ordenes,
            COALESCE(SUM(subtotal), 0) AS monto_total,
            COALESCE(SUM(CASE WHEN status = 'pendiente' THEN 1 ELSE 0 END), 0) AS ordenes_pendientes
        FROM ordenes_compra
    `);
    return totales;
}

export async function createOrdenCompra(data) {
    const id_proveedor = toPositiveId(data.id_proveedor, "id_proveedor");
    const id_almacen = toPositiveId(data.id_almacen, "id_almacen");
    const fecha = toNullableString(data.fecha) ?? new Date().toISOString().slice(0, 10);
    const notas = toNullableString(data.notas);
    const partidas = Array.isArray(data.detalles) ? data.detalles : [];

    if (partidas.length === 0) throw new Error("La orden debe tener al menos un producto");

    let subtotal = 0;
    for (const item of partidas) {
        const cantidad = Number(item.cantidad);
        const costo = Number(item.costo_unitario);
        if (!Number.isInteger(cantidad) || cantidad <= 0) throw new Error("Cantidad invalida en partida");
        if (Number.isNaN(costo) || costo < 0) throw new Error("Costo invalido en partida");
        subtotal += cantidad * costo;
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        let insertResult = null;
        let folio = null;

        for (let attempt = 0; attempt < 3; attempt += 1) {
            folio = await buildNextFolio(conn);
            try {
                const [result] = await conn.execute(
                    `INSERT INTO ordenes_compra
                        (folio, id_proveedor, id_almacen, id_usuario, status, subtotal, fecha, notas)
                     VALUES (?, ?, ?, ?, 'pendiente', ?, ?, ?)`,
                    [folio, id_proveedor, id_almacen, null, subtotal, fecha, notas]
                );
                insertResult = result;
                break;
            } catch (error) {
                if (error?.code !== "ER_DUP_ENTRY" || attempt === 2) throw error;
            }
        }

        const idOrden = insertResult.insertId;

        for (const item of partidas) {
            const detalle = normalizeOrdenDetalle(item);
            const itemSubtotal = Math.round(detalle.cantidad * detalle.costo_unitario * 100) / 100;

            await conn.execute(
                `INSERT INTO ordenes_compra_detalle
                    (id_orden_compra, id_presentacion, origen_linea, descripcion_manual, codigo_manual, cantidad, costo_unitario, subtotal)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    idOrden,
                    detalle.id_presentacion,
                    detalle.origen_linea,
                    detalle.descripcion_manual,
                    detalle.codigo_manual,
                    detalle.cantidad,
                    detalle.costo_unitario,
                    itemSubtotal,
                ]
            );
        }

        await conn.commit();
        return { id: idOrden, folio };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function updateOrdenCompra(id, data) {
    const idOrden = toPositiveId(id, "id_orden_compra");

    const fields = [];
    const params = [];

    if (data.status !== undefined) {
        if (!VALID_STATUSES.includes(data.status)) throw new Error("Status invalido");
        fields.push("status = ?");
        params.push(data.status);
    }

    if (data.notas !== undefined) {
        fields.push("notas = ?");
        params.push(toNullableString(data.notas));
    }

    if (data.fecha !== undefined) {
        fields.push("fecha = ?");
        params.push(toNullableString(data.fecha));
    }

    if (data.id_almacen !== undefined) {
        fields.push("id_almacen = ?");
        params.push(toPositiveId(data.id_almacen, "id_almacen"));
    }

    if (Array.isArray(data.detalles)) {
        const partidas = data.detalles;
        if (partidas.length === 0) throw new Error("La orden debe tener al menos un producto");

        let subtotal = 0;
        for (const item of partidas) {
            const cantidad = Number(item.cantidad);
            const costo = Number(item.costo_unitario);
            if (!Number.isInteger(cantidad) || cantidad <= 0) throw new Error("Cantidad invalida");
            if (Number.isNaN(costo) || costo < 0) throw new Error("Costo invalido");
            subtotal += cantidad * costo;
        }

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();

            if (fields.length > 0) {
                const headerFields = [...fields, "subtotal = ?"];
                const headerParams = [...params, subtotal, idOrden];
                await conn.execute(
                    `UPDATE ordenes_compra SET ${headerFields.join(", ")} WHERE id_orden_compra = ?`,
                    headerParams
                );
            } else {
                await conn.execute(
                    "UPDATE ordenes_compra SET subtotal = ? WHERE id_orden_compra = ?",
                    [subtotal, idOrden]
                );
            }

            await conn.execute("DELETE FROM ordenes_compra_detalle WHERE id_orden_compra = ?", [idOrden]);

            for (const item of partidas) {
                const detalle = normalizeOrdenDetalle(item);
                const itemSubtotal = Math.round(detalle.cantidad * detalle.costo_unitario * 100) / 100;

                await conn.execute(
                    `INSERT INTO ordenes_compra_detalle
                        (id_orden_compra, id_presentacion, origen_linea, descripcion_manual, codigo_manual, cantidad, costo_unitario, subtotal)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        idOrden,
                        detalle.id_presentacion,
                        detalle.origen_linea,
                        detalle.descripcion_manual,
                        detalle.codigo_manual,
                        detalle.cantidad,
                        detalle.costo_unitario,
                        itemSubtotal,
                    ]
                );
            }

            await conn.commit();
            return { message: "Orden actualizada" };
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    if (fields.length === 0) throw new Error("No hay datos para actualizar");

    params.push(idOrden);
    const [result] = await db.execute(
        `UPDATE ordenes_compra SET ${fields.join(", ")} WHERE id_orden_compra = ?`,
        params
    );

    if (result.affectedRows === 0) throw new Error("Orden no encontrada");
    return { message: "Orden actualizada" };
}

export async function deleteOrdenCompra(id) {
    const idOrden = toPositiveId(id, "id_orden_compra");

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        await conn.execute("DELETE FROM ordenes_compra_detalle WHERE id_orden_compra = ?", [idOrden]);
        const [result] = await conn.execute("DELETE FROM ordenes_compra WHERE id_orden_compra = ?", [idOrden]);
        if (result.affectedRows === 0) throw new Error("Orden no encontrada");
        await conn.commit();
        return { message: "Orden eliminada" };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}
