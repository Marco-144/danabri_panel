import db from "@/lib/db";
// Capa de acceso a datos (backend) para tabla clientes.

// Normaliza variantes de tipo_cliente para cumplir enum de la BD.
const normalizeTipoCliente = (value) => {
    if (!value) return value;

    const normalized = String(value).trim().toLowerCase();

    const map = {
        menudeo: "menudeo",
        mayoreo: "mayoreo",
        empresa: "mayoreo",
        gobierno: "mayoreo",
        "persona fisica": "menudeo",
        "persona física": "menudeo",
    };

    return map[normalized] || value;
};

export const getClientes = async (search = "") => {
    // Lista clientes con filtro opcional por nombre o RFC.
    let query = `
        SELECT * FROM clientes
        WHERE 1 = 1
    `;

    const params = [];

    if (search) {
        query += ` AND (nombre LIKE ? OR rfc LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY created_at DESC`;

    const [rows] = await db.execute(query, params);
    return rows;
};

export const getClienteById = async (id) => {
    // Obtiene un cliente por su id primario.
    const [rows] = await db.execute(
        `SELECT * FROM clientes WHERE id_cliente = ?`,
        [id]
    );

    if (rows.length === 0) {
        throw new Error("Cliente no encontrado");
    }

    return rows[0];
};

export const createCliente = async (data) => {
    // Inserta cliente nuevo validando tipo_cliente permitido.
    const {
        nombre,
        tipo_cliente,
        rfc,
        curp,
        uso_cfdi,
        telefono,
        email,
        calle,
        num_exterior,
        num_interior,
        colonia,
        cp,
        ciudad,
        estado,
        pais,
        giro
    } = data;

    const tipoCliente = normalizeTipoCliente(tipo_cliente);

    if (tipoCliente !== "menudeo" && tipoCliente !== "mayoreo") {
        throw new Error("tipo_cliente inválido. Valores permitidos: menudeo, mayoreo");
    }

    const [result] = await db.execute(
        `INSERT INTO clientes (
            nombre, tipo_cliente, rfc, curp, uso_cfdi,
            telefono, email,
            calle, num_exterior, num_interior, colonia, cp, ciudad, estado, pais,
            giro
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            nombre,
            tipoCliente,
            rfc,
            curp,
            uso_cfdi,
            telefono,
            email,
            calle,
            num_exterior,
            num_interior || null,
            colonia,
            cp,
            ciudad,
            estado,
            pais || "México",
            giro
        ]
    );

    return { id: result.insertId };
};

export const updateCliente = async (id, data) => {
    // Actualiza dinamicamente solo los campos recibidos.
    const fields = [];
    const params = [];

    Object.entries(data).forEach(([key, value]) => {
        if (key === "tipo_cliente") {
            value = normalizeTipoCliente(value);
            if (value !== "menudeo" && value !== "mayoreo") {
                throw new Error("tipo_cliente inválido. Valores permitidos: menudeo, mayoreo");
            }
        }

        fields.push(`${key} = ?`);
        params.push(value);
    });

    if (fields.length === 0) {
        throw new Error("No hay datos para actualizar");
    }

    params.push(id);

    await db.execute(
        `UPDATE clientes SET ${fields.join(", ")} WHERE id_cliente = ?`,
        params
    );

    return { message: "Cliente actualizado" };
}

export const deleteCliente = async (id) => {
    // Elimina el cliente de forma fisica en base de datos.
    await db.query(
        `DELETE FROM clientes WHERE id_cliente = ?`,
        [id]
    );

    return { message: "Cliente eliminado" };
}