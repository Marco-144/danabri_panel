import db from '@/lib/db';
import { comparePassword, generateToken } from './auth.utils';

export const loginUser = async (nombre, password) => {
    const [rows] = await db.query(
        'SELECT * FROM usuarios WHERE nombre = ? AND activo = 1',
        [nombre]
    );

    if (rows.length === 0) {
        throw new Error('Usuario no encontrado');
    }

    const user = rows[0];
    const isValid = await comparePassword(password, user.password_hash);

    if (!isValid) {
        throw new Error('Contraseña incorrecta');
    }

    const token = generateToken(user);

    return {
        token,
        user: {
            id: user.id_usuario,
            nombre: user.nombre,
            email: user.email,
        }
    }
};