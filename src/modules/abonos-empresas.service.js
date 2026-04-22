import db from "@/lib/db";

function toPositiveInt(value, fieldName) {
    const number = Number(value);
    if (!Number.isInteger(number) || number <= 0) {
        throw new Error(`${fieldName} invalido`);
    }
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
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
        throw new Error(`${fieldName} invalido`);
    }
    return Math.round(n * 100) / 100;
}

export async function getAbonosEmpresas({ id_remision_empresa = "", search = "" } = {}) {
    let sql = `
        SELECT
            are.id_abono_remision_empresa,
            are.id_remision_empresa,
            are.id_usuario,
            are.fecha_abono,
            are.monto,
            are.metodo_pago,
            are.referencia_pago,
            are.observaciones,
            are.created_at,
            re.folio_remision,
            re.folio_factura,
            re.total_con_iva,
            re.saldo_pendiente,
            re.estado_pago,
            re.facturada,
            e.nombre AS empresa_nombre,
            u.nombre AS usuario_nombre
        FROM abonos_remision_empresa are
        INNER JOIN remisiones_empresa re ON re.id_remision_empresa = are.id_remision_empresa
        INNER JOIN empresas e ON e.id_empresa = re.id_empresa
        LEFT JOIN usuarios u ON u.id_usuario = are.id_usuario
        WHERE 1 = 1
    `;

    const params = [];

    if (id_remision_empresa) {
        sql += " AND are.id_remision_empresa = ?";
        params.push(toPositiveInt(id_remision_empresa, "id_remision_empresa"));
    }

    if (search) {
        const q = `%${search}%`;
        sql += " AND (re.folio_remision LIKE ? OR re.folio_factura LIKE ? OR e.nombre LIKE ? OR are.referencia_pago LIKE ?)";
        params.push(q, q, q, q);
    }

    sql += " ORDER BY are.fecha_abono DESC, are.id_abono_remision_empresa DESC";

    const [rows] = await db.execute(sql, params);
    return rows.map((row) => ({
        id_abono_remision_empresa: row.id_abono_remision_empresa,
        id_remision_empresa: row.id_remision_empresa,
        id_usuario: row.id_usuario,
        usuario_nombre: row.usuario_nombre,
        fecha_abono: row.fecha_abono,
        monto: Number(row.monto || 0),
        metodo_pago: row.metodo_pago,
        referencia_pago: row.referencia_pago,
        observaciones: row.observaciones,
        created_at: row.created_at,
        folio_remision: row.folio_remision,
        folio_factura: row.folio_factura,
        total_con_iva: Number(row.total_con_iva || 0),
        saldo_pendiente: Number(row.saldo_pendiente || 0),
        estado_pago: row.estado_pago,
        facturada: Boolean(row.facturada),
        empresa_nombre: row.empresa_nombre,
    }));
}

export async function registrarAbonoEmpresa(payload) {
    const idRemision = toPositiveInt(payload.id_remision_empresa, "id_remision_empresa");
    const fechaAbono = toDate(payload.fecha_abono, "fecha_abono");
    const monto = toMoney(payload.monto, "monto");
    const metodoPago = String(payload.metodo_pago || "").trim() || "transferencia";
    const referencia = String(payload.referencia_pago || "").trim() || null;
    const observaciones = String(payload.observaciones || payload.observaciones_pago || "").trim() || null;
    const idUsuario = payload.id_usuario ? toPositiveInt(payload.id_usuario, "id_usuario") : null;

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [remRows] = await conn.execute(
            `
            SELECT id_remision_empresa, facturada, total_con_iva, saldo_pendiente, estado_pago
            FROM remisiones_empresa
            WHERE id_remision_empresa = ?
            FOR UPDATE
            `,
            [idRemision]
        );

        if (!remRows.length) throw new Error("remision no encontrada");

        const remision = remRows[0];
        if (!Number(remision.facturada)) {
            throw new Error("la remision debe estar facturada para registrar abonos");
        }

        const saldoPendiente = Number(remision.saldo_pendiente || 0);
        if (saldoPendiente <= 0) {
            throw new Error("la remision ya esta pagada");
        }

        if (monto > saldoPendiente) {
            throw new Error(`el monto excede el saldo pendiente (${saldoPendiente.toFixed(2)})`);
        }

        const [ins] = await conn.execute(
            `
            INSERT INTO abonos_remision_empresa (
                id_remision_empresa,
                id_usuario,
                fecha_abono,
                monto,
                metodo_pago,
                referencia_pago,
                observaciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [idRemision, idUsuario, fechaAbono, monto, metodoPago, referencia, observaciones]
        );

        const [[sumRow]] = await conn.execute(
            "SELECT COALESCE(SUM(monto), 0) AS total_abonado FROM abonos_remision_empresa WHERE id_remision_empresa = ?",
            [idRemision]
        );

        const totalAbonado = Number(sumRow.total_abonado || 0);
        const total = Number(remision.total_con_iva || 0);
        const nuevoSaldo = Math.max(0, Math.round((total - totalAbonado) * 100) / 100);

        let nuevoEstado = "pendiente";
        if (nuevoSaldo === 0) nuevoEstado = "pagada";
        else if (totalAbonado > 0) nuevoEstado = "parcial";

        await conn.execute(
            `
            UPDATE remisiones_empresa
            SET saldo_pendiente = ?, estado_pago = ?, updated_at = NOW()
            WHERE id_remision_empresa = ?
            `,
            [nuevoSaldo, nuevoEstado, idRemision]
        );

        await conn.commit();
        return {
            id_abono_remision_empresa: ins.insertId,
            id_remision_empresa: idRemision,
            saldo_pendiente: nuevoSaldo,
            estado_pago: nuevoEstado,
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

export async function deleteAbonoEmpresa(idAbono) {
    const id = toPositiveInt(idAbono, "id_abono_remision_empresa");

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [abRows] = await conn.execute(
            `
            SELECT id_abono_remision_empresa, id_remision_empresa
            FROM abonos_remision_empresa
            WHERE id_abono_remision_empresa = ?
            FOR UPDATE
            `,
            [id]
        );

        if (!abRows.length) throw new Error("abono no encontrado");

        const idRemision = abRows[0].id_remision_empresa;

        await conn.execute(
            "DELETE FROM abonos_remision_empresa WHERE id_abono_remision_empresa = ?",
            [id]
        );

        const [[remRow]] = await conn.execute(
            `
            SELECT total_con_iva
            FROM remisiones_empresa
            WHERE id_remision_empresa = ?
            FOR UPDATE
            `,
            [idRemision]
        );

        if (!remRow) throw new Error("remision no encontrada");

        const [[sumRow]] = await conn.execute(
            "SELECT COALESCE(SUM(monto), 0) AS total_abonado FROM abonos_remision_empresa WHERE id_remision_empresa = ?",
            [idRemision]
        );

        const totalAbonado = Number(sumRow.total_abonado || 0);
        const total = Number(remRow.total_con_iva || 0);
        const nuevoSaldo = Math.max(0, Math.round((total - totalAbonado) * 100) / 100);

        let nuevoEstado = "pendiente";
        if (nuevoSaldo === 0) nuevoEstado = "pagada";
        else if (totalAbonado > 0) nuevoEstado = "parcial";

        await conn.execute(
            `
            UPDATE remisiones_empresa
            SET saldo_pendiente = ?, estado_pago = ?, updated_at = NOW()
            WHERE id_remision_empresa = ?
            `,
            [nuevoSaldo, nuevoEstado, idRemision]
        );

        await conn.commit();

        return {
            success: true,
            id_remision_empresa: idRemision,
            saldo_pendiente: nuevoSaldo,
            estado_pago: nuevoEstado,
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}
