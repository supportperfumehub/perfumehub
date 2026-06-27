/**
 * Controller for User domain
 */
export class UserController {
    constructor(userService) {
        this.userService = userService;
    }

    /**
     * GET /api/users
     */
    getAllUsers = async (req, res, next) => {
        try {
            const { role } = req.query;
            const users = await this.userService.getAllUsers({ role });
            res.status(200).json(users);
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/users/:id
     */
    getUserProfile = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (req.user.id.toString() !== id.toString() && req.user.role !== 'super_admin' && req.user.role !== 'admin') {
                return res.status(403).json({ success: false, error: 'Forbidden: Cannot view other profiles' });
            }
            const user = await this.userService.getUserProfile(id);
            res.status(200).json(user);
        } catch (error) {
            next(error);
        }
    };

    /**
     * PUT /api/users/:id
     */
    updateProfile = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (req.user.id.toString() !== id.toString() && req.user.role !== 'super_admin') {
                return res.status(403).json({ success: false, error: 'Forbidden: Cannot update other profiles' });
            }

            const updatedUser = await this.userService.updateUserProfile(id, req.body);
            res.status(200).json({ success: true, user: updatedUser });
        } catch (error) {
            next(error);
        }
    };
}
