import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

export const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id_usuario,
            nombre: user.nombre,
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );
};

export const verifyToken = (token) => {
    if (!token) return null;

    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return null;
    }
};
