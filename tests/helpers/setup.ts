import { beforeEach, vi } from "vitest";

vi.mock("@/lib/session", () => ({ getSession: vi.fn().mockResolvedValue(null) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/r2-content", () => ({
  uploadContent: vi.fn(async (id: string) => `content/${id}.md`),
  deleteContent: vi.fn().mockResolvedValue(undefined),
  getContent: vi.fn().mockResolvedValue(null),
  revalidateContent: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  vi.clearAllMocks();
});
