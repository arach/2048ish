/**
 * Utility functions for handling paths in different environments
 * Mirrors the main app's path utilities
 */

/**
 * Get the base path for the application depending on environment
 */
export function getBasePath(): string {
  // In development, use root path
  if (import.meta.env.DEV) {
    return '';
  }
  
  // In production on GitHub Pages, use /2048ish
  return '/2048ish';
}

/**
 * Get the main app URL for the current environment
 */
export function getMainAppUrl(): string {
  const basePath = getBasePath();
  return basePath || '/';
}

/**
 * Resolve a path relative to the current environment's base path
 */
export function resolvePath(path: string): string {
  const basePath = getBasePath();
  // Remove leading slash from path to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return basePath ? `${basePath}/${cleanPath}` : `/${cleanPath}`;
}