import db from "@/lib/db";

// ============================================================
// UTILITARIOS
// ============================================================

function toPositiveId(value, fieldName = "id") {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new Error(`${fieldName} inválido`);
    return id;
}

function toNullableString(value) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text ? text : null;
}

function fmtDate(d) {
    if (!d) return null;
    return new Date(d).toISOString().slice(0, 10);
}

async function buildNextFolioFactura(connection) {
    const [[{ nextNum }]] = await connection.execute(
        "SELECT COALESCE(MAX(id_factura_proveedor), 0) + 1 AS nextNum FROM facturas_proveedor"
    );
    return `FACT-${String(nextNum).padStart(6, "0")}`;
}

// ============================================================
// LISTAR FACTURAS
// ============================================================
export async function getFacturasProveedor({
    search = "",
    estado = "",
    id_proveedor = "",
    id_almacen = "",
    desde = "",
    hasta = "",
} = {}) {
    let sql = `
        SELECT
            fp.id_factura_proveedor AS id_factura,
            fp.folio_factura,
            fp.id_orden_compra,
            fp.fecha_factura,
            fp.fecha_vencimiento,
            fp.subtotal,
            fp.descuento,
            fp.iva,
            fp.total,
            fp.saldo_pendiente,
            fp.estado_pago,
            fp.inventario_cerrado_at,
            fp.observaciones,
            fp.created_at,
            fp.updated_at,
            p.id_proveedor,
            p.nombre AS proveedor_nombre,
            a.id_almacen,
            a.nombre AS almacen_nombre,
            oc.folio AS orden_folio,
            COUNT(DISTINCT fpd.id_detalle_facturas_proveedor) AS total_items
        FROM facturas_proveedor fp
        INNER JOIN proveedores p ON p.id_proveedor = fp.id_proveedor
        INNER JOIN almacenes a ON a.id_almacen = fp.id_almacen
        LEFT JOIN ordenes_compra oc ON oc.id_orden_compra = fp.id_orden_compra
        LEFT JOIN facturas_proveedor_detalle fpd ON fpd.id_factura_proveedor = fp.id_factura_proveedor
        WHERE 1 = 1
    `;

    const params = [];

    if (search) {
        sql += " AND (fp.folio_factura LIKE ? OR p.nombre LIKE ? OR fp.observaciones LIKE ?)";
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (estado) {
        sql += " AND fp.estado_pago = ?";
        params.push(estado);
    }

    if (id_proveedor) {
        sql += " AND fp.id_proveedor = ?";
        params.push(id_proveedor);
    }

    if (id_almacen) {
        sql += " AND fp.id_almacen = ?";
        params.push(id_almacen);
    }

    if (desde) {
        sql += " AND fp.fecha_vencimiento >= ?";
        params.push(desde);
    }

    if (hasta) {
        sql += " AND fp.fecha_vencimiento <= ?";
        params.push(hasta);
    }

    sql += " GROUP BY fp.id_factura_proveedor";
    sql += " ORDER BY fp.fecha_vencimiento ASC, fp.id_factura_proveedor DESC";

    const [rows] = await db.execute(sql, params);
    return rows;
}

// ============================================================
// OBTENER FACTURA POR ID CON DETALLE
// ============================================================
export async function getFacturaById(id) {
    const idFactura = toPositiveId(id, "id_factura_proveedor");

    const [filaFactura] = await db.execute(
        `SELECT
            fp.id_factura_proveedor AS id_factura,
            fp.*,
            p.nombre AS proveedor_nombre,
            p.rfc AS proveedor_rfc,
            a.nombre AS almacen_nombre,
            oc.folio AS orden_folio
        FROM facturas_proveedor fp
        INNER JOIN proveedores p ON p.id_proveedor = fp.id_proveedor
        INNER JOIN almacenes a ON a.id_almacen = fp.id_almacen
        LEFT JOIN ordenes_compra oc ON oc.id_orden_compra = fp.id_orden_compra
        WHERE fp.id_factura_proveedor = ?`,
        [idFactura]
    );

    if (filaFactura.length === 0) throw new Error("Factura no encontrada");

    const factura = filaFactura[0];

    const [detalles] = await db.execute(
        `SELECT
            fpd.id_detalle_facturas_proveedor AS id_detalle,
            fpd.id_presentacion,
            fpd.cantidad_recibida,
            fpd.costo_unitario_sin_iva,
            fpd.costo_unitario_con_iva,
            fpd.subtotal_sin_iva,
            fpd.subtotal_con_iva,
            pp.nombre AS presentacion_nombre,
            pp.codigo_barras,
            p.nombre AS producto_nombre
        FROM facturas_proveedor_detalle fpd
        INNER JOIN producto_presentaciones pp ON pp.id_presentacion = fpd.id_presentacion
        INNER JOIN productos p ON p.id_producto = pp.id_producto
        WHERE fpd.id_factura_proveedor = ?
        ORDER BY fpd.id_detalle_facturas_proveedor ASC`,
        [idFactura]
    );

    const [pagos] = await db.execute(
        `SELECT
            pfp.id_pagos_factura_proveedor AS id_pago,
            pfp.fecha_pago,
            pfp.monto,
            pfp.metodo_pago,
            pfp.referencia_pago,
            pfp.observaciones_pago,
            pfp.created_at
        FROM pagos_factura_proveedor pfp
        WHERE pfp.id_factura_proveedor = ?
        ORDER BY pfp.fecha_pago ASC`,
        [idFactura]
    );

    return {
        ...factura,
        detalles,
        pagos,
        total_pagado: pagos.reduce((sum, p) => sum + Number(p.monto || 0), 0),
    };
}

// ============================================================
// CREAR FACTURA
// ============================================================
export async function createFacturaFromOrden(data) {
    const {
        id_orden_compra,
        folio_factura,
        fecha_factura,
        fecha_vencimiento,
        descuento = 0,
        observaciones,
        detalles = null,
        archivo_nombre,
        archivo_url,
        archivo_mime,
        archivo_xml_url,
        archivo_xml_nombre,
    } = data;

    const idOrden = toPositiveId(id_orden_compra, "id_orden_compra");
    const folioFactura = toNullableString(folio_factura);
    const fechaFactura = fmtDate(fecha_factura);
    const fechaVencimiento = fmtDate(fecha_vencimiento);

    if (!folioFactura) throw new Error("Folio de factura obligatorio");
    if (!fechaFactura) throw new Error("Fecha de factura obligatoria");
    if (!fechaVencimiento) throw new Error("Fecha de vencimiento obligatoria");
    if (fechaVencimiento < fechaFactura) throw new Error("Vencimiento no puede ser menor a fecha de factura");
    if (!archivo_url) throw new Error("Archivo PDF obligatorio");

    // Obtener orden con detalles
    const [filasOrden] = await db.execute(
        `SELECT oc.*, oc.id_proveedor, oc.id_almacen
        FROM ordenes_compra oc
        WHERE oc.id_orden_compra = ?`,
        [idOrden]
    );

    if (filasOrden.length === 0) throw new Error("Orden de compra no encontrada");
    const orden = filasOrden[0];

    if (!orden.id_almacen && !data.id_almacen) throw new Error("Almacén obligatorio");
    const idAlmacen = orden.id_almacen || toPositiveId(data.id_almacen, "id_almacen");
    const idProveedor = orden.id_proveedor;

    const [filasDetallesOC] = await db.execute(
        `SELECT * FROM ordenes_compra_detalle WHERE id_orden_compra = ?`,
        [idOrden]
    );

    const detalleBase = Array.isArray(detalles) && detalles.length > 0 ? detalles : filasDetallesOC;
    if (detalleBase.length === 0) throw new Error("Orden sin artículos");

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Generar folio único (sistema)
        let folioSistema = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            folioSistema = await buildNextFolioFactura(conn);
            try {
                // Validar que folio_factura sea único por proveedor
                const [check] = await conn.execute(
                    `SELECT id_factura_proveedor FROM facturas_proveedor WHERE id_proveedor = ? AND folio_factura = ?`,
                    [idProveedor, folioFactura]
                );
                if (check.length > 0) throw new Error(`Folio ${folioFactura} ya existe para este proveedor`);
                break;
            } catch (e) {
                if (e.message.includes("Folio")) throw e;
                if (attempt === 2) throw e;
            }
        }

        let subtotal = 0;
        const detallesFactura = [];

        // Copiar o usar detalles editados de la orden a la factura
        for (const det of detalleBase) {
            const cantidadRecibida = Number(det.cantidad_recibida ?? det.cantidad ?? 1);
            const costoSinIva = Number(det.costo_unitario_sin_iva ?? det.costo_unitario ?? 0);
            const idPresentacion = toPositiveId(det.id_presentacion, "id_presentacion");
            const costoConIva = costoSinIva * 1.16;
            const subTotal = cantidadRecibida * costoSinIva;

            detallesFactura.push({
                id_presentacion: idPresentacion,
                cantidad_recibida: cantidadRecibida,
                costo_unitario_sin_iva: costoSinIva,
                costo_unitario_con_iva: costoConIva,
                subtotal_sin_iva: subTotal,
                subtotal_con_iva: subTotal * 1.16,
            });

            subtotal += subTotal;
        }

        const descuentoNum = Number(descuento) || 0;
        const subtotalConDesc = subtotal - descuentoNum;
        const iva = Math.round(subtotalConDesc * 0.16 * 100) / 100;
        const total = Math.round((subtotalConDesc + iva) * 100) / 100;

        const [resultFactura] = await conn.execute(
            `INSERT INTO facturas_proveedor
                (folio_factura, id_proveedor, id_orden_compra, id_almacen, id_usuario, fecha_factura, fecha_vencimiento, subtotal, descuento, subtotal_con_desc, iva, total, saldo_pendiente, estado_pago, archivo_url, archivo_nombre, archivo_mime, archivo_xml_url, archivo_xml_nombre, observaciones)
            VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?, ?, ?, ?, ?)` ,
            [
                folioFactura,
                idProveedor,
                idOrden,
                idAlmacen,
                fechaFactura,
                fechaVencimiento,
                subtotal,
                descuentoNum,
                subtotalConDesc,
                iva,
                total,
                total,
                archivo_url,
                archivo_nombre,
                archivo_mime,
                archivo_xml_url || null,
                archivo_xml_nombre || null,
                observaciones || null,
            ]
        );

        const idFactura = resultFactura.insertId;

        // Insertar detalles
        for (const detalle of detallesFactura) {
            await conn.execute(
                `INSERT INTO facturas_proveedor_detalle
                    (id_factura_proveedor, id_presentacion, cantidad_recibida, costo_unitario_sin_iva, costo_unitario_con_iva, subtotal_sin_iva, subtotal_con_iva)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [idFactura, detalle.id_presentacion, detalle.cantidad_recibida, detalle.costo_unitario_sin_iva, detalle.costo_unitario_con_iva, detalle.subtotal_sin_iva, detalle.subtotal_con_iva]
            );
        }

        // Actualizar orden: status = 'recibida' (si coinciden todas las cantidades) o 'parcial'
        // Por ahora: recibida (se ajusta en UPDATE si hay diffs)
        await conn.execute(`UPDATE ordenes_compra SET status = 'recibida' WHERE id_orden_compra = ?`, [idOrden]);

        await conn.commit();
        return { id_factura: idFactura, folio: folioFactura };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

// ============================================================
// ACTUALIZAR DETALLE DE FACTURA (cantidades/costos)
// ============================================================
export async function updateFacturaDetalle(id_factura, detalles_updates) {
    const idFactura = toPositiveId(id_factura, "id_factura_proveedor");

    if (!Array.isArray(detalles_updates) || detalles_updates.length === 0) {
        throw new Error("Detalles requeridos");
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        let subtotal = 0;

        // Actualizar cada línea
        for (const upd of detalles_updates) {
            const idDetalle = toPositiveId(upd.id_detalle, "id_detalle");
            const cantidad = toPositiveId(upd.cantidad_recibida, "cantidad");
            const costoSinIVA = Number(upd.costo_unitario_sin_iva) || 0;

            if (costoSinIVA < 0) throw new Error("Costo no puede ser negativo");

            const costoConIVA = costoSinIVA * 1.16;
            const subtotalSinIVA = cantidad * costoSinIVA;
            const subtotalConIVA = subtotalSinIVA * 1.16;

            await conn.execute(
                `UPDATE facturas_proveedor_detalle
                SET cantidad_recibida = ?, costo_unitario_sin_iva = ?, costo_unitario_con_iva = ?, subtotal_sin_iva = ?, subtotal_con_iva = ?
                WHERE id_detalle_facturas_proveedor = ? AND id_factura_proveedor = ?`,
                [cantidad, costoSinIVA, costoConIVA, subtotalSinIVA, subtotalConIVA, idDetalle, idFactura]
            );

            subtotal += subtotalSinIVA;
        }

        // Recalcular totales de factura
        const [filaFactura] = await conn.execute(`SELECT descuento FROM facturas_proveedor WHERE id_factura_proveedor = ?`, [idFactura]);
        if (filaFactura.length === 0) throw new Error("Factura no encontrada");

        const descuento = Number(filaFactura[0].descuento) || 0;
        const subtotalConDesc = subtotal - descuento;
        const iva = Math.round(subtotalConDesc * 0.16 * 100) / 100;
        const total = Math.round((subtotalConDesc + iva) * 100) / 100;

        // Obtener saldo pagado actual
        const [pagos] = await conn.execute(`SELECT SUM(monto) AS total_pagado FROM pagos_factura_proveedor WHERE id_factura_proveedor = ?`, [idFactura]);
        const totalPagado = Number(pagos[0]?.total_pagado || 0);
        const saldoPendiente = Math.max(0, Math.round((total - totalPagado) * 100) / 100);

        await conn.execute(
            `UPDATE facturas_proveedor
            SET subtotal = ?, subtotal_con_desc = ?, iva = ?, total = ?, saldo_pendiente = ?
            WHERE id_factura_proveedor = ?`,
            [subtotal, subtotalConDesc, iva, total, saldoPendiente, idFactura]
        );

        await conn.commit();
        return { id_factura: idFactura, total, saldo_pendiente: saldoPendiente };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

// ============================================================
// ELIMINAR LÍNEA DE FACTURA
// ============================================================
export async function deleteLineaFactura(id_detalle) {
    const idDetalle = toPositiveId(id_detalle, "id_detalle");

    const [filasDetalle] = await db.execute(`SELECT id_factura_proveedor FROM facturas_proveedor_detalle WHERE id_detalle_facturas_proveedor = ?`, [idDetalle]);
    if (filasDetalle.length === 0) throw new Error("Línea no encontrada");

    const id_factura = filasDetalle[0].id_factura_proveedor;

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Eliminar línea
        await conn.execute(`DELETE FROM facturas_proveedor_detalle WHERE id_detalle_facturas_proveedor = ?`, [idDetalle]);

        // Recalcular totales
        const [filasDetalles] = await conn.execute(
            `SELECT SUM(subtotal_sin_iva) AS subtotal FROM facturas_proveedor_detalle WHERE id_factura_proveedor = ?`,
            [id_factura]
        );

        let subtotal = Number(filasDetalles[0]?.subtotal || 0);

        const [filaFactura] = await conn.execute(`SELECT descuento FROM facturas_proveedor WHERE id_factura_proveedor = ?`, [id_factura]);
        const descuento = Number(filaFactura[0]?.descuento || 0);
        const subtotalConDesc = subtotal - descuento;
        const iva = Math.round(subtotalConDesc * 0.16 * 100) / 100;
        const total = Math.round((subtotalConDesc + iva) * 100) / 100;

        const [pagos] = await conn.execute(`SELECT SUM(monto) AS total_pagado FROM pagos_factura_proveedor WHERE id_factura_proveedor = ?`, [id_factura]);
        const totalPagado = Number(pagos[0]?.total_pagado || 0);
        const saldoPendiente = Math.max(0, Math.round((total - totalPagado) * 100) / 100);

        await conn.execute(
            `UPDATE facturas_proveedor
            SET subtotal = ?, subtotal_con_desc = ?, iva = ?, total = ?, saldo_pendiente = ?
            WHERE id_factura_proveedor = ?`,
            [subtotal, subtotalConDesc, iva, total, saldoPendiente, id_factura]
        );

        await conn.commit();
        return { success: true };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

// ============================================================
// ELIMINAR FACTURA COMPLETA
// ============================================================
export async function deleteFactura(id_factura) {
    const idFactura = toPositiveId(id_factura, "id_factura_proveedor");

    const [filaFactura] = await db.execute(`SELECT id_orden_compra FROM facturas_proveedor WHERE id_factura_proveedor = ?`, [idFactura]);
    if (filaFactura.length === 0) throw new Error("Factura no encontrada");

    const idOrden = filaFactura[0].id_orden_compra;

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Eliminar factura (cascade elimina detalles y pagos por FK)
        await conn.execute(`DELETE FROM facturas_proveedor WHERE id_factura_proveedor = ?`, [idFactura]);

        // Revertir orden a pendiente si existía
        if (idOrden) {
            await conn.execute(`UPDATE ordenes_compra SET status = 'pendiente' WHERE id_orden_compra = ?`, [idOrden]);
        }

        await conn.commit();
        return { success: true };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}
