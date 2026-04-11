import db from "@/lib/db";

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
      GROUP_CONCAT(r.nombre ORDER BY r.nombre SEPARATOR ', ') AS roles
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
