import db from "@/lib/db";
import { hashPassword } from "@/modules/auth.utils";

const toPositiveId = (value, name = "id") => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} inválido`);
  }

  return parsed;
};

const normalizeRoleIds = (roles) => {
  if (!Array.isArray(roles)) {
    return [];
  }

  return [...new Set(roles.map((roleId) => Number(roleId)).filter((roleId) => Number.isInteger(roleId) && roleId > 0))];
};

const loadUsuarioDetalle = async (usuarioId) => {
  const [rows] = await db.execute(
    `SELECT
      u.id_usuario,
      u.nombre,
      u.email,
      u.activo,
      u.created_at,
      GROUP_CONCAT(DISTINCT ur.id_rol ORDER BY ur.id_rol SEPARATOR ',') AS role_ids,
      GROUP_CONCAT(DISTINCT r.nombre ORDER BY r.nombre SEPARATOR ', ') AS roles
    FROM usuarios u
    LEFT JOIN usuario_roles ur ON ur.id_usuario = u.id_usuario
    LEFT JOIN roles r ON r.id_rol = ur.id_rol
    WHERE u.id_usuario = ?
    GROUP BY u.id_usuario, u.nombre, u.email, u.activo, u.created_at`,
    [usuarioId]
  );

  if (!rows.length) {
    throw new Error("Usuario no encontrado");
  }

  const usuario = rows[0];
  usuario.role_ids = usuario.role_ids ? usuario.role_ids.split(",").map((roleId) => Number(roleId)) : [];

  return usuario;
};

export async function getRoles() {
  const [rows] = await db.execute("SELECT id_rol, nombre FROM roles ORDER BY nombre ASC");
  return rows;
}

export async function getUsuariosConRoles({ search = "" } = {}) {
  let sql = `
    SELECT
      u.id_usuario,
      u.nombre,
      u.email,
      u.activo,
      u.created_at,
      GROUP_CONCAT(DISTINCT ur.id_rol ORDER BY ur.id_rol SEPARATOR ',') AS role_ids,
      GROUP_CONCAT(DISTINCT r.nombre ORDER BY r.nombre SEPARATOR ', ') AS roles
    FROM usuarios u
    LEFT JOIN usuario_roles ur ON ur.id_usuario = u.id_usuario
    LEFT JOIN roles r ON r.id_rol = ur.id_rol
    WHERE 1=1
  `;

  const params = [];

  if (search) {
    sql += " AND (u.nombre LIKE ? OR u.email LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += " GROUP BY u.id_usuario, u.nombre, u.email, u.activo, u.created_at ORDER BY u.id_usuario DESC";

  const [rows] = await db.execute(sql, params);
  return rows;
}

export async function getUsuarioById(id) {
  const usuarioId = toPositiveId(id, "id_usuario");
  return loadUsuarioDetalle(usuarioId);
}

export async function createUsuario({ nombre, email, password, activo = true, roles = [] }) {
  const cleanNombre = String(nombre || "").trim();
  const cleanEmail = String(email || "").trim();
  const cleanPassword = String(password || "").trim();
  const roleIds = normalizeRoleIds(roles);

  if (!cleanNombre) {
    throw new Error("El nombre es requerido");
  }

  if (!cleanEmail) {
    throw new Error("El email es requerido");
  }

  if (!cleanPassword) {
    throw new Error("La contraseña es requerida");
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const passwordHash = await hashPassword(cleanPassword);
    const [result] = await conn.execute(
      `INSERT INTO usuarios (nombre, email, password_hash, activo)
       VALUES (?, ?, ?, ?)`,
      [cleanNombre, cleanEmail, passwordHash, activo ? 1 : 0]
    );

    const id_usuario = result.insertId;

    for (const id_rol of roleIds) {
      await conn.execute(
        `INSERT INTO usuario_roles (id_usuario, id_rol) VALUES (?, ?)`,
        [id_usuario, id_rol]
      );
    }

    await conn.commit();
    return { message: "Usuario creado", id_usuario };
  } catch (error) {
    await conn.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      throw new Error("El email ya está registrado");
    }

    throw error;
  } finally {
    conn.release();
  }
}

export async function updateUsuario(id, { nombre, email, password, activo = true, roles = [] }) {
  const usuarioId = toPositiveId(id, "id_usuario");
  const cleanNombre = String(nombre || "").trim();
  const cleanEmail = String(email || "").trim();
  const cleanPassword = String(password || "").trim();
  const roleIds = normalizeRoleIds(roles);

  if (!cleanNombre) {
    throw new Error("El nombre es requerido");
  }

  if (!cleanEmail) {
    throw new Error("El email es requerido");
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const updateFields = ["nombre = ?", "email = ?", "activo = ?"];
    const updateValues = [cleanNombre, cleanEmail, activo ? 1 : 0];

    if (cleanPassword) {
      updateFields.push("password_hash = ?");
      updateValues.push(await hashPassword(cleanPassword));
    }

    updateValues.push(usuarioId);

    const [result] = await conn.execute(
      `UPDATE usuarios
       SET ${updateFields.join(", ")}
       WHERE id_usuario = ?`,
      updateValues
    );

    if (!result.affectedRows) {
      throw new Error("Usuario no encontrado");
    }

    await conn.execute(`DELETE FROM usuario_roles WHERE id_usuario = ?`, [usuarioId]);

    for (const id_rol of roleIds) {
      await conn.execute(
        `INSERT INTO usuario_roles (id_usuario, id_rol) VALUES (?, ?)`,
        [usuarioId, id_rol]
      );
    }

    await conn.commit();
    return { message: "Usuario actualizado" };
  } catch (error) {
    await conn.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      throw new Error("El email ya está registrado");
    }

    throw error;
  } finally {
    conn.release();
  }
}

export async function deleteUsuario(id) {
  const usuarioId = toPositiveId(id, "id_usuario");
  const [result] = await db.execute(`DELETE FROM usuarios WHERE id_usuario = ?`, [usuarioId]);

  if (!result.affectedRows) {
    throw new Error("Usuario no encontrado");
  }

  return { message: "Usuario eliminado" };
}

export async function getCatalogosClientes() {
  const [giros] = await db.execute(
    `SELECT id_giro, nombre, activo FROM catalogo_giros ORDER BY nombre ASC`
  );

  const [tiposCliente] = await db.execute(
    `SELECT id_tipo_cliente, nombre, nivel_precio, activo
       FROM catalogo_tipos_cliente
       ORDER BY nivel_precio ASC, nombre ASC`
  );

  return { giros, tipos_cliente: tiposCliente };
}

export async function getCatalogosProveedores() {
  const [giros] = await db.execute(
    `SELECT id_giro_proveedor, nombre, activo FROM catalogo_giros_proveedor ORDER BY nombre ASC`
  );

  return { giros };
}

export async function createGiro(nombre) {
  const cleanNombre = String(nombre || "").trim();
  if (!cleanNombre) {
    throw new Error("El nombre del giro es requerido");
  }

  await db.execute(
    `INSERT INTO catalogo_giros (nombre, activo) VALUES (?, 1)`,
    [cleanNombre]
  );

  return { message: "Giro creado" };
}

export async function deleteGiro(id) {
  await db.execute(`DELETE FROM catalogo_giros WHERE id_giro = ?`, [id]);
  return { message: "Giro eliminado" };
}

export async function createTipoCliente({ nombre, nivel_precio }) {
  const cleanNombre = String(nombre || "").trim();
  const nivel = Number(nivel_precio);

  if (!cleanNombre) {
    throw new Error("El nombre del tipo de cliente es requerido");
  }

  if (!Number.isInteger(nivel) || nivel < 1 || nivel > 5) {
    throw new Error("nivel_precio inválido. Debe ser un valor entre 1 y 5");
  }

  await db.execute(
    `INSERT INTO catalogo_tipos_cliente (nombre, nivel_precio, activo) VALUES (?, ?, 1)`,
    [cleanNombre, nivel]
  );

  return { message: "Tipo de cliente creado" };
}

export async function deleteTipoCliente(id) {
  await db.execute(`DELETE FROM catalogo_tipos_cliente WHERE id_tipo_cliente = ?`, [id]);
  return { message: "Tipo de cliente eliminado" };
}

export async function createCatalogoProveedor({ tipo, nombre }) {
  const cleanNombre = String(nombre || "").trim();
  if (!cleanNombre) {
    throw new Error("El nombre es requerido");
  }

  if (tipo !== "giro") {
    throw new Error("Solo el catalogo de giro es configurable");
  }

  await db.execute(
    `INSERT INTO catalogo_giros_proveedor (nombre, activo) VALUES (?, 1)`,
    [cleanNombre]
  );
  return { message: "Giro de proveedor creado" };
}

export async function deleteCatalogoProveedor({ tipo, id }) {
  const catalogoId = Number(id);
  if (!catalogoId) {
    throw new Error("El id es requerido");
  }

  if (tipo !== "giro") {
    throw new Error("Solo el catalogo de giro es configurable");
  }

  await db.execute(`DELETE FROM catalogo_giros_proveedor WHERE id_giro_proveedor = ?`, [catalogoId]);
  return { message: "Giro de proveedor eliminado" };
}
