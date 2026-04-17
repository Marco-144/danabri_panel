import db from "@/lib/db";

// ============================================================
// OBTENER ALERTAS DEL DÍA (vencidas + próximas 5 días)
// ============================================================
export async function getAlertasDelDia() {
    const hoy = new Date().toISOString().slice(0, 10);
    const hoyMas5Dias = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const sql = `
        SELECT
            fp.id_factura_proveedor AS id_factura,
            fp.folio_factura,
            fp.fecha_vencimiento,
            fp.total,
            fp.saldo_pendiente,
            fp.estado_pago,
            p.nombre AS proveedor_nombre,
            DATEDIFF(?, fp.fecha_vencimiento) AS dias_diferencia,
            CASE
                WHEN fp.fecha_vencimiento < ? AND fp.saldo_pendiente > 0 THEN 'vencida'
                WHEN fp.fecha_vencimiento BETWEEN ? AND ? AND fp.saldo_pendiente > 0 THEN 'proximo'
            END AS tipo_alerta
        FROM facturas_proveedor fp
        INNER JOIN proveedores p ON p.id_proveedor = fp.id_proveedor
        WHERE fp.estado_pago IN ('pendiente', 'parcial')
            AND (
                (fp.fecha_vencimiento < ? AND fp.saldo_pendiente > 0)
                OR (fp.fecha_vencimiento BETWEEN ? AND ? AND fp.saldo_pendiente > 0)
            )
        ORDER BY FIELD(tipo_alerta, 'vencida') DESC, fp.fecha_vencimiento ASC
    `;

    const [alertas] = await db.execute(sql, [hoy, hoy, hoy, hoyMas5Dias, hoy, hoy, hoyMas5Dias]);

    // Agrupar y contar
    const vencidas = alertas.filter((a) => a.tipo_alerta === "vencida");
    const proximas = alertas.filter((a) => a.tipo_alerta === "proximo");

    const totalVencidas = vencidas.length;
    const totalProximas = proximas.length;
    const montoTotalPendiente = alertas.reduce((sum, a) => sum + Number(a.saldo_pendiente || 0), 0);

    return {
        vencidas,
        proximas,
        resumen: {
            total_vencidas: totalVencidas,
            total_proximas: totalProximas,
            monto_total_pendiente: montoTotalPendiente,
            fecha_snapshot: new Date().toISOString(),
        },
    };
}

// ============================================================
// GENERAR SNAPSHOT DIARIO (para reporte asincrónico)
// ============================================================
export async function generarSnapshotAlertasDelDia() {
    const hoy = new Date().toISOString().slice(0, 10);
    const hoyMas5Dias = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Limpiar alertas anteriores del día
        await conn.execute(`DELETE FROM alertas_pagos_factura WHERE snapshot_date < ?`, [hoy]);

        // Facturas vencidas
        const [vencidas] = await conn.execute(
            `SELECT id_factura_proveedor, DATEDIFF(?, fp.fecha_vencimiento) AS dias FROM facturas_proveedor fp
            WHERE fp.fecha_vencimiento < ? AND fp.saldo_pendiente > 0 AND fp.estado_pago IN ('pendiente', 'parcial')`,
            [hoy, hoy]
        );

        for (const { id_factura_proveedor, dias } of vencidas) {
            await conn.execute(
                `INSERT INTO alertas_pagos_factura (id_factura_proveedor, tipo_alerta, dias_vencimiento, snapshot_date)
                VALUES (?, 'vencida', ?, ?)
                ON DUPLICATE KEY UPDATE dias_vencimiento = ?, snapshot_date = ?`,
                [id_factura_proveedor, Math.abs(dias), hoy, Math.abs(dias), hoy]
            );
        }

        // Facturas próximas a vencer (próximos 5 días)
        const [proximas] = await conn.execute(
            `SELECT id_factura_proveedor, DATEDIFF(?, fp.fecha_vencimiento) AS dias FROM facturas_proveedor fp
            WHERE fp.fecha_vencimiento BETWEEN ? AND ? AND fp.saldo_pendiente > 0 AND fp.estado_pago IN ('pendiente', 'parcial')`,
            [hoy, hoy, hoyMas5Dias]
        );

        for (const { id_factura_proveedor, dias } of proximas) {
            await conn.execute(
                `INSERT INTO alertas_pagos_factura (id_factura_proveedor, tipo_alerta, dias_vencimiento, snapshot_date)
                VALUES (?, 'proximo_5_dias', ?, ?)
                ON DUPLICATE KEY UPDATE dias_vencimiento = ?, snapshot_date = ?`,
                [id_factura_proveedor, dias, hoy, dias, hoy]
            );
        }

        await conn.commit();
        return { success: true, snapshot_date: hoy };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

// ============================================================
// OBTENER KPIs DE PAGOS
// ============================================================
export async function getKpisPagos() {
    const hoy = new Date().toISOString().slice(0, 10);

    const [[kpis]] = await db.execute(
        `SELECT
            COUNT(*) AS total_facturas,
            COALESCE(SUM(total), 0) AS total_monto,
            COALESCE(SUM(CASE WHEN estado_pago = 'pagada' THEN total ELSE 0 END), 0) AS total_pagado,
            COALESCE(SUM(saldo_pendiente), 0) AS total_pendiente,
            COALESCE(SUM(CASE WHEN fecha_vencimiento < ? AND saldo_pendiente > 0 THEN 1 ELSE 0 END), 0) AS facturas_vencidas,
            COALESCE(SUM(CASE WHEN fecha_vencimiento >= ? AND estado_pago IN ('pendiente', 'parcial') THEN 1 ELSE 0 END), 0) AS facturas_pendientes
        FROM facturas_proveedor`,
        [hoy, hoy]
    );

    return kpis;
}

// ============================================================
// OBTENER ALERTAS PRÓXIMAS A VENCER (rango flexible)
// ============================================================
export async function getAlertasVencidasYProximas(diasAdelante = 5) {
    const hoy = new Date().toISOString().slice(0, 10);
    const futuro = new Date(Date.now() + diasAdelante * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const sql = `
        SELECT
            fp.id_factura_proveedor AS id_factura,
            fp.folio_factura,
            fp.fecha_vencimiento,
            fp.total,
            fp.saldo_pendiente,
            p.nombre AS proveedor_nombre,
            DATEDIFF(?, fp.fecha_vencimiento) AS dias_desde_hoy,
            CASE
                WHEN fp.fecha_vencimiento < ? THEN 'vencida'
                WHEN fp.fecha_vencimiento = ? THEN 'hoy'
                WHEN fp.fecha_vencimiento <= ? THEN 'proximo'
            END AS estado_vencimiento
        FROM facturas_proveedor fp
        INNER JOIN proveedores p ON p.id_proveedor = fp.id_proveedor
        WHERE fp.estado_pago IN ('pendiente', 'parcial')
            AND fp.saldo_pendiente > 0
            AND (fp.fecha_vencimiento <= ? OR fp.fecha_vencimiento <= ?)
        ORDER BY FIELD(estado_vencimiento, 'vencida', 'hoy', 'proximo') DESC, fp.fecha_vencimiento ASC
    `;

    const [alertas] = await db.execute(sql, [hoy, hoy, hoy, futuro, futuro, futuro]);
    return alertas;
}
