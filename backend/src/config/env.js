import dotenv from 'dotenv';
dotenv.config();

export const config = {
    server: {
        port: parseInt(process.env.PORT, 10) || 4000,
        nodeEnv: process.env.NODE_ENV || 'development',
        isProduction: process.env.NODE_ENV === 'production',
        appUrl: process.env.APP_URL || 'http://localhost:4000',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
    },
    supabase: {
        url: process.env.SUPABASE_URL || '',
        anonKey: process.env.SUPABASE_ANON_KEY || '',
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    },
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || 'default_jwt_access_secret_for_development',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'default_jwt_refresh_secret_for_development',
        accessExpire: process.env.ACCESS_TOKEN_EXPIRE || '15m',
        refreshExpire: process.env.REFRESH_TOKEN_EXPIRE || '7d'
    },
    security: {
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
        lockoutAttempts: parseInt(process.env.LOCKOUT_ATTEMPTS, 10) || 5,
        lockoutDurationMins: parseInt(process.env.LOCKOUT_DURATION_MINS, 10) || 15
    }
};

export default config;
