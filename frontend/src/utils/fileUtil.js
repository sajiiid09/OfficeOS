import { backendUrl } from '../http';

/**
 * Map of placeholder filenames returned by DTOs to local public assets.
 */
const PLACEHOLDER_MAP = {
  'user.png': '/assets/icons/user.png',
  'team.png': '/assets/icons/team.png',
};

/**
 * Resolves a file path to a full URL.
 * Handles:
 *  - null / undefined          → defaultAsset
 *  - placeholder names         → local /assets/icons/ path
 *  - absolute URLs (http, data:, /) → pass-through
 *  - relative storage paths    → backendUrl + /storage/ + path
 *
 * @param {string} path - The file path or URL from the API.
 * @param {string} defaultAsset - Fallback when path is empty.
 * @returns {string} Resolved URL.
 */
export const getFileUrl = (path, defaultAsset = '/assets/icons/user.png') => {
  if (!path) return defaultAsset;

  // Map DTO placeholders (e.g. 'user.png', 'team.png') to local icons
  if (PLACEHOLDER_MAP[path]) return PLACEHOLDER_MAP[path];

  // Absolute URLs, data URIs, root-relative paths — pass through
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('/')) {
    return path;
  }

  // Relative storage path from backend (e.g. "images/profile/abc123.jpg")
  return `${backendUrl}/storage/${path}`;
};
