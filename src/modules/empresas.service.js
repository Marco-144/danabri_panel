import db from "@/lib/db";

function toRequiredText(value, fieldName) {
    const text = String(value || "").trim();
    if (!text) {
        throw new Error(`El campo ${fieldName} es requerido`);
    }
    return text;
}

function toNullableText(value) {
    if (value === undefined || value === null) {
        return null;
    }

    const text = String(value).trim();
    return text || null;
}

function normalizePagoHabitual(value, { strict = false } = {}) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }

    const raw = toNullableText(value);
    if (!raw) {
        return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        if (strict) {
            throw new Error("El campo pago_habitual debe tener formato YYYY-MM-DD");
        }

        return null;
    }

    return raw;
}

function toPositiveInt(value, fieldName) {
    const number = Number(value);
    if (!Number.isInteger(number) || number <= 0) {
        throw new Error(`${fieldName} inválido`);
    }
    return number;
}

function normalizeEmpresaRow(row) {
    return {
        ...row,
        rfc: toNullableText(row.rfc),
        pago_habitual: normalizePagoHabitual(row.pago_habitual),
        cp: String(row.cp || "").trim(),
        direccion: String(row.direccion || "").trim(),
        colonia: String(row.colonia || "").trim(),
        ciudad: String(row.ciudad || "").trim(),
        estado: String(row.estado || "").trim(),
        nombre: String(row.nombre || "").trim(),
        nombre_fiscal: String(row.nombre_fiscal || "").trim(),
    };
}

export async function getEmpresas({
    search = "",
    cp = "",
    hasRfc = "all",
} = {}) {
    let query = `
        SELECT
            id_empresa,
            nombre,
            rfc,
            cp,
            direccion,
            colonia,
            ciudad,
            estado,
            nombre_fiscal,
            pago_habitual,
            created_at
        FROM empresas
        WHERE 1 = 1
    `;

    const params = [];

    if (search) {
        query += " AND (nombre LIKE ? OR nombre_fiscal LIKE ? OR rfc LIKE ? OR cp LIKE ? OR direccion LIKE ? OR colonia LIKE ? OR ciudad LIKE ? OR estado LIKE ?)";
        const wildcard = `%${search}%`;
        params.push(wildcard, wildcard, wildcard, wildcard, wildcard, wildcard, wildcard, wildcard);
    }

    if (cp) {
        query += " AND cp LIKE ?";
        params.push(`%${cp}%`);
    }

    if (hasRfc === "1") {
        query += " AND rfc IS NOT NULL AND TRIM(rfc) <> ''";
    }

    if (hasRfc === "0") {
        query += " AND (rfc IS NULL OR TRIM(rfc) = '')";
    }

    query += " ORDER BY id_empresa DESC";

    const [rows] = await db.execute(query, params);
    return rows.map(normalizeEmpresaRow);
}

export async function getEmpresaById(id) {
    const empresaId = toPositiveInt(id, "id_empresa");

    const [rows] = await db.execute(
        `
        SELECT
            id_empresa,
            nombre,
            rfc,
            cp,
            direccion,
            colonia,
            ciudad,
            estado,
            nombre_fiscal,
            pago_habitual,
            created_at
        FROM empresas
        WHERE id_empresa = ?
        LIMIT 1
        `,
        [empresaId]
    );

    if (!rows.length) {
        throw new Error("Empresa no encontrada");
    }

    return normalizeEmpresaRow(rows[0]);
}

export async function createEmpresa(data) {
    const nombre = toRequiredText(data.nombre, "nombre");
    const cp = toRequiredText(data.cp, "cp");
    const direccion = toRequiredText(data.direccion, "direccion");
    const colonia = toRequiredText(data.colonia, "colonia");
    const ciudad = toRequiredText(data.ciudad, "ciudad");
    const estado = toRequiredText(data.estado, "estado");
    const nombreFiscal = toRequiredText(data.nombre_fiscal, "nombre_fiscal");
    const rfc = toNullableText(data.rfc);
    const pagoHabitual = normalizePagoHabitual(data.pago_habitual, { strict: true });

    const [result] = await db.execute(
        `
        INSERT INTO empresas (nombre, rfc, cp, direccion, colonia, ciudad, estado, nombre_fiscal, pago_habitual)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [nombre, rfc, cp, direccion, colonia, ciudad, estado, nombreFiscal, pagoHabitual]
    );

    return { id_empresa: result.insertId, message: "Empresa creada" };
}

export async function updateEmpresa(id, data) {
    const empresaId = toPositiveInt(id, "id_empresa");
    const fields = [];
    const params = [];

    if (data.nombre !== undefined) {
        fields.push("nombre = ?");
        params.push(toRequiredText(data.nombre, "nombre"));
    }

    if (data.rfc !== undefined) {
        fields.push("rfc = ?");
        params.push(toNullableText(data.rfc));
    }

    if (data.cp !== undefined) {
        fields.push("cp = ?");
        params.push(toRequiredText(data.cp, "cp"));
    }

    if (data.direccion !== undefined) {
        fields.push("direccion = ?");
        params.push(toRequiredText(data.direccion, "direccion"));
    }

    if (data.colonia !== undefined) {
        fields.push("colonia = ?");
        params.push(toRequiredText(data.colonia, "colonia"));
    }

    if (data.ciudad !== undefined) {
        fields.push("ciudad = ?");
        params.push(toRequiredText(data.ciudad, "ciudad"));
    }

    if (data.estado !== undefined) {
        fields.push("estado = ?");
        params.push(toRequiredText(data.estado, "estado"));
    }

    if (data.nombre_fiscal !== undefined) {
        fields.push("nombre_fiscal = ?");
        params.push(toRequiredText(data.nombre_fiscal, "nombre_fiscal"));
    }

    if (data.pago_habitual !== undefined) {
        fields.push("pago_habitual = ?");
        params.push(normalizePagoHabitual(data.pago_habitual, { strict: true }));
    }

    if (!fields.length) {
        throw new Error("No hay datos para actualizar");
    }

    params.push(empresaId);

    const [result] = await db.execute(
        `UPDATE empresas SET ${fields.join(", ")} WHERE id_empresa = ?`,
        params
    );

    if (!result.affectedRows) {
        throw new Error("Empresa no encontrada");
    }

    return { message: "Empresa actualizada" };
}

export async function deleteEmpresa(id) {
    const empresaId = toPositiveInt(id, "id_empresa");

    try {
        const [result] = await db.execute(
            "DELETE FROM empresas WHERE id_empresa = ?",
            [empresaId]
        );

        if (!result.affectedRows) {
            throw new Error("Empresa no encontrada");
        }

        return { message: "Empresa eliminada" };
    } catch (error) {
        if (error?.code === "ER_ROW_IS_REFERENCED_2") {
            throw new Error("No se puede eliminar la empresa porque tiene cotizaciones relacionadas");
        }
        throw error;
    }
}
