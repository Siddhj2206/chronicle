import { headers } from "next/headers";
import { PutObjectCommand } from "@aws-sdk/client-s3";

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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return Response.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "File too large. Max size: 5MB" },
        { status: 400 }
      );
    }

    const key = `uploads/${session.user.id}/${crypto.randomUUID()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ContentLength: file.size,
    });

    await getR2().send(command);

    // Construct public URL
    let domain = process.env.NEXT_PUBLIC_R2_DOMAIN;
    let url: string;
    
    if (domain) {
      // Remove protocol if included in env var
      domain = domain.replace(/^https?:\/\//, "");
      url = `https://${domain}/${key}`;
    } else {
      url = `${process.env.R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`;
    }

    return Response.json({ url, key });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
