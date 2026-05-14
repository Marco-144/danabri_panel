import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import db from "@/lib/db";
import { hashPassword } from "@/modules/auth.utils";

const USER_DOCUMENT_TYPES = [
  { key: "rfc", label: "RFC" },
  { key: "nss", label: "NSS" },
  { key: "acta_nacimiento", label: "Acta de nacimiento" },
  { key: "ine", label: "INE" },
  { key: "comprobante_domicilio", label: "Comprobante de domicilio" },
  { key: "cartas_recomendacion", label: "Cartas de recomendación" },
  { key: "solicitud_empleo", label: "Solicitud de empleo" },
  { key: "contrato", label: "Contrato" },
];

const USER_UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "usuarios");

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

const isFileLike = (value) => value && typeof value === "object" && typeof value.arrayBuffer === "function";

const normalizeUserDocuments = (documents) => {
  if (!documents || typeof documents !== "object") {
    return {};
  }

  return USER_DOCUMENT_TYPES.reduce((accumulator, documentType) => {
    const value = documents[documentType.key];
    if (isFileLike(value)) {
      accumulator[documentType.key] = value;
    }
    return accumulator;
  }, {});
};

function sanitizeFileName(fileName = "archivo") {
  return String(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function saveUserDocumentFile(file, usuarioId, documentKey) {
  const timePart = Date.now();
  const originalName = sanitizeFileName(file.name || `${documentKey}-${timePart}.pdf`);
  const folder = path.join(USER_UPLOAD_ROOT, String(usuarioId));
  await mkdir(folder, { recursive: true });

  const fileName = `${documentKey}-${timePart}-${originalName}`;
  const filePath = path.join(folder, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return {
    tipo_documento: documentKey,
    nombre_original: originalName,
    archivo_url: `/uploads/usuarios/${usuarioId}/${fileName}`,
    archivo_mime: file.type || "application/octet-stream",
  };
}

async function saveUserDocuments(conn, usuarioId, documents = {}) {
  const normalizedDocuments = normalizeUserDocuments(documents);

  for (const [documentKey, file] of Object.entries(normalizedDocuments)) {
    const savedDocument = await saveUserDocumentFile(file, usuarioId, documentKey);
    await conn.execute(
      `INSERT INTO usuario_documentos
        (id_usuario, tipo_documento, nombre_original, archivo_url, archivo_mime)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        nombre_original = VALUES(nombre_original),
        archivo_url = VALUES(archivo_url),
        archivo_mime = VALUES(archivo_mime),
        created_at = CURRENT_TIMESTAMP`,
      [
        usuarioId,
        savedDocument.tipo_documento,
        savedDocument.nombre_original,
        savedDocument.archivo_url,
        savedDocument.archivo_mime,
      ]
    );
  }
}

const loadUsuarioDetalle = async (usuarioId) => {
  const [rows] = await db.execute(
    `SELECT
      u.id_usuario,
      u.nombre,
      u.email,
      u.area,
      u.padecimientos_alergias,
      u.tipo_sangre,
      u.activo,
      u.created_at,
      GROUP_CONCAT(DISTINCT ur.id_rol ORDER BY ur.id_rol SEPARATOR ',') AS role_ids,
      GROUP_CONCAT(DISTINCT r.nombre ORDER BY r.nombre SEPARATOR ', ') AS roles
    FROM usuarios u
    LEFT JOIN usuario_roles ur ON ur.id_usuario = u.id_usuario
    LEFT JOIN roles r ON r.id_rol = ur.id_rol
    WHERE u.id_usuario = ?
    GROUP BY u.id_usuario, u.nombre, u.email, u.area, u.padecimientos_alergias, u.tipo_sangre, u.activo, u.created_at`,
    [usuarioId]
  );

  if (!rows.length) {
    throw new Error("Usuario no encontrado");
  }

  const usuario = rows[0];
  usuario.role_ids = usuario.role_ids ? usuario.role_ids.split(",").map((roleId) => Number(roleId)) : [];

  const [documentRows] = await db.execute(
    `SELECT tipo_documento, nombre_original, archivo_url, archivo_mime
       FROM usuario_documentos
      WHERE id_usuario = ?
      ORDER BY tipo_documento ASC`,
    [usuarioId]
  );

  usuario.documentos = documentRows.reduce((accumulator, documento) => {
    accumulator[documento.tipo_documento] = documento;
    return accumulator;
  }, {});

  return usuario;
};

export async function getRoles() {
  const [rows] = await db.execute("SELECT id_rol, nombre FROM roles ORDER BY nombre ASC");
  return rows;
}

export async function getAreas() {
  try {
    const [rows] = await db.execute(
      `SELECT id_area, nombre, activo, created_at
         FROM areas
        ORDER BY nombre ASC`
    );
    return rows;
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE") {
      return [];
    }
    throw error;
  }
}

export async function createArea({ nombre, activo = true }) {
  const cleanNombre = String(nombre || "").trim();
  if (!cleanNombre) {
    throw new Error("El nombre del area es requerido");
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO areas (nombre, activo) VALUES (?, ?)`,
      [cleanNombre, activo ? 1 : 0]
    );

    return { message: "Area creada", id_area: result.insertId };
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE") {
      throw new Error("La tabla areas no existe. Ejecuta ajustes_configuracion_usuarios.txt");
    }
    if (error?.code === "ER_DUP_ENTRY") {
      throw new Error("Ya existe un area con ese nombre");
    }
    throw error;
  }
}

export async function updateArea(id, { nombre, activo = true }) {
  const idArea = toPositiveId(id, "id_area");
  const cleanNombre = String(nombre || "").trim();
  if (!cleanNombre) {
    throw new Error("El nombre del area es requerido");
  }

  try {
    const [result] = await db.execute(
      `UPDATE areas SET nombre = ?, activo = ? WHERE id_area = ?`,
      [cleanNombre, activo ? 1 : 0, idArea]
    );

    if (!result.affectedRows) {
      throw new Error("Area no encontrada");
    }

    return { message: "Area actualizada" };
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE") {
      throw new Error("La tabla areas no existe. Ejecuta ajustes_configuracion_usuarios.txt");
    }
    if (error?.code === "ER_DUP_ENTRY") {
      throw new Error("Ya existe un area con ese nombre");
    }
    throw error;
  }
}

export async function deleteArea(id) {
  const idArea = toPositiveId(id, "id_area");

  try {
    const [result] = await db.execute(`DELETE FROM areas WHERE id_area = ?`, [idArea]);
    if (!result.affectedRows) {
      throw new Error("Area no encontrada");
    }
    return { message: "Area eliminada" };
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE") {
      throw new Error("La tabla areas no existe. Ejecuta ajustes_configuracion_usuarios.txt");
    }
    if (error?.code === "ER_ROW_IS_REFERENCED_2") {
      throw new Error("No se puede eliminar el area porque esta asignada a roles");
    }
    throw error;
  }
}

export async function createRol({ nombre }) {
  const cleanNombre = String(nombre || "").trim();
  if (!cleanNombre) {
    throw new Error("El nombre del rol es requerido");
  }

  try {
    const [result] = await db.execute(`INSERT INTO roles (nombre) VALUES (?)`, [cleanNombre]);
    return { message: "Rol creado", id_rol: result.insertId };
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      throw new Error("Ya existe un rol con ese nombre");
    }
    throw error;
  }
}

export async function updateRol(id, { nombre }) {
  const idRol = toPositiveId(id, "id_rol");
  const cleanNombre = String(nombre || "").trim();
  if (!cleanNombre) {
    throw new Error("El nombre del rol es requerido");
  }

  try {
    const [result] = await db.execute(`UPDATE roles SET nombre = ? WHERE id_rol = ?`, [cleanNombre, idRol]);
    if (!result.affectedRows) {
      throw new Error("Rol no encontrado");
    }
    return { message: "Rol actualizado" };
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      throw new Error("Ya existe un rol con ese nombre");
    }
    throw error;
  }
}

export async function deleteRol(id) {
  const idRol = toPositiveId(id, "id_rol");

  try {
    const [result] = await db.execute(`DELETE FROM roles WHERE id_rol = ?`, [idRol]);
    if (!result.affectedRows) {
      throw new Error("Rol no encontrado");
    }
    return { message: "Rol eliminado" };
  } catch (error) {
    if (error?.code === "ER_ROW_IS_REFERENCED_2") {
      throw new Error("No se puede eliminar el rol porque esta asignado a usuarios");
    }
    throw error;
  }
}

export async function getRolesConPermisos() {
  const roles = await getRoles();

  try {
    const [rows] = await db.execute(
      `SELECT
        ra.id_rol_area,
        ra.id_rol,
        ra.id_area,
        ra.puede_asignar_usuarios,
        ra.puede_gestionar_permisos,
        a.nombre AS area_nombre
       FROM roles_areas ra
       INNER JOIN areas a ON a.id_area = ra.id_area
       ORDER BY ra.id_rol ASC, a.nombre ASC`
    );

    return roles.map((rol) => ({
      ...rol,
      permisos_por_area: rows
        .filter((item) => item.id_rol === rol.id_rol)
        .map((item) => ({
          id_rol_area: item.id_rol_area,
          id_area: item.id_area,
          area_nombre: item.area_nombre,
          puede_asignar_usuarios: Boolean(item.puede_asignar_usuarios),
          puede_gestionar_permisos: Boolean(item.puede_gestionar_permisos),
        })),
    }));
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE") {
      return roles.map((rol) => ({ ...rol, permisos_por_area: [] }));
    }
    throw error;
  }
}

export async function upsertRolAreaPermisos({
  id_rol,
  id_area,
  puede_asignar_usuarios = false,
  puede_gestionar_permisos = false,
}) {
  const idRol = toPositiveId(id_rol, "id_rol");
  const idArea = toPositiveId(id_area, "id_area");

  try {
    await db.execute(
      `INSERT INTO roles_areas (
          id_rol,
          id_area,
          puede_asignar_usuarios,
          puede_gestionar_permisos
        ) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
          puede_asignar_usuarios = VALUES(puede_asignar_usuarios),
          puede_gestionar_permisos = VALUES(puede_gestionar_permisos)`,
      [idRol, idArea, puede_asignar_usuarios ? 1 : 0, puede_gestionar_permisos ? 1 : 0]
    );

    return { message: "Permisos actualizados" };
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE") {
      throw new Error("Faltan tablas de permisos por area. Ejecuta ajustes_configuracion_usuarios.txt");
    }
    throw error;
  }
}

export async function deleteRolAreaPermisos({ id_rol, id_area }) {
  const idRol = toPositiveId(id_rol, "id_rol");
  const idArea = toPositiveId(id_area, "id_area");

  try {
    await db.execute(
      `DELETE FROM roles_areas WHERE id_rol = ? AND id_area = ?`,
      [idRol, idArea]
    );
    return { message: "Permisos por area eliminados" };
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE") {
      throw new Error("Faltan tablas de permisos por area. Ejecuta ajustes_configuracion_usuarios.txt");
    }
    throw error;
  }
}

export async function getUsuariosConRoles({ search = "" } = {}) {
  let sql = `
    SELECT
      u.id_usuario,
      u.nombre,
      u.email,
      u.area,
      u.tipo_sangre,
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
    sql += " AND (u.nombre LIKE ? OR u.email LIKE ? OR u.area LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += " GROUP BY u.id_usuario, u.nombre, u.email, u.area, u.tipo_sangre, u.activo, u.created_at ORDER BY u.id_usuario DESC";

  const [rows] = await db.execute(sql, params);
  return rows;
}

export async function getUsuarioById(id) {
  const usuarioId = toPositiveId(id, "id_usuario");
  return loadUsuarioDetalle(usuarioId);
}

export async function createUsuario({
  nombre,
  email,
  password,
  activo = true,
  area = "",
  padecimientos_alergias = "",
  tipo_sangre = "",
  roles = [],
  documentos = {},
}) {
  const cleanNombre = String(nombre || "").trim();
  const cleanEmail = String(email || "").trim();
  const cleanPassword = String(password || "").trim();
  const cleanArea = String(area || "").trim();
  const cleanPadecimientos = String(padecimientos_alergias || "").trim();
  const cleanTipoSangre = String(tipo_sangre || "").trim();
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
      `INSERT INTO usuarios (nombre, email, area, padecimientos_alergias, tipo_sangre, password_hash, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cleanNombre, cleanEmail, cleanArea || null, cleanPadecimientos || null, cleanTipoSangre || null, passwordHash, activo ? 1 : 0]
    );

    const id_usuario = result.insertId;

    for (const id_rol of roleIds) {
      await conn.execute(
        `INSERT INTO usuario_roles (id_usuario, id_rol) VALUES (?, ?)`,
        [id_usuario, id_rol]
      );
    }

    await saveUserDocuments(conn, id_usuario, documentos);

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

export async function updateUsuario(id, {
  nombre,
  email,
  password,
  activo = true,
  area = "",
  padecimientos_alergias = "",
  tipo_sangre = "",
  roles = [],
  documentos = {},
}) {
  const usuarioId = toPositiveId(id, "id_usuario");
  const cleanNombre = String(nombre || "").trim();
  const cleanEmail = String(email || "").trim();
  const cleanPassword = String(password || "").trim();
  const cleanArea = String(area || "").trim();
  const cleanPadecimientos = String(padecimientos_alergias || "").trim();
  const cleanTipoSangre = String(tipo_sangre || "").trim();
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

    const updateFields = ["nombre = ?", "email = ?", "area = ?", "padecimientos_alergias = ?", "tipo_sangre = ?", "activo = ?"];
    const updateValues = [cleanNombre, cleanEmail, cleanArea || null, cleanPadecimientos || null, cleanTipoSangre || null, activo ? 1 : 0];

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

    await saveUserDocuments(conn, usuarioId, documentos);

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
