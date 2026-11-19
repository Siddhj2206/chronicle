export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const IMAGE_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
} as const;

export type ImageType = keyof typeof IMAGE_EXTENSIONS;
export const ALLOWED_IMAGE_TYPES = Object.keys(IMAGE_EXTENSIONS);
export const IMAGE_TYPE_ERROR = `Invalid file type. Allowed: ${Object.values(IMAGE_EXTENSIONS).join(", ")}`;
export const IMAGE_SIZE_ERROR = `File too large. Max size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`;

export function detectImageType(bytes: Uint8Array): ImageType | null {
  const matches = (signature: number[], offset = 0) =>
    bytes.length >= offset + signature.length &&
    signature.every((byte, index) => bytes[offset + index] === byte);

  if (matches([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (matches([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (matches([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
      matches([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) return "image/gif";
  if (bytes.length >= 12 && matches([0x52, 0x49, 0x46, 0x46]) &&
      matches([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

export async function readUploadResponse(response: Response): Promise<string> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : `Upload failed (${response.status})`);
  }
  if (typeof data?.url !== "string") throw new Error("Invalid upload response");
  return data.url;
}
