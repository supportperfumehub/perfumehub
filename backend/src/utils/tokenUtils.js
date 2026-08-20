import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
    throw new Error('FATAL: JWT Secrets are not defined in environment variables!');
}
const ACCESS_EXPIRE = process.env.ACCESS_TOKEN_EXPIRE || '24h';
const REFRESH_EXPIRE = process.env.REFRESH_TOKEN_EXPIRE || '30d';

/**
 * Generate Access Token (Short-lived)
 */
export const generateAccessToken = (payload) => {
    return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRE });
};

/**
 * Generate Refresh Token (Long-lived)
 */
export const generateRefreshToken = (payload) => {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRE });
};

/**
 * Verify Access Token
 */
export const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, ACCESS_SECRET);
    } catch (error) {
        return null;
    }
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, REFRESH_SECRET);
    } catch (error) {
        return null;
    }
};

/**
 * Extract token from Authorization header
 * Header format: "Bearer <token>"
 */
export const extractTokenFromHeader = (req) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1];
    }
    return null;
};
