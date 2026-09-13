/**
 * Backwards Compatibility Adapter
 * =================================
 * The primary API client has been relocated to '@/services/api' (src/services/api.js).
 * This file re-exports all members for 100% backwards compatibility with existing modules.
 */

import api, { setAccessToken } from '../services/api.js';

export { setAccessToken };
export default api;

