import { describe, expect, it } from "vitest";
import type { VisitorWithInviter } from "@/types/visitor.types";
import { parseAccessCode, qrVerdict } from "./qrAccess";

const visit = (over: Partial<VisitorWithInviter>): VisitorWithInviter =>
  ({
    status: "scheduled",
    valid_from: "2026-10-04T00:00:00Z",
    valid_until: "2026-10-05T00:00:00Z",
    ...over,
  }) as VisitorWithInviter;
const now = new Date("2026-10-04T12:00:00Z");

describe("parseAccessCode", () => {
  it("reads the code from the fastlane link", () => {
    expect(parseAccessCode("https://admin.vecinoo.app/#fastlane/ab12cd")).toBe("AB12CD");
  });
  it("accepts a bare code and rejects garbage", () => {
    expect(parseAccessCode("ab12cd")).toBe("AB12CD");
    expect(parseAccessCode("https://example.com/x")).toBeNull();
  });
});

describe("qrVerdict", () => {
  it("admits a registered visit inside its window", () => {
    expect(qrVerdict(visit({}), now)).toBe("ok");
  });
  it("rejects a QR once the visit is inside or completed", () => {
    expect(qrVerdict(visit({ status: "inside" }), now)).toBe("used");
    expect(qrVerdict(visit({ status: "completed" }), now)).toBe("used");
  });
  it("rejects cancelled, expired, unregistered and not-yet-valid visits", () => {
    expect(qrVerdict(visit({ status: "cancelled" }), now)).toBe("closed");
    expect(qrVerdict(visit({ valid_until: "2026-10-03T00:00:00Z" }), now)).toBe("expired");
    expect(qrVerdict(visit({ status: "pending_registration" }), now)).toBe("notRegistered");
    expect(qrVerdict(visit({ valid_from: "2026-10-04T18:00:00Z" }), now)).toBe("notYetValid");
  });
});
