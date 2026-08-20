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

export interface SaveFilePayload {
  filename: string;
  sheets?: { name: string; headers: string[]; rows: any[] }[];
  headers?: string[];
  rows?: any[];
}

/**
 * Universal helper to save file data to the database repository.
 * Automatically switches to chunked upload if payload exceeds 2.5 MB to bypass Vercel's 4.5 MB body limit.
 */
export async function saveFileToDatabase(payload: SaveFilePayload): Promise<{ message: string; fileId: string }> {
  const jsonPayload = JSON.stringify(payload);
  const CHUNK_THRESHOLD = 2.5 * 1024 * 1024; // 2.5 MB threshold

  if (jsonPayload.length < CHUNK_THRESHOLD) {
    const res = await fetch(getApiUrl("/api/files"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonPayload,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }

  // Chunked upload for large dataset payloads
  const sheets = payload.sheets && payload.sheets.length > 0 ? payload.sheets : [
    { name: "Transactions", headers: payload.headers || [], rows: payload.rows || [] }
  ];

  // 1. Init file record
  const initRes = await fetch(getApiUrl("/api/files/init"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: payload.filename,
      sheets: sheets.map(s => ({ name: s.name, headers: s.headers }))
    }),
  });

  if (!initRes.ok) {
    const err = await initRes.json().catch(() => ({}));
    throw new Error(err.error || "Failed to initialize file save");
  }

  const { fileId } = await initRes.json();

  // 2. Upload row chunks in parallel
  const ROWS_PER_CHUNK = 2000;
  const chunkPromises = [];

  for (const sheet of sheets) {
    const rows = sheet.rows || [];
    let chunkIndex = 0;
    for (let i = 0; i < rows.length; i += ROWS_PER_CHUNK) {
      const chunkRows = rows.slice(i, i + ROWS_PER_CHUNK);
      const cIndex = chunkIndex++;
      chunkPromises.push(
        fetch(getApiUrl(`/api/files/${fileId}/chunk`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheetName: sheet.name,
            chunkIndex: cIndex,
            rows: chunkRows,
          }),
        }).then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Failed to save chunk ${cIndex} for ${sheet.name}`);
          }
        })
      );
    }
  }

  await Promise.all(chunkPromises);

  // 3. Finalize file metadata and computation
  const finalizeRes = await fetch(getApiUrl(`/api/files/${fileId}/finalize`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!finalizeRes.ok) {
    const err = await finalizeRes.json().catch(() => ({}));
    throw new Error(err.error || "Failed to finalize file save");
  }

  return await finalizeRes.json();
}
