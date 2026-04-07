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
