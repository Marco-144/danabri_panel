import db from "@/lib/db";
import { searchProductosCatalog as searchPresentacionesEmpresaCatalog } from "@/modules/cotizaciones-empresas.service";

function toPositiveInt(value, fieldName) {
    const number = Number(value);
    if (!Number.isInteger(number) || number <= 0) {
        throw new Error(`${fieldName} invalido`);
    }
    return number;
}

function toPositiveIntOrNull(value, fieldName) {
    if (value === undefined || value === null) return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return null;
    if (!Number.isInteger(number)) throw new Error(`${fieldName} invalido`);
    return number;
}

function toDate(value, fieldName) {
    const text = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        throw new Error(`${fieldName} invalida`);
    }
    return text;
}

function toMoney(value, fieldName) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
        throw new Error(`${fieldName} invalido`);
    }
    return Math.round(number * 100) / 100;
}

function to6(value) {
    return Math.round(Number(value || 0) * 1000000) / 1000000;
}

async function buildNextFolio(connection) {
    const [[{ nextNum }]] = await connection.execute(
        "SELECT COALESCE(MAX(id_cotizacion), 0) + 1 AS nextNum FROM cotizaciones"
    );
    return `COT-C-${String(nextNum).padStart(6, "0")}`;
}

async function getDefaultPresentacionId(connection, id_producto) {
    const [rows] = await connection.execute(
        `
        SELECT pp.id_presentacion
        FROM producto_presentaciones pp
        WHERE pp.id_producto = ? AND pp.activo = 1
        ORDER BY pp.id_presentacion ASC
        LIMIT 1
        `,
        [id_producto]
    );

    return rows && rows.length ? rows[0].id_presentacion : null;
}

function normalizeHeaderRow(row) {
    return {
        id_cotizacion: row.id_cotizacion,
        folio: row.folio,
        id_cliente: row.id_cliente,
        cliente_nombre: row.cliente_nombre,
        cliente_rfc: row.cliente_rfc,
        cliente_telefono: row.cliente_telefono,
        tipo_cliente: row.tipo_cliente,
        nivel_precio: row.nivel_precio ? Number(row.nivel_precio) : null,
        id_usuario: row.id_usuario,
        usuario_nombre: row.usuario_nombre,
        fecha_emision: row.fecha_emision,
        estado: row.estado,
        total: Number(row.total || 0),
        created_at: row.created_at,
    };
}

function normalizeDetalleRow(row) {
    const priceLevels = [1, 2, 3, 4, 5]
        .map((level) => {
            const priceConIva = Number(row[`precio_nivel_${level}_default`] || 0);
            if (!Number.isFinite(priceConIva) || priceConIva <= 0) return null;

            return {
                level,
                label: `Precio ${level}`,
                priceWithTax: to6(priceConIva),
                priceWithoutTax: to6(priceConIva / (1 + 0.16)),
            };
        })
        .filter(Boolean);

    const firstLevel = priceLevels[0] || null;

    return {
        id_detalle: row.id_detalleCotizacion,
        id_producto: row.id_producto,
        producto_nombre: row.producto_nombre,
        cantidad: Number(row.cantidad || 0),
        precio: Number(row.precio || 0),
        subtotal: Number(row.subtotal || 0),
        id_presentacion_default: row.id_presentacion_default ? Number(row.id_presentacion_default) : null,
        presentacion_nombre_default: row.presentacion_nombre_default || "",
        niveles_precio: priceLevels,
        nivel_precio: firstLevel ? Number(firstLevel.level || 1) : 1,
        precio_manual_con_iva: firstLevel ? Number(firstLevel.priceWithTax || 0) : Number(row.precio || 0),
        precio_manual_sin_iva: firstLevel ? Number(firstLevel.priceWithoutTax || 0) : Number(row.precio || 0),
    };
}

function normalizeDetalles(detalles) {
    if (!Array.isArray(detalles) || !detalles.length) {
        throw new Error("Debes agregar al menos una partida");
    }

    return detalles.map((detalle, index) => {
        const line = index + 1;
        const id_producto = toPositiveInt(detalle.id_producto, `id_producto de la partida ${line}`);
        const cantidad = toPositiveInt(detalle.cantidad, `cantidad de la partida ${line}`);
        const precio = toMoney(detalle.precio, `precio de la partida ${line}`);
        const subtotal = toMoney(cantidad * precio, `subtotal de la partida ${line}`);
        const rawIdPresentacion = detalle.id_presentacion ?? detalle.id_presentacion_default ?? null;
        const id_presentacion = toPositiveIntOrNull(rawIdPresentacion, `id_presentacion de la partida ${line}`);

        return { id_producto, id_presentacion, cantidad, precio, subtotal };
    });
}

export async function getCotizacionesClientes({
    search = "",
    id_cliente = "",
    estado = "",
    fecha_desde = "",
    fecha_hasta = "",
} = {}) {
    let sql = `
        SELECT
            c.id_cotizacion,
            c.folio,
            c.id_cliente,
            cl.nombre AS cliente_nombre,
            cl.rfc AS cliente_rfc,
            cl.telefono AS cliente_telefono,
            cl.tipo_cliente,
            tc.nivel_precio,
            c.id_usuario,
            u.nombre AS usuario_nombre,
            c.total,
            c.estado,
            c.created_at,
            DATE(c.created_at) AS fecha_emision
        FROM cotizaciones c
        INNER JOIN clientes cl ON cl.id_cliente = c.id_cliente
        LEFT JOIN catalogo_tipos_cliente tc ON tc.nombre = cl.tipo_cliente
        INNER JOIN usuarios u ON u.id_usuario = c.id_usuario
        WHERE 1 = 1
    `;

    const params = [];

    if (search) {
        const q = `%${String(search).trim()}%`;
        sql += " AND (c.folio LIKE ? OR cl.nombre LIKE ? OR cl.rfc LIKE ?)";
        params.push(q, q, q);
    }

    if (id_cliente) {
        sql += " AND c.id_cliente = ?";
        params.push(toPositiveInt(id_cliente, "id_cliente"));
    }

    if (estado) {
        sql += " AND c.estado = ?";
        params.push(String(estado));
    }

    if (fecha_desde) {
        sql += " AND DATE(c.created_at) >= ?";
        params.push(toDate(fecha_desde, "fecha_desde"));
    }

    if (fecha_hasta) {
        sql += " AND DATE(c.created_at) <= ?";
        params.push(toDate(fecha_hasta, "fecha_hasta"));
    }

    sql += " ORDER BY c.id_cotizacion DESC";

    const [rows] = await db.execute(sql, params);
    return rows.map(normalizeHeaderRow);
}

export async function getCotizacionClienteById(id) {
    const idCotizacion = toPositiveInt(id, "id_cotizacion");

    const [headerRows] = await db.execute(
        `
        SELECT
            c.id_cotizacion,
            c.folio,
            c.id_cliente,
            cl.nombre AS cliente_nombre,
            cl.rfc AS cliente_rfc,
            cl.telefono AS cliente_telefono,
            cl.tipo_cliente,
            tc.nivel_precio,
            c.id_usuario,
            u.nombre AS usuario_nombre,
            c.total,
            c.estado,
            c.created_at,
            DATE(c.created_at) AS fecha_emision
        FROM cotizaciones c
        INNER JOIN clientes cl ON cl.id_cliente = c.id_cliente
        LEFT JOIN catalogo_tipos_cliente tc ON tc.nombre = cl.tipo_cliente
        INNER JOIN usuarios u ON u.id_usuario = c.id_usuario
        WHERE c.id_cotizacion = ?
        LIMIT 1
        `,
        [idCotizacion]
    );

    if (!headerRows.length) {
        throw new Error("Cotizacion no encontrada");
    }

    const [detalleRows] = await db.execute(
        `
        SELECT
            dc.id_detalleCotizacion,
            dc.id_producto,
            p.nombre AS producto_nombre,
            dc.cantidad,
            dc.precio,
            dc.subtotal,
            (
                SELECT pp.id_presentacion
                FROM producto_presentaciones pp
                WHERE pp.id_producto = dc.id_producto AND pp.activo = 1
                ORDER BY pp.id_presentacion ASC
                LIMIT 1
            ) AS id_presentacion_default,
            (
                SELECT pp.nombre
                FROM producto_presentaciones pp
                WHERE pp.id_producto = dc.id_producto AND pp.activo = 1
                ORDER BY pp.id_presentacion ASC
                LIMIT 1
            ) AS presentacion_nombre_default
            ,(
                SELECT pp.precio_nivel_1
                FROM producto_presentaciones pp
                WHERE pp.id_producto = dc.id_producto AND pp.activo = 1
                ORDER BY pp.id_presentacion ASC
                LIMIT 1
            ) AS precio_nivel_1_default
            ,(
                SELECT pp.precio_nivel_2
                FROM producto_presentaciones pp
                WHERE pp.id_producto = dc.id_producto AND pp.activo = 1
                ORDER BY pp.id_presentacion ASC
                LIMIT 1
            ) AS precio_nivel_2_default
            ,(
                SELECT pp.precio_nivel_3
                FROM producto_presentaciones pp
                WHERE pp.id_producto = dc.id_producto AND pp.activo = 1
                ORDER BY pp.id_presentacion ASC
                LIMIT 1
            ) AS precio_nivel_3_default
            ,(
                SELECT pp.precio_nivel_4
                FROM producto_presentaciones pp
                WHERE pp.id_producto = dc.id_producto AND pp.activo = 1
                ORDER BY pp.id_presentacion ASC
                LIMIT 1
            ) AS precio_nivel_4_default
            ,(
                SELECT pp.precio_nivel_5
                FROM producto_presentaciones pp
                WHERE pp.id_producto = dc.id_producto AND pp.activo = 1
                ORDER BY pp.id_presentacion ASC
                LIMIT 1
            ) AS precio_nivel_5_default
        FROM detalle_cotizacion dc
        INNER JOIN productos p ON p.id_producto = dc.id_producto
        WHERE dc.id_cotizacion = ?
        ORDER BY dc.id_detalleCotizacion ASC
        `,
        [idCotizacion]
    );

    return {
        ...normalizeHeaderRow(headerRows[0]),
        detalles: detalleRows.map(normalizeDetalleRow),
    };
}

export async function createCotizacionCliente(data) {
    const id_cliente = toPositiveInt(data.id_cliente, "id_cliente");
    const id_usuario = toPositiveInt(data.id_usuario, "id_usuario");
    const estado = String(data.estado || "pendiente").toLowerCase();
    if (!["pendiente", "aprobada", "rechazada", "convertida"].includes(estado)) {
        throw new Error("estado invalido");
    }

    const detalles = normalizeDetalles(data.detalles);
    const total = toMoney(detalles.reduce((acc, item) => acc + Number(item.subtotal || 0), 0), "total");

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const folio = await buildNextFolio(conn);

        const [insertResult] = await conn.execute(
            `
            INSERT INTO cotizaciones (folio, id_cliente, id_usuario, total, estado)
            VALUES (?, ?, ?, ?, ?)
            `,
            [folio, id_cliente, id_usuario, total, estado]
        );

        const id_cotizacion = insertResult.insertId;

        for (const item of detalles) {
            let id_presentacion_to_use = item.id_presentacion;
            if (id_presentacion_to_use == null) {
                id_presentacion_to_use = await getDefaultPresentacionId(conn, item.id_producto);
                if (id_presentacion_to_use == null) {
                    throw new Error(`No hay presentacion activa para el producto ${item.id_producto}`);
                }
            }

            await conn.execute(
                `
                INSERT INTO detalle_cotizacion (id_cotizacion, id_producto, id_presentacion, cantidad, precio, subtotal)
                VALUES (?, ?, ?, ?, ?, ?)
                `,
                [id_cotizacion, item.id_producto, id_presentacion_to_use, item.cantidad, item.precio, item.subtotal]
            );
        }

        await conn.commit();
        return { id_cotizacion, folio, message: "Cotizacion creada" };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function updateCotizacionCliente(id, data) {
    const id_cotizacion = toPositiveInt(id, "id_cotizacion");
    const id_cliente = toPositiveInt(data.id_cliente, "id_cliente");
    const id_usuario = toPositiveInt(data.id_usuario, "id_usuario");
    const estado = String(data.estado || "pendiente").toLowerCase();
    if (!["pendiente", "aprobada", "rechazada", "convertida"].includes(estado)) {
        throw new Error("estado invalido");
    }

    const detalles = normalizeDetalles(data.detalles);
    const total = toMoney(detalles.reduce((acc, item) => acc + Number(item.subtotal || 0), 0), "total");

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [updateResult] = await conn.execute(
            `
            UPDATE cotizaciones
            SET id_cliente = ?, id_usuario = ?, total = ?, estado = ?
            WHERE id_cotizacion = ?
            `,
            [id_cliente, id_usuario, total, estado, id_cotizacion]
        );

        if (!updateResult.affectedRows) {
            throw new Error("Cotizacion no encontrada");
        }

        await conn.execute("DELETE FROM detalle_cotizacion WHERE id_cotizacion = ?", [id_cotizacion]);

        for (const item of detalles) {
            let id_presentacion_to_use = item.id_presentacion;
            if (id_presentacion_to_use == null) {
                id_presentacion_to_use = await getDefaultPresentacionId(conn, item.id_producto);
                if (id_presentacion_to_use == null) {
                    throw new Error(`No hay presentacion activa para el producto ${item.id_producto}`);
                }
            }

            await conn.execute(
                `
                INSERT INTO detalle_cotizacion (id_cotizacion, id_producto, id_presentacion, cantidad, precio, subtotal)
                VALUES (?, ?, ?, ?, ?, ?)
                `,
                [id_cotizacion, item.id_producto, id_presentacion_to_use, item.cantidad, item.precio, item.subtotal]
            );
        }

        await conn.commit();
        return { message: "Cotizacion actualizada" };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function deleteCotizacionCliente(id) {
    const id_cotizacion = toPositiveInt(id, "id_cotizacion");
    const [result] = await db.execute("DELETE FROM cotizaciones WHERE id_cotizacion = ?", [id_cotizacion]);

    if (!result.affectedRows) {
        throw new Error("Cotizacion no encontrada");
    }

    return { message: "Cotizacion eliminada" };
}

export async function searchClientesCatalog({ search = "", limit = 15 } = {}) {
    const top = Math.min(Math.max(Number(limit) || 15, 1), 50);
    const q = `%${String(search || "").trim()}%`;

    const [rows] = await db.execute(
        `
        SELECT
            c.id_cliente,
            c.nombre,
            c.rfc,
            c.telefono,
            c.email,
            c.ciudad,
            c.estado,
            c.tipo_cliente,
            tc.nivel_precio
        FROM clientes c
        LEFT JOIN catalogo_tipos_cliente tc ON tc.nombre = c.tipo_cliente
        WHERE (? = '%%' OR c.nombre LIKE ? OR c.rfc LIKE ? OR c.telefono LIKE ?)
        ORDER BY c.nombre ASC
        LIMIT ${top}
        `,
        [q, q, q, q]
    );

    return rows;
}

export async function searchProductosCotizacionClienteCatalog({ search = "", limit = 20 } = {}) {
    return searchPresentacionesEmpresaCatalog({ search, limit });
}

export async function searchPresentacionesCatalog(params = {}) {
    return searchPresentacionesEmpresaCatalog(params);
}
