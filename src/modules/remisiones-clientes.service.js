import db from "@/lib/db";
import { aplicarMovimientoRemision, reversorMovimientoRemision } from "./almacenes.service";

function toPositiveInt(value, fieldName) {
    const number = Number(value);
    if (!Number.isInteger(number) || number <= 0) {
        throw new Error(`${fieldName} invalido`);
    }
    return number;
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

function toOptionalString(value) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text.length ? text : null;
}

async function buildNextFolio(connection) {
    const [[{ nextNum }]] = await connection.execute(
        "SELECT COALESCE(MAX(id_remision), 0) + 1 AS nextNum FROM remisiones"
    );
    return `REM-C-${String(nextNum).padStart(6, "0")}`;
}

function normalizeHeaderRow(row) {
    return {
        id_remision: row.id_remision,
        folio: row.folio,
        id_cliente: row.id_cliente,
        cliente_nombre: row.cliente_nombre,
        cliente_rfc: row.cliente_rfc,
        cliente_credito_habilitado: Boolean(row.credito_habilitado),
        cliente_dias_credito: row.dias_credito ? Number(row.dias_credito) : null,
        id_usuario: row.id_usuario,
        usuario_nombre: row.usuario_nombre,
        total: Number(row.total || 0),
        total_abonado: Number(row.total_abonado || 0),
        saldo_pendiente: Number(row.saldo_pendiente || 0),
        facturado: Boolean(row.facturado),
        facturado_at: row.facturado_at,
        rfc_facturacion: row.rfc_facturacion,
        uso_cfdi_facturacion: row.uso_cfdi_facturacion,
        estado: row.estado,
        created_at: row.created_at,
    };
}

export async function recalcularEstadoRemision(connection, idRemision) {
    const [[remRow]] = await connection.execute(
        "SELECT id_remision, total, estado FROM remisiones WHERE id_remision = ? LIMIT 1 FOR UPDATE",
        [idRemision]
    );

    if (!remRow) {
        throw new Error("Remision no encontrada");
    }

    const [[sumRow]] = await connection.execute(
        "SELECT COALESCE(SUM(monto), 0) AS total_abonado FROM pagos WHERE id_remision = ?",
        [idRemision]
    );

    const total = Number(remRow.total || 0);
    const totalAbonado = Number(sumRow.total_abonado || 0);
    const saldoPendiente = Math.max(0, Math.round((total - totalAbonado) * 100) / 100);

    let nuevoEstado = remRow.estado === "cancelada" ? "cancelada" : "pendiente";

    if (nuevoEstado !== "cancelada") {
        if (saldoPendiente === 0 && totalAbonado > 0) {
            nuevoEstado = "pagada";
        } else if (totalAbonado > 0) {
            nuevoEstado = "parcialmente_pagada";
        }
    }

    await connection.execute(
        "UPDATE remisiones SET estado = ? WHERE id_remision = ?",
        [nuevoEstado, idRemision]
    );

    return {
        total,
        total_abonado: totalAbonado,
        saldo_pendiente: saldoPendiente,
        estado: nuevoEstado,
    };
}

function normalizeDetalles(detalles) {
    if (!Array.isArray(detalles) || !detalles.length) {
        throw new Error("Debes agregar al menos una partida");
    }

    return detalles.map((detalle, index) => {
        const line = index + 1;
        const id_presentacion = toPositiveInt(detalle.id_presentacion, `id_presentacion de la partida ${line}`);
        const id_almacen = toPositiveInt(detalle.id_almacen, `id_almacen de la partida ${line}`);
        const cantidad = toPositiveInt(detalle.cantidad, `cantidad de la partida ${line}`);
        const precio = toMoney(detalle.precio, `precio de la partida ${line}`);
        const subtotal = toMoney(cantidad * precio, `subtotal de la partida ${line}`);
        return { id_presentacion, id_almacen, cantidad, precio, subtotal };
    });
}

export async function getRemisionesClientes({ search = "", estado = "", facturado = "", id_cliente = "", desde = "", hasta = "" } = {}) {
    let sql = `
        SELECT
            r.id_remision,
            r.folio,
            r.id_cliente,
            c.nombre AS cliente_nombre,
            c.rfc AS cliente_rfc,
            c.credito_habilitado,
            c.dias_credito,
            r.id_usuario,
            u.nombre AS usuario_nombre,
            r.total,
            r.facturado,
            r.facturado_at,
            r.rfc_facturacion,
            r.uso_cfdi_facturacion,
            r.estado,
            r.created_at,
            COALESCE(SUM(p.monto), 0) AS total_abonado,
            GREATEST(r.total - COALESCE(SUM(p.monto), 0), 0) AS saldo_pendiente
        FROM remisiones r
        INNER JOIN clientes c ON c.id_cliente = r.id_cliente
        INNER JOIN usuarios u ON u.id_usuario = r.id_usuario
        LEFT JOIN pagos p ON p.id_remision = r.id_remision
        WHERE 1 = 1
    `;

    const params = [];

    if (search) {
        const q = `%${String(search).trim()}%`;
        sql += " AND (r.folio LIKE ? OR c.nombre LIKE ? OR c.rfc LIKE ?)";
        params.push(q, q, q);
    }

    if (estado) {
        sql += " AND r.estado = ?";
        params.push(String(estado));
    }

    if (facturado === "1" || facturado === "0") {
        sql += " AND r.facturado = ?";
        params.push(Number(facturado));
    }

    if (id_cliente) {
        sql += " AND r.id_cliente = ?";
        params.push(toPositiveInt(id_cliente, "id_cliente"));
    }

    if (desde) {
        sql += " AND DATE(r.created_at) >= ?";
        params.push(String(desde));
    }

    if (hasta) {
        sql += " AND DATE(r.created_at) <= ?";
        params.push(String(hasta));
    }

    sql += " GROUP BY r.id_remision ORDER BY r.id_remision DESC";

    const [rows] = await db.execute(sql, params);
    return rows.map(normalizeHeaderRow);
}

export async function getRemisionClienteById(id) {
    const idRemision = toPositiveInt(id, "id_remision");

    const [headerRows] = await db.execute(
        `
        SELECT
            r.id_remision,
            r.folio,
            r.id_cliente,
            c.nombre AS cliente_nombre,
            c.rfc AS cliente_rfc,
            c.tipo_cliente,
            tc.nivel_precio,
            c.telefono AS cliente_telefono,
            c.email AS cliente_email,
            c.calle AS cliente_calle,
            c.num_exterior AS cliente_num_exterior,
            c.num_interior AS cliente_num_interior,
            c.colonia AS cliente_colonia,
            c.cp AS cliente_cp,
            c.ciudad AS cliente_ciudad,
            c.estado AS cliente_estado,
            r.id_usuario,
            u.nombre AS usuario_nombre,
            r.total,
            r.facturado,
            r.facturado_at,
            r.rfc_facturacion,
            r.uso_cfdi_facturacion,
            r.estado,
            r.created_at,
            COALESCE(SUM(p.monto), 0) AS total_abonado,
            GREATEST(r.total - COALESCE(SUM(p.monto), 0), 0) AS saldo_pendiente
        FROM remisiones r
        INNER JOIN clientes c ON c.id_cliente = r.id_cliente
        LEFT JOIN catalogo_tipos_cliente tc ON tc.nombre = c.tipo_cliente
        INNER JOIN usuarios u ON u.id_usuario = r.id_usuario
        LEFT JOIN pagos p ON p.id_remision = r.id_remision
        WHERE r.id_remision = ?
        GROUP BY r.id_remision
        LIMIT 1
        `,
        [idRemision]
    );

    if (!headerRows.length) {
        throw new Error("Remision no encontrada");
    }

    const [detalleRows] = await db.execute(
        `
        SELECT
            dr.id_detalleRemision,
            dr.id_presentacion,
            dr.id_almacen,
            p.nombre AS producto_nombre,
            pp.nombre AS presentacion_nombre,
            a.nombre AS almacen_nombre,
            pp.precio_nivel_1,
            pp.precio_nivel_2,
            pp.precio_nivel_3,
            pp.precio_nivel_4,
            pp.precio_nivel_5,
            dr.cantidad,
            dr.precio,
            dr.subtotal
        FROM detalle_remision dr
        INNER JOIN producto_presentaciones pp ON pp.id_presentacion = dr.id_presentacion
        INNER JOIN productos p ON p.id_producto = pp.id_producto
        INNER JOIN almacenes a ON a.id_almacen = dr.id_almacen
        WHERE dr.id_remision = ?
        ORDER BY dr.id_detalleRemision ASC
        `,
        [idRemision]
    );

    return {
        ...normalizeHeaderRow(headerRows[0]),
        cliente_tipo_cliente: headerRows[0].tipo_cliente,
        cliente_nivel_precio: headerRows[0].nivel_precio ? Number(headerRows[0].nivel_precio) : null,
        cliente_telefono: headerRows[0].cliente_telefono,
        cliente_email: headerRows[0].cliente_email,
        cliente_calle: headerRows[0].cliente_calle,
        cliente_num_exterior: headerRows[0].cliente_num_exterior,
        cliente_num_interior: headerRows[0].cliente_num_interior,
        cliente_colonia: headerRows[0].cliente_colonia,
        cliente_cp: headerRows[0].cliente_cp,
        cliente_ciudad: headerRows[0].cliente_ciudad,
        cliente_estado: headerRows[0].cliente_estado,
        detalles: detalleRows.map((row) => ({
            id_detalleRemision: row.id_detalleRemision,
            id_presentacion: row.id_presentacion,
            id_almacen: row.id_almacen,
            almacen_nombre: row.almacen_nombre,
            producto_nombre: row.producto_nombre,
            presentacion_nombre: row.presentacion_nombre,
            niveles_precio: [1, 2, 3, 4, 5]
                .map((level) => {
                    const priceConIva = Number(row[`precio_nivel_${level}`] || 0);
                    if (!Number.isFinite(priceConIva) || priceConIva <= 0) return null;

                    return {
                        level,
                        label: `Precio ${level}`,
                        priceWithTax: to6(priceConIva),
                        priceWithoutTax: to6(priceConIva / 1.16),
                    };
                })
                .filter(Boolean),
            cantidad: Number(row.cantidad || 0),
            precio: Number(row.precio || 0),
            subtotal: Number(row.subtotal || 0),
        })),
    };
}

export async function createRemisionCliente(payload) {
    const id_cliente = toPositiveInt(payload.id_cliente, "id_cliente");
    const id_usuario = toPositiveInt(payload.id_usuario, "id_usuario");
    const detalles = normalizeDetalles(payload.detalles);
    const total = toMoney(detalles.reduce((acc, item) => acc + Number(item.subtotal || 0), 0), "total");
    const facturado = Object.prototype.hasOwnProperty.call(payload, "facturado")
        ? (payload.facturado ? 1 : 0)
        : 0;

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const folio = await buildNextFolio(conn);

        const [insertResult] = await conn.execute(
            `
            INSERT INTO remisiones (folio, id_cliente, id_usuario, total, facturado, estado)
            VALUES (?, ?, ?, ?, ?, 'pendiente')
            `,
            [folio, id_cliente, id_usuario, total, facturado]
        );

        const id_remision = insertResult.insertId;

        for (const item of detalles) {
            await conn.execute(
                `
                INSERT INTO detalle_remision (id_remision, id_presentacion, id_almacen, cantidad, precio, subtotal)
                VALUES (?, ?, ?, ?, ?, ?)
                `,
                [id_remision, item.id_presentacion, item.id_almacen, item.cantidad, item.precio, item.subtotal]
            );
        }

        // Aplicar movimiento de inventario
        await aplicarMovimientoRemision(conn, id_remision, detalles);

        await conn.commit();
        return { id_remision, folio, message: "Remision creada" };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function updateRemisionCliente(id, payload) {
    const id_remision = toPositiveInt(id, "id_remision");
    const id_cliente = toPositiveInt(payload.id_cliente, "id_cliente");
    const id_usuario = toPositiveInt(payload.id_usuario, "id_usuario");
    const detalles = normalizeDetalles(payload.detalles);
    const total = toMoney(detalles.reduce((acc, item) => acc + Number(item.subtotal || 0), 0), "total");

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [[actual]] = await conn.execute(
            "SELECT facturado FROM remisiones WHERE id_remision = ? LIMIT 1 FOR UPDATE",
            [id_remision]
        );

        if (!actual) {
            throw new Error("Remision no encontrada");
        }

        const facturado = Object.prototype.hasOwnProperty.call(payload, "facturado")
            ? (payload.facturado ? 1 : 0)
            : Number(actual.facturado || 0);

        // Reversar movimiento anterior
        await reversorMovimientoRemision(conn, id_remision);

        const [updateResult] = await conn.execute(
            `
            UPDATE remisiones
            SET id_cliente = ?, id_usuario = ?, total = ?, facturado = ?
            WHERE id_remision = ?
            `,
            [id_cliente, id_usuario, total, facturado, id_remision]
        );

        if (!updateResult.affectedRows) {
            throw new Error("Remision no encontrada");
        }

        await conn.execute("DELETE FROM detalle_remision WHERE id_remision = ?", [id_remision]);

        for (const item of detalles) {
            await conn.execute(
                `
                INSERT INTO detalle_remision (id_remision, id_presentacion, id_almacen, cantidad, precio, subtotal)
                VALUES (?, ?, ?, ?, ?, ?)
                `,
                [id_remision, item.id_presentacion, item.id_almacen, item.cantidad, item.precio, item.subtotal]
            );
        }

        // Aplicar nuevo movimiento de inventario
        await aplicarMovimientoRemision(conn, id_remision, detalles);

        await conn.commit();
        return { message: "Remision actualizada" };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function deleteRemisionCliente(id) {
    const id_remision = toPositiveInt(id, "id_remision");

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        // Reversar movimiento antes de eliminar
        await reversorMovimientoRemision(conn, id_remision);

        const [result] = await conn.execute("DELETE FROM remisiones WHERE id_remision = ?", [id_remision]);

        if (!result.affectedRows) {
            throw new Error("Remision no encontrada");
        }

        await conn.commit();
        return { message: "Remision eliminada" };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function facturarRemisionCliente(id) {
    const id_remision = toPositiveInt(id, "id_remision");

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [[remision]] = await conn.execute(
            `
            SELECT
                r.id_remision,
                r.facturado,
                r.total,
                c.rfc,
                c.uso_cfdi,
                c.facturar_sin_pagar
            FROM remisiones r
            INNER JOIN clientes c ON c.id_cliente = r.id_cliente
            WHERE r.id_remision = ?
            LIMIT 1
            FOR UPDATE
            `,
            [id_remision]
        );

        if (!remision) {
            throw new Error("Remision no encontrada");
        }

        const [[sumRow]] = await conn.execute(
            "SELECT COALESCE(SUM(monto), 0) AS total_abonado FROM pagos WHERE id_remision = ?",
            [id_remision]
        );

        const total = Number(remision.total || 0);
        const totalAbonado = Number(sumRow.total_abonado || 0);
        const saldoPendiente = Math.max(0, Math.round((total - totalAbonado) * 100) / 100);
        const permiteFacturarSinPagar = Number(remision.facturar_sin_pagar || 0) === 1;

        if (saldoPendiente > 0 && !permiteFacturarSinPagar) {
            throw new Error("El cliente no permite facturar con saldo pendiente");
        }

        const [result] = await conn.execute(
            `
            UPDATE remisiones
            SET facturado = 1,
                facturado_at = COALESCE(facturado_at, NOW()),
                rfc_facturacion = ?,
                uso_cfdi_facturacion = ?
            WHERE id_remision = ?
            `,
            [toOptionalString(remision.rfc), toOptionalString(remision.uso_cfdi), id_remision]
        );

        if (!result.affectedRows) {
            throw new Error("Remision no encontrada");
        }

        await conn.commit();
        return { message: "Remision facturada" };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}
