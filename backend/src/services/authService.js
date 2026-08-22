import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/tokenUtils.js';
import { parseUserAgent } from '../utils/deviceParser.js';
import { AppError } from '../middleware/errorHandler.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export class AuthService {
    constructor(userRepository) {
        this.userRepository = userRepository;
        this.lockoutAttempts = parseInt(process.env.LOCKOUT_ATTEMPTS || '5');
        this.lockoutMins = parseInt(process.env.LOCKOUT_DURATION_MINS || '15');
        this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    }

    /**
     * Register a new user
     */
    async register(name, email, password, role = 'customer') {
        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
            throw new AppError('Email already exists', 400);
        }

        const passwordHash = await bcrypt.hash(password, this.bcryptRounds);
        
        // In a real app, generate a verification token and send email
        const verificationToken = Math.random().toString(36).substring(2, 15);

        const newUser = await this.userRepository.create({
            name,
            email,
            password_hash: passwordHash,
            role,
            email_verified: false,
            verification_token: verificationToken
        });

        console.log(`[Email Verification Simulation] Link for ${email}: /verify?token=${verificationToken}`);

        return newUser;
    }

    /**
     * Login User
     */
    async login(email, password, req = null) {
        const user = await this.userRepository.findByEmail(email);

        if (!user) {
            throw new AppError('Invalid credentials', 401);
        }

        // Check Lockout
        if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
            throw new AppError(`Account locked. Try again after ${user.lockout_until}`, 403);
        }

        // Verify Password (Handle legacy plain text if detected)
        let isMatch = false;
        if (user.password_hash) {
            isMatch = await bcrypt.compare(password, user.password_hash);
        } else if (user.password === password) {
            // Lazy migration from plain text
            isMatch = true;
            const newHash = await bcrypt.hash(password, this.bcryptRounds);
            await this.userRepository.update(user.id, { 
                password_hash: newHash,
                password: null // Clear old plain text password
            });
        }

        if (!isMatch) {
            await this.userRepository.incrementFailedAttempts(user.id, user.failed_attempts || 0, this.lockoutMins);
            throw new AppError('Invalid credentials', 401);
        }

        // Reset attempts
        await this.userRepository.resetLoginAttempts(user.id);

        // Check if 2FA is needed
        if (user.two_factor_enabled) {
            return { requires2FA: true, userId: user.id };
        }

        return this.issueTokens(user, req);
    }

    /**
     * Issue Token Pair with Device Metadata
     */
    async issueTokens(user, req = null) {
        const userAgent = req?.headers ? (req.headers['user-agent'] || 'Web Browser') : 'Web Browser';
        const rawIp = req ? (req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1';
        const clientIp = (rawIp || '127.0.0.1').replace('::ffff:', '');
        const deviceInfo = parseUserAgent(userAgent);
        const sessionId = crypto.randomUUID();

        const payload = { 
            id: user.id, 
            email: user.email, 
            role: user.role, 
            shop_id: user.shop_id,
            sessionId 
        };
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken({ 
            id: user.id, 
            version: user.refresh_token_version || 0,
            jti: sessionId,
            sessionId,
            deviceName: deviceInfo.deviceName,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            deviceType: deviceInfo.deviceType,
            ip: clientIp,
            createdAt: new Date().toISOString()
        });

        // Save refresh token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
        await this.userRepository.saveRefreshToken(user.id, refreshToken, expiresAt.toISOString());

        return { 
            accessToken, 
            refreshToken, 
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email, 
                role: user.role, 
                shop_id: user.shop_id 
            } 
        };
    }

    /**
     * Refresh Token Logic (Rotate)
     */
    async refresh(oldRefreshToken, req = null) {
        const decoded = verifyRefreshToken(oldRefreshToken);
        if (!decoded) {
            throw new AppError('Invalid refresh token', 401);
        }

        const user = await this.userRepository.findById(decoded.id);
        if (!user) throw new AppError('User no longer exists', 401);

        const storedToken = await this.userRepository.findRefreshToken(oldRefreshToken);

        // Graceful handling for concurrent requests: if token was recently revoked, return current active session
        if (storedToken && storedToken.is_revoked) {
            const activeToken = await this.userRepository.findActiveUserRefreshToken(user.id);
            if (activeToken && new Date(activeToken.expires_at) > new Date()) {
                const accessToken = generateAccessToken({ 
                    id: user.id, 
                    email: user.email, 
                    role: user.role, 
                    shop_id: user.shop_id,
                    sessionId: decoded.sessionId || decoded.jti 
                });
                return {
                    accessToken,
                    refreshToken: activeToken.token,
                    user: { id: user.id, name: user.name, email: user.email, role: user.role, shop_id: user.shop_id }
                };
            }
            throw new AppError('Session expired. Please log in again.', 401);
        }

        if (storedToken && new Date(storedToken.expires_at) < new Date()) {
            throw new AppError('Expired session', 401);
        }

        // Revoke the old token and issue a new pair
        if (storedToken) {
            await this.userRepository.revokeRefreshToken(oldRefreshToken);
        }
        
        const tokens = await this.issueTokens(user, req);
        return {
            ...tokens,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, shop_id: user.shop_id }
        };
    }

    /**
     * Logout
     */
    async logout(token) {
        if (token) {
            await this.userRepository.revokeRefreshToken(token);
        }
    }

    /**
     * Verify 2FA
     */
    async verify2FA(userId, token, req = null) {
        const user = await this.userRepository.findById(userId);
        if (!user || !user.two_factor_secret) {
            throw new AppError('2FA not enabled', 400);
        }

        const { authenticator } = await import('otplib');
        const isValid = authenticator.check(token, user.two_factor_secret);

        if (!isValid) {
            throw new AppError('Invalid 2FA code', 401);
        }

        return this.issueTokens(user, req);
    }

    /**
     * Generate 2FA Secret
     */
    async generate2FASecret(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) throw new AppError('User not found', 404);

        const { authenticator } = await import('otplib');
        const { default: qrcode } = await import('qrcode');

        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(user.email, 'PerfumeHub', secret);
        const qrCodeUrl = await qrcode.toDataURL(otpauth);

        // Temporarily store secret in user record (not enabled yet)
        await this.userRepository.update(userId, { two_factor_secret: secret });

        return { secret, qrCodeUrl };
    }

    /**
     * Enable 2FA after verification
     */
    async enable2FA(userId, token) {
        const user = await this.userRepository.findById(userId);
        if (!user || !user.two_factor_secret) {
            throw new AppError('2FA setup not initiated', 400);
        }

        const { authenticator } = await import('otplib');
        const isValid = authenticator.check(token, user.two_factor_secret);

        if (!isValid) {
            throw new AppError('Invalid 2FA code. Setup failed.', 401);
        }

        await this.userRepository.update(userId, { two_factor_enabled: true });
        return { success: true, message: '2FA enabled successfully' };
    }

    /**
     * Request Password Reset
     */
    async requestPasswordReset(email) {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            // Return success even if user not found to prevent email enumeration
            return { success: true, message: 'If an account exists, a reset link has been sent.' };
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date();
        expires.setHours(expires.getHours() + 1); // 1 hour expiry

        await this.userRepository.update(user.id, {
            reset_token: token,
            reset_token_expires: expires.toISOString()
        });

        // Simulation: Log reset link
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;
        console.log(`\n[PASSWORD RESET SIMULATION]`);
        console.log(`User: ${email}`);
        console.log(`Link: ${resetUrl}\n`);

        return { success: true, message: 'If an account exists, a reset link has been sent.' };
    }

    /**
     * Reset Password
     */
    async resetPassword(token, newPassword) {
        const user = await this.userRepository.findByResetToken(token);
        
        if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
            throw new AppError('Invalid or expired reset token', 400);
        }

        const passwordHash = await bcrypt.hash(newPassword, this.bcryptRounds);

        await this.userRepository.update(user.id, {
            password_hash: passwordHash,
            reset_token: null,
            reset_token_expires: null,
            failed_attempts: 0,
            lockout_until: null
        });

        return { success: true, message: 'Password has been reset successfully.' };
    }

    /**
     * Google Login via Supabase OAuth verification
     */
    async googleLogin(supabaseToken, req = null) {
        try {
            // 1. Verify token with Supabase
            const response = await axios.get(`${process.env.SUPABASE_URL}/auth/v1/user`, {
                headers: {
                    'apikey': process.env.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${supabaseToken}`
                }
            });

            const supabaseUser = response.data;
            if (!supabaseUser || !supabaseUser.email) {
                throw new AppError('Invalid Google session', 401);
            }

            // 2. Find or Create user in our DB
            let user = await this.userRepository.findByEmail(supabaseUser.email);

            if (!user) {
                // Auto-register new Google user
                user = await this.userRepository.create({
                    name: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
                    email: supabaseUser.email,
                    role: 'customer',
                    email_verified: true, // Google emails are already verified
                    auth_provider: 'google',
                    supabase_id: supabaseUser.id
                });
            }

            // 3. Issue backend tokens
            return this.issueTokens(user, req);
        } catch (error) {
            console.error('AuthService.googleLogin Error:', error.response?.data || error.message);
            throw new AppError('Google verification failed', 401);
        }
    }

    /**
     * Get all active device sessions for a user
     */
    async getUserDevices(userId, currentRefreshToken = null, currentSessionId = null) {
        const tokens = await this.userRepository.findActiveUserRefreshTokens(userId);
        
        const devices = [];
        const seenSessionIds = new Set();

        for (const record of tokens) {
            try {
                // Decode token to extract device payload
                const decoded = verifyRefreshToken(record.token) || jwt.decode(record.token);
                if (!decoded) continue;

                const sessionId = decoded.sessionId || decoded.jti || record.id;
                
                // Deduplicate if identical session
                if (seenSessionIds.has(sessionId)) continue;
                seenSessionIds.add(sessionId);

                const isCurrent = (currentRefreshToken && record.token === currentRefreshToken) ||
                                  (currentSessionId && decoded.sessionId === currentSessionId);

                devices.push({
                    id: record.id,
                    sessionId,
                    deviceName: decoded.deviceName || 'Web Browser',
                    browser: decoded.browser || 'Browser',
                    os: decoded.os || 'Unknown OS',
                    deviceType: decoded.deviceType || 'desktop',
                    ip: decoded.ip || '127.0.0.1',
                    createdAt: decoded.createdAt || record.created_at,
                    expiresAt: record.expires_at,
                    isCurrent: Boolean(isCurrent)
                });
            } catch (err) {
                console.error('Error decoding device session token:', err.message);
            }
        }

        // If no device was matched as current, mark the newest one as current
        if (devices.length > 0 && !devices.some(d => d.isCurrent)) {
            devices[0].isCurrent = true;
        }

        return devices;
    }

    /**
     * Revoke a specific device session
     */
    async revokeDevice(userId, tokenIdOrSessionId) {
        return this.userRepository.revokeUserDevice(userId, tokenIdOrSessionId);
    }

    /**
     * Revoke all other device sessions except current one
     */
    async revokeAllOtherDevices(userId, currentRefreshToken = null, currentSessionId = null) {
        return this.userRepository.revokeAllOtherUserDevices(userId, currentRefreshToken, currentSessionId);
    }
}
