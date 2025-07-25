/**
 * Utility functions for handling paths in different environments
 */

/**
 * Get the base path for the application depending on environment
 */
export function getBasePath(): string {
  // In development, use root path
  if (process.env.NODE_ENV === 'development') {
    return '';
  }
  
  // In production on GitHub Pages, use /2048ish
  return '/2048ish';
}

/**
 * Get the blog URL for the current environment
 */
export function getBlogUrl(): string {
  const basePath = getBasePath();
  return `${basePath}/blog`;
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