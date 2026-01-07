import { headers } from "next/headers";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { auth } from "@/lib/auth";
import {
  getR2,
  R2_BUCKET_NAME,
  MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
} from "@/lib/r2";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return Response.json(
        { error: "Filename and content type are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
      return Response.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    const key = `uploads/${session.user.id}/${crypto.randomUUID()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      ContentLength: MAX_FILE_SIZE,
    });

    const presignedUrl = await getSignedUrl(getR2(), command, {
      expiresIn: 3600,
    });

    return Response.json({ presignedUrl, key });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
