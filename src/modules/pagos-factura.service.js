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

// ============================================================
// REGISTRAR PAGO PARCIAL O TOTAL
// ============================================================
export async function registrarPagoFactura(id_factura, data) {
    const idFactura = toPositiveId(id_factura, "id_factura_proveedor");
    const fechaPago = fmtDate(data.fecha_pago);
    const monto = Number(data.monto) || 0;
    const metodoPago = toNullableString(data.metodo_pago) || "transferencia";
    const referencia = toNullableString(data.referencia_pago);
    const observaciones = toNullableString(data.observaciones_pago);

    if (!fechaPago) throw new Error("Fecha de pago obligatoria");
    if (monto <= 0) throw new Error("Monto debe ser mayor a 0");

    // Obtener factura
    const [filaFactura] = await db.execute(
        `SELECT id_factura_proveedor, saldo_pendiente, total, id_orden_compra, id_almacen, inventario_cerrado_at FROM facturas_proveedor WHERE id_factura_proveedor = ?`,
        [idFactura]
    );

    if (filaFactura.length === 0) throw new Error("Factura no encontrada");
    const factura = filaFactura[0];
    const saldoPendiente = Number(factura.saldo_pendiente);

    if (monto > saldoPendiente) {
        throw new Error(`Monto excede saldo pendiente ($${saldoPendiente.toFixed(2)})`);
    }

    if (factura.inventario_cerrado_at) {
        throw new Error("La factura ya fue cerrada y no admite más pagos");
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Registrar pago
        await conn.execute(
            `INSERT INTO pagos_factura_proveedor
                (id_factura_proveedor, id_usuario, fecha_pago, monto, metodo_pago, referencia_pago, observaciones_pago)
            VALUES (?, NULL, ?, ?, ?, ?, ?)`,
            [idFactura, fechaPago, monto, metodoPago, referencia, observaciones]
        );

        // Calcular nuevo saldo
        const [pagos] = await conn.execute(
            `SELECT SUM(monto) AS total_pagado FROM pagos_factura_proveedor WHERE id_factura_proveedor = ?`,
            [idFactura]
        );

        const totalPagado = Number(pagos[0]?.total_pagado || 0);
        const nuevoSaldo = Math.max(0, Math.round((Number(factura.total) - totalPagado) * 100) / 100);

        // Determinar nuevo estado
        let nuevoEstado = "pendiente";
        if (nuevoSaldo === 0) {
            nuevoEstado = "pagada";
        } else if (totalPagado > 0) {
            nuevoEstado = "parcial";
        }

        // Actualizar factura
        await conn.execute(
            `UPDATE facturas_proveedor SET saldo_pendiente = ?, estado_pago = ? WHERE id_factura_proveedor = ?`,
            [nuevoSaldo, nuevoEstado, idFactura]
        );

        await conn.commit();
        return { id_factura: idFactura, saldo_pendiente: nuevoSaldo, estado_pago: nuevoEstado };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

// ============================================================
// OBTENER PAGOS DE UNA FACTURA
// ============================================================
export async function getPagosByFactura(id_factura) {
    const idFactura = toPositiveId(id_factura, "id_factura_proveedor");

    const [pagos] = await db.execute(
        `SELECT
            id_pagos_factura_proveedor AS id_pago,
            fecha_pago,
            monto,
            metodo_pago,
            referencia_pago,
            observaciones_pago,
            created_at
        FROM pagos_factura_proveedor
        WHERE id_factura_proveedor = ?
        ORDER BY fecha_pago ASC`,
        [idFactura]
    );

    return pagos;
}

// ============================================================
// ELIMINAR PAGO (REVERSAR)
// ============================================================
export async function deletePago(id_pago) {
    const idPago = toPositiveId(id_pago, "id_pagos_factura_proveedor");

    const [filaPago] = await db.execute(
        `SELECT id_factura_proveedor, monto FROM pagos_factura_proveedor WHERE id_pagos_factura_proveedor = ?`,
        [idPago]
    );

    if (filaPago.length === 0) throw new Error("Pago no encontrado");
    const { id_factura_proveedor, monto } = filaPago[0];

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Eliminar pago
        await conn.execute(`DELETE FROM pagos_factura_proveedor WHERE id_pagos_factura_proveedor = ?`, [idPago]);

        // Recalcular saldo de factura
        const [filaFactura] = await conn.execute(
            `SELECT total, id_orden_compra, inventario_cerrado_at FROM facturas_proveedor WHERE id_factura_proveedor = ?`,
            [id_factura_proveedor]
        );

        if (filaFactura.length === 0) throw new Error("Factura no encontrada");

        if (filaFactura[0].inventario_cerrado_at) {
            throw new Error("No puedes eliminar pagos de una factura cerrada");
        }

        const totalFactura = Number(filaFactura[0].total);

        const [pagos] = await conn.execute(
            `SELECT SUM(monto) AS total_pagado FROM pagos_factura_proveedor WHERE id_factura_proveedor = ?`,
            [id_factura_proveedor]
        );

        const totalPagado = Number(pagos[0]?.total_pagado || 0);
        const nuevoSaldo = Math.max(0, Math.round((totalFactura - totalPagado) * 100) / 100);

        let nuevoEstado = "pendiente";
        if (nuevoSaldo === 0) {
            nuevoEstado = "pagada";
        } else if (totalPagado > 0) {
            nuevoEstado = "parcial";
        }

        // Actualizar factura
        await conn.execute(
            `UPDATE facturas_proveedor SET saldo_pendiente = ?, estado_pago = ? WHERE id_factura_proveedor = ?`,
            [nuevoSaldo, nuevoEstado, id_factura_proveedor]
        );

        // Si se estaba en "pagada" y ahora no, revertir inventario
        const [filaEstadoAnterior] = await conn.execute(
            `SELECT estado_pago FROM facturas_proveedor WHERE id_factura_proveedor = ?`,
            [id_factura_proveedor]
        );

        // Nota: Por ahora dejamos esto como auditoría. Reversas de inventario es mejor hacerlo manual.
        // Si implementas, debes restar stock y crear movimiento de salida.

        await conn.commit();
        return { success: true, saldo_pendiente: nuevoSaldo, estado_pago: nuevoEstado };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

// ============================================================
// CERRAR FACTURA Y APLICAR AL INVENTARIO
// ============================================================
export async function cerrarFacturaInventario(id_factura) {
    const idFactura = toPositiveId(id_factura, "id_factura_proveedor");

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [filasFactura] = await conn.execute(
            `SELECT id_factura_proveedor, saldo_pendiente, total, id_orden_compra, id_almacen, inventario_cerrado_at
             FROM facturas_proveedor
             WHERE id_factura_proveedor = ?
             FOR UPDATE`,
            [idFactura]
        );

        if (filasFactura.length === 0) throw new Error("Factura no encontrada");

        const factura = filasFactura[0];
        if (factura.inventario_cerrado_at) throw new Error("La factura ya fue cerrada");

        if (Number(factura.saldo_pendiente || 0) > 0) {
            throw new Error("La factura debe estar pagada por completo para cerrarse");
        }

        const [detalles] = await conn.execute(
            `SELECT id_presentacion, cantidad_recibida FROM facturas_proveedor_detalle WHERE id_factura_proveedor = ?`,
            [idFactura]
        );

        if (detalles.length === 0) throw new Error("La factura no tiene detalles para inventario");

        for (const detalle of detalles) {
            const idPresentacion = toPositiveId(detalle.id_presentacion, "id_presentacion");
            const cantidad = toPositiveId(detalle.cantidad_recibida, "cantidad_recibida");

            const [invRegs] = await conn.execute(
                `SELECT id_inventario FROM inventario WHERE id_presentacion = ? AND id_almacen = ? FOR UPDATE`,
                [idPresentacion, factura.id_almacen]
            );

            if (invRegs.length === 0) {
                await conn.execute(
                    `INSERT INTO inventario (id_almacen, id_presentacion, stock) VALUES (?, ?, ?)`,
                    [factura.id_almacen, idPresentacion, cantidad]
                );
            } else {
                await conn.execute(
                    `UPDATE inventario SET stock = stock + ? WHERE id_presentacion = ? AND id_almacen = ?`,
                    [cantidad, idPresentacion, factura.id_almacen]
                );
            }

            const idOrigen = idFactura;
            await conn.execute(
                `INSERT INTO movimientos_inventario
                    (id_almacen, id_presentacion, tipo, cantidad, origen, id_origen)
                 VALUES (?, ?, 'entrada', ?, 'compra', ?)`,
                [factura.id_almacen, idPresentacion, cantidad, idOrigen]
            );
        }

        await conn.execute(
            `UPDATE facturas_proveedor
             SET inventario_cerrado_at = NOW(), estado_pago = 'pagada', saldo_pendiente = 0
             WHERE id_factura_proveedor = ?`,
            [idFactura]
        );

        await conn.commit();
        return { success: true, inventario_cerrado_at: new Date().toISOString() };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

// ============================================================
// CANCELAR FACTURA (no agrega inventario)
// ============================================================
export async function cancelarFactura(id_factura) {
    const idFactura = toPositiveId(id_factura, "id_factura_proveedor");

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [filaFactura] = await conn.execute(
            `SELECT id_orden_compra FROM facturas_proveedor WHERE id_factura_proveedor = ?`,
            [idFactura]
        );

        if (filaFactura.length === 0) throw new Error("Factura no encontrada");

        // Marcar factura como cancelada (por ahora no existe estado "cancelada" en tabla, pero podemos agregar)
        // De momento la eliminamos o ponemos un flag
        await conn.execute(`DELETE FROM facturas_proveedor WHERE id_factura_proveedor = ?`, [idFactura]);

        // Cancelar orden también
        if (filaFactura[0].id_orden_compra) {
            await conn.execute(
                `UPDATE ordenes_compra SET status = 'cancelada' WHERE id_orden_compra = ?`,
                [filaFactura[0].id_orden_compra]
            );
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
