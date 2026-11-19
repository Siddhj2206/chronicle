import { vi } from "vitest";

import { getSession } from "@/lib/session";

import type { User } from "@/lib/db/schema";

export function mockSession(user: User | null): void {
  vi.mocked(getSession).mockResolvedValue(
    user
      ? {
          user,
          session: {
            id: "test-session",
            token: "test-token",
            userId: user.id,
            expiresAt: new Date("2099-01-01"),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        }
      : null,
  );
}
