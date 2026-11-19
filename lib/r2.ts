import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

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

export async function deleteUserObjects(userId: string, contentPaths: string[]): Promise<void> {
  try {
    const r2 = getR2();
    const deleteKeys = async (keys: string[]) => {
      for (let offset = 0; offset < keys.length; offset += 1000) {
        try {
          const result = await r2.send(new DeleteObjectsCommand({
            Bucket: R2_BUCKET_NAME,
            Delete: { Objects: keys.slice(offset, offset + 1000).map((Key) => ({ Key })) },
          }));
          if (result.Errors?.length) console.error("R2 object deletion errors:", result.Errors);
        } catch (error) {
          console.error("Failed to delete R2 objects:", error);
        }
      }
    };

    await deleteKeys([...new Set(contentPaths)]);
    let continuationToken: string | undefined;
    do {
      const page = await r2.send(new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: `uploads/${userId}/`,
        ContinuationToken: continuationToken,
      }));
      await deleteKeys((page.Contents ?? []).flatMap(({ Key }) => Key ? [Key] : []));
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      if (page.IsTruncated && !continuationToken) {
        console.error("R2 listing was truncated without a continuation token");
      }
    } while (continuationToken);
  } catch (error) {
    // Cleanup is best-effort; failed deletions have no durable retry queue.
    console.error("Failed to clean up user R2 objects:", error);
  }
}
