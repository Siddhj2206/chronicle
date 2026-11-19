import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getR2(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.R2) throw new Error("Missing R2 binding");
  return env.R2;
}

export async function deleteUserObjects(
  userId: string,
  contentPaths: string[],
): Promise<void> {
  try {
    const r2 = await getR2();
    const deleteKeys = async (keys: string[]) => {
      for (let offset = 0; offset < keys.length; offset += 1000) {
        try {
          await r2.delete(keys.slice(offset, offset + 1000));
        } catch (error) {
          console.error("Failed to delete R2 objects:", error);
        }
      }
    };
    await deleteKeys([...new Set(contentPaths)]);
    let cursor: string | undefined;
    do {
      const page = await r2.list({ prefix: `uploads/${userId}/`, cursor });
      await deleteKeys(page.objects.map(({ key }) => key));
      cursor = page.truncated ? page.cursor : undefined;
      if (page.truncated && !cursor) {
        console.error("R2 listing was truncated without a continuation token");
      }
    } while (cursor);
  } catch (error) {
    // Cleanup is best-effort; failed deletions have no durable retry queue.
    console.error("Failed to clean up user R2 objects:", error);
  }
}

export function getR2PublicUrl(key: string): string {
  const domain = process.env.NEXT_PUBLIC_R2_DOMAIN;
  if (!domain) throw new Error("Missing NEXT_PUBLIC_R2_DOMAIN");
  return `https://${domain.replace(/^https?:\/\//, "").replace(/\/+$/, "")}/${key}`;
}
