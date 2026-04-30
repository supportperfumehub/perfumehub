import { AppError } from '../middleware/errorHandler.js';

export class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async getAllUsers(filters = {}) {
        // Implement filtering logic if needed (repo level)
        // For now, using repo's find all logic (need to add to repo)
        const users = await this.userRepository.findAll(filters);
        return users.map(u => {
            const { password, password_hash, ...safeUser } = u;
            return safeUser;
        });
    }

    async getUserProfile(id) {
        const user = await this.userRepository.findByIdWithShops(id);
        if (!user) throw new AppError('User not found', 404);

        const { password, password_hash, ...safeUser } = user;
        return safeUser;
    }

    async updateUserProfile(id, updates) {
        // Prevent sensitive field updates via general profile route
        const forbidden = ['role', 'password_hash', 'id', 'email_verified'];
        forbidden.forEach(key => delete updates[key]);

        return this.userRepository.update(id, updates);
    }
}
