/**
 * Controller for Authentication domain
 */
export class AuthController {
    constructor(authService) {
        this.authService = authService;
    }

    /**
     * Helper to set secure refresh token cookie
     */
    setRefreshCookie(res, token) {
        const expiresInDays = 7;
        res.cookie('refreshToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: expiresInDays * 24 * 60 * 60 * 1000
        });
    }

    /**
     * POST /api/auth/register
     */
    register = async (req, res, next) => {
        try {
            const { name, email, password } = req.body;
            // Force role to 'customer' for public registration to prevent privilege escalation
            const user = await this.authService.register(name, email, password, 'customer');
            
            res.status(201).json({
                success: true,
                message: 'Registration successful. Please verify your email.',
                user: { id: user.id, email: user.email }
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/auth/login
     */
    login = async (req, res, next) => {
        try {
            const { email, password } = req.body;
            const result = await this.authService.login(email, password);

            if (result.requires2FA) {
                return res.status(200).json({
                    success: true,
                    requires2FA: true,
                    userId: result.userId,
                    message: 'Please provide 2FA code'
                });
            }

            this.setRefreshCookie(res, result.refreshToken);

            res.status(200).json({
                success: true,
                message: 'Login successful',
                accessToken: result.accessToken,
                user: result.user
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/auth/refresh
     */
    refresh = async (req, res, next) => {
        try {
            const oldToken = req.cookies.refreshToken;
            if (!oldToken) return res.status(401).json({ success: false, error: 'No refresh token' });

            const result = await this.authService.refresh(oldToken);
            
            this.setRefreshCookie(res, result.refreshToken);

            res.status(200).json({
                success: true,
                accessToken: result.accessToken,
                user: result.user
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/auth/logout
     */
    logout = async (req, res, next) => {
        try {
            const token = req.cookies.refreshToken;
            await this.authService.logout(token);
            
            res.clearCookie('refreshToken');
            res.status(200).json({ success: true, message: 'Logout successful' });
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/auth/2fa/verify
     */
    verify2FA = async (req, res, next) => {
        try {
            const { userId, token } = req.body;
            const result = await this.authService.verify2FA(userId, token);

            this.setRefreshCookie(res, result.refreshToken);

            res.status(200).json({
                success: true,
                message: '2FA verified',
                accessToken: result.accessToken,
                user: result.user
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/auth/2fa/setup
     */
    setup2FA = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const result = await this.authService.generate2FASecret(userId);
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/auth/2fa/enable
     */
    enable2FA = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { token } = req.body;
            const result = await this.authService.enable2FA(userId, token);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/auth/forgot-password
     */
    forgotPassword = async (req, res, next) => {
        try {
            const { email } = req.body;
            const result = await this.authService.requestPasswordReset(email);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/auth/reset-password
     */
    resetPassword = async (req, res, next) => {
        try {
            const { token, password } = req.body;
            const result = await this.authService.resetPassword(token, password);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}
