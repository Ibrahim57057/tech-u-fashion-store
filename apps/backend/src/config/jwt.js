import jwt from 'jsonwebtoken';
import { env } from './env.js';

export function signToken(userId) {
    return jwt.sign({ id: userId }, env.jwtSecret, { expiresIn: '30d' });
}

export function verifyToken(token) {
    return jwt.verify(token, env.jwtSecret);
}