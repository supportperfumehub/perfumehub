import { UserService } from '../backend/src/services/userService.js';
import fs from 'fs';
import path from 'path';

async function runAvatarVerification() {
    console.log('--- 🧪 STARTING AVATAR ELEVATION VERIFICATION ---');

    // 1. Mock UserRepository to test UserService dual persistence & update flow
    const testUserId = 'test_vendor_user_42';
    const mockDb = {
        [testUserId]: {
            id: testUserId,
            name: 'Ahmed Al-Boutique',
            email: 'ahmed@perfumehub.qa',
            role: 'vendor',
            avatar_url: null,
            password_hash: 'secret'
        }
    };

    const mockUserRepo = {
        findByIdWithShops: async (id) => mockDb[id] ? { ...mockDb[id] } : null,
        findById: async (id) => mockDb[id] ? { ...mockDb[id] } : null,
        update: async (id, updates) => {
            if (!mockDb[id]) throw new Error('Not found');
            Object.assign(mockDb[id], updates);
            return { ...mockDb[id] };
        },
        findAll: async () => Object.values(mockDb).map(u => ({ ...u }))
    };

    const userService = new UserService(mockUserRepo);

    // Test 1: Initial state (no avatar)
    console.log('\nStep 1: Check initial user profile');
    const initialProfile = await userService.getUserProfile(testUserId);
    console.log('Initial avatar_url:', initialProfile.avatar_url);
    if (initialProfile.avatar_url !== null) {
        throw new Error('Initial avatar should be null');
    }
    console.log('✅ Initial state verified.');

    // Test 2: Update with avatar URL
    console.log('\nStep 2: Update user with new avatar URL');
    const testAvatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
    const updated = await userService.updateUserProfile(testUserId, { avatar_url: testAvatarUrl });
    console.log('Updated user avatar_url:', updated.avatar_url);
    if (updated.avatar_url !== testAvatarUrl) {
        throw new Error('Updated avatar does not match expected URL');
    }
    console.log('✅ Update user profile returned correct avatar_url.');

    // Test 3: Dual persistence check in file system
    console.log('\nStep 3: Checking dual-persistence avatar fallback file');
    const fallbackFile = path.join(process.cwd(), 'backend', 'data', 'avatars', `${testUserId}.json`);
    if (!fs.existsSync(fallbackFile)) {
        throw new Error(`Fallback file not found at: ${fallbackFile}`);
    }
    const fallbackData = JSON.parse(fs.readFileSync(fallbackFile, 'utf8'));
    console.log('Fallback file content:', fallbackData);
    if (fallbackData.avatar_url !== testAvatarUrl) {
        throw new Error('Fallback file does not contain matching avatar_url');
    }
    console.log('✅ Dual-persistence storage verified on disk.');

    // Test 4: Fetch user profile again
    console.log('\nStep 4: Fetch user profile again to ensure avatar is loaded');
    const fetchedProfile = await userService.getUserProfile(testUserId);
    if (fetchedProfile.avatar_url !== testAvatarUrl) {
        throw new Error('Fetched profile avatar_url does not match');
    }
    console.log('✅ Fetched profile accurately reflects new avatar.');

    // Test 5: Fallback retrieval when DB column returns null
    console.log('\nStep 5: Testing fallback resilience when DB column returns null');
    mockDb[testUserId].avatar_url = null; // simulate DB column not cached
    const resilientProfile = await userService.getUserProfile(testUserId);
    console.log('Resilient profile avatar_url from fallback:', resilientProfile.avatar_url);
    if (resilientProfile.avatar_url !== testAvatarUrl) {
        throw new Error('Resilience test failed to retrieve avatar from fallback file');
    }
    console.log('✅ Resilience and dual-persistence verified successfully.');

    // Test 6: Remove avatar
    console.log('\nStep 6: Remove avatar');
    const removed = await userService.updateUserProfile(testUserId, { avatar_url: '' });
    console.log('After removal avatar_url:', removed.avatar_url);
    const finalFallback = JSON.parse(fs.readFileSync(fallbackFile, 'utf8'));
    if (finalFallback.avatar_url !== '') {
        throw new Error('Fallback file was not updated on removal');
    }
    console.log('✅ Avatar removal verified successfully.');

    // Cleanup test file
    fs.unlinkSync(fallbackFile);
    console.log('Cleaned up test file.');

    console.log('\n🎉 ALL AVATAR ELEVATION TESTS PASSED WITH 100% SUCCESS!');
}

runAvatarVerification().catch(err => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
});
