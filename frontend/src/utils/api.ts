/**
 * Resolves the Backend API Base URL using Vite environment variables.
 * Fallback to 'http://localhost:5000' for local development.
 */
export const API_BASE_URL: string = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:5000"
).replace(/\/$/, "");

/**
 * Constructs a full API URL given a path.
 * If path is already a full URL (http/https), returns it as-is.
 * Example:
 *   getApiUrl("/api/files") -> "http://localhost:5000/api/files"
 */
export function getApiUrl(path: string): string {
  if (!path) return API_BASE_URL;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE_URL) return cleanPath;
  return `${API_BASE_URL}${cleanPath}`;
}
