import { S3Client } from "@aws-sdk/client-s3";

function getR2Client(): S3Client {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 credentials are not set. Please set R2_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY."
    );
  }

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

// Lazy initialization
let _r2Client: S3Client | null = null;

export function getR2(): S3Client {
  if (!_r2Client) {
    _r2Client = getR2Client();
  }
  return _r2Client;
}

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "";

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
