import db from "@/lib/db";
import { recalcularEstadoRemision } from "@/modules/remisiones-clientes.service";

function toPositiveInt(value, fieldName) {
    const number = Number(value);
    if (!Number.isInteger(number) || number <= 0) {
        throw new Error(`${fieldName} invalido`);
    }
    return number;
}

function toMoney(value, fieldName) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`${fieldName} invalido`);
    }
    return Math.round(n * 100) / 100;
}

function toDate(value, fieldName) {
    const text = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        throw new Error(`${fieldName} invalida`);
    }
    return text;
}

export async function getAbonosClientes({ id_remision = "", search = "" } = {}) {
    let sql = `
        SELECT
            p.id_pago,
            p.id_cliente,
            p.id_remision,
            p.monto,
            p.metodo_pago,
            p.fecha_pago,
            r.folio AS folio_remision,
            r.total AS total_remision,
            r.estado AS estado_remision,
            r.facturado,
            c.nombre AS cliente_nombre,
            c.rfc AS cliente_rfc
        FROM pagos p
        INNER JOIN remisiones r ON r.id_remision = p.id_remision
        INNER JOIN clientes c ON c.id_cliente = p.id_cliente
        WHERE 1 = 1
    `;

    const params = [];

    if (id_remision) {
        sql += " AND p.id_remision = ?";
        params.push(toPositiveInt(id_remision, "id_remision"));
    }

    if (search) {
        const q = `%${String(search).trim()}%`;
        sql += " AND (r.folio LIKE ? OR c.nombre LIKE ? OR c.rfc LIKE ? OR p.metodo_pago LIKE ?)";
        params.push(q, q, q, q);
    }

    sql += " ORDER BY p.fecha_pago DESC, p.id_pago DESC";

    const [rows] = await db.execute(sql, params);

    return rows.map((row) => ({
        id_pago: row.id_pago,
        id_cliente: row.id_cliente,
        id_remision: row.id_remision,
        cliente_nombre: row.cliente_nombre,
        cliente_rfc: row.cliente_rfc,
        folio_remision: row.folio_remision,
        total_remision: Number(row.total_remision || 0),
        estado_remision: row.estado_remision,
        facturado: Boolean(row.facturado),
        monto: Number(row.monto || 0),
        metodo_pago: row.metodo_pago,
        fecha_pago: row.fecha_pago,
    }));
}

function addDays(dateStr, days) {
    const d = new Date(dateStr + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split("T")[0];
}

export async function registrarAbonoCliente(payload) {
    const idRemision = toPositiveInt(payload.id_remision, "id_remision");
    const fechaPago = toDate(payload.fecha_pago, "fecha_pago");
    const monto = toMoney(payload.monto, "monto");
    const metodoPago = String(payload.metodo_pago || "transferencia").trim() || "transferencia";

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [[remision]] = await conn.execute(
            `
            SELECT r.id_remision, r.id_cliente, r.total, r.facturado, r.estado, r.created_at,
                   c.credito_habilitado, c.dias_credito
            FROM remisiones r
            INNER JOIN clientes c ON c.id_cliente = r.id_cliente
            WHERE r.id_remision = ?
            FOR UPDATE
            `,
            [idRemision]
        );

        if (!remision) {
            throw new Error("remision no encontrada");
        }

        if (String(remision.estado || "") === "cancelada") {
            throw new Error("la remision esta cancelada");
        }

        // Validar que el pago cumpla con los días de crédito del cliente
        if (remision.credito_habilitado && remision.dias_credito > 0) {
            const remisionDate = String(remision.created_at || "").split(" ")[0];
            const creditDueDate = addDays(remisionDate, remision.dias_credito);
            if (fechaPago < creditDueDate) {
                throw new Error(`el crédito vence el ${creditDueDate} (${remision.dias_credito} días desde la remisión)`);
            }
        }

        const [[sumRow]] = await conn.execute(
            "SELECT COALESCE(SUM(monto), 0) AS total_abonado FROM pagos WHERE id_remision = ?",
            [idRemision]
        );

        const total = Number(remision.total || 0);
        const totalAbonadoActual = Number(sumRow.total_abonado || 0);
        const saldoActual = Math.max(0, Math.round((total - totalAbonadoActual) * 100) / 100);

        if (saldoActual <= 0) {
            throw new Error("la remision ya esta pagada");
        }

        if (monto > saldoActual) {
            throw new Error(`el monto excede el saldo pendiente (${saldoActual.toFixed(2)})`);
        }

        const [insertResult] = await conn.execute(
            `
            INSERT INTO pagos (id_cliente, id_remision, monto, metodo_pago, fecha_pago)
            VALUES (?, ?, ?, ?, ?)
            `,
            [remision.id_cliente, idRemision, monto, metodoPago, fechaPago]
        );

        const resumen = await recalcularEstadoRemision(conn, idRemision);

        await conn.commit();

        return {
            id_pago: insertResult.insertId,
            id_remision: idRemision,
            ...resumen,
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function deleteAbonoCliente(idPago) {
    const id = toPositiveInt(idPago, "id_pago");

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [[pagoRow]] = await conn.execute(
            "SELECT id_pago, id_remision FROM pagos WHERE id_pago = ? FOR UPDATE",
            [id]
        );

        if (!pagoRow) {
            throw new Error("abono no encontrado");
        }

        await conn.execute("DELETE FROM pagos WHERE id_pago = ?", [id]);

        const resumen = await recalcularEstadoRemision(conn, pagoRow.id_remision);

        await conn.commit();

        return {
            id_remision: pagoRow.id_remision,
            ...resumen,
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}
