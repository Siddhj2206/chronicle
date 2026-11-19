import { headers } from "next/headers";

import { PutObjectCommand } from "@aws-sdk/client-s3";

import { auth } from "@/lib/auth";
import { detectImageType, IMAGE_EXTENSIONS, IMAGE_SIZE_ERROR, IMAGE_TYPE_ERROR, MAX_FILE_SIZE } from "@/lib/image-upload";
import { getR2, getR2PublicUrl, R2_BUCKET_NAME } from "@/lib/r2";

const MAX_REQUEST_SIZE = MAX_FILE_SIZE + 64 * 1024;
const UPLOAD_LIMIT = 10;
const WINDOW_MS = 60 * 1000;
// Per-instance only; separate instances have independent upload windows.
const uploadWindows = new Map<string, number[]>();

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  for (const [userId, times] of uploadWindows) {
    if (times[times.length - 1] <= now - WINDOW_MS) uploadWindows.delete(userId);
  }
  const times = (uploadWindows.get(session.user.id) ?? []).filter(time => time > now - WINDOW_MS);
  if (times.length >= UPLOAD_LIMIT) {
    return Response.json({ error: `Upload limit reached. Limit: ${UPLOAD_LIMIT} per minute.` }, {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((times[0] + WINDOW_MS - now) / 1000)) },
    });
  }
  times.push(now);
  uploadWindows.set(session.user.id, times);

  const contentLength = request.headers.get("content-length");
  if (contentLength === null) {
    return Response.json({ error: "Content-Length required" }, { status: 411 });
  }
  if (!(Number(contentLength) <= MAX_REQUEST_SIZE)) {
    return Response.json({ error: IMAGE_SIZE_ERROR }, { status: 413 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size === 0) {
      return Response.json({ error: "File is empty" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: IMAGE_SIZE_ERROR },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const detectedType = detectImageType(buffer);
    if (!detectedType || detectedType !== file.type) {
      return Response.json({ error: IMAGE_TYPE_ERROR }, { status: 400 });
    }
    const key = `uploads/${session.user.id}/${crypto.randomUUID()}.${IMAGE_EXTENSIONS[detectedType]}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: detectedType,
      ContentLength: file.size,
      CacheControl: "public, max-age=31536000, immutable",
    });

    await getR2().send(command);

    return Response.json({ url: getR2PublicUrl(key), key });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
