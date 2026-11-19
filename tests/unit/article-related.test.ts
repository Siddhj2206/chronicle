import { afterEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

import { getMoreFromAuthor } from "@/actions/posts";
import { getDb } from "@/lib/db";

import type { SQL } from "drizzle-orm";

vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

function mockQuery(rows: { id: string }[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn((_condition: SQL | undefined) => ({ orderBy }));
  const db = { select: () => ({ from: () => ({ where }) }) };
  vi.mocked(getDb).mockResolvedValue(
    db as unknown as Awaited<ReturnType<typeof getDb>>,
  );
  return { limit, orderBy, where };
}

describe("more from author", () => {
  it("queries only the author's other published posts, newest first, limited to three", async () => {
    const rows = [{ id: "other" }];
    const query = mockQuery(rows);
    await expect(getMoreFromAuthor("writer", "current")).resolves.toEqual(rows);
    const condition = new PgDialect().sqlToQuery(query.where.mock.calls[0][0]!);
    expect(condition.sql).toContain('"post"."author_id" = $1');
    expect(condition.sql).toContain('"post"."published" = $2');
    expect(condition.sql).toContain('"post"."id" <> $3');
    expect(condition.params).toEqual(["writer", true, "current"]);
    expect(query.orderBy).toHaveBeenCalledOnce();
    expect(query.limit).toHaveBeenCalledWith(3);
  });

  it("returns no recommendations when there are no other stories", async () => {
    mockQuery([]);
    await expect(getMoreFromAuthor("writer", "current")).resolves.toEqual([]);
  });

  it("returns an empty section fallback when the database fails", async () => {
    vi.mocked(getDb).mockRejectedValue(new Error("Connection failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(getMoreFromAuthor("writer", "current")).resolves.toEqual([]);
  });
});
