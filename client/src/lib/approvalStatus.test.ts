import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ApprovalStatus } from "../components/toolbox/ApprovalStatus";

describe("approval status presentation", () => {
  it("does not invent approval when status is absent", () => {
    for (const status of [undefined, null, "", "   "]) {
      expect(renderToStaticMarkup(createElement(ApprovalStatus, { status }))).toBe("");
    }
  });
  it("preserves draft and pending values instead of displaying approved", () => {
    for (const status of ["Bản nháp", "Chờ duyệt", "pending"]) {
      const markup = renderToStaticMarkup(createElement(ApprovalStatus, { status }));
      expect(markup).toContain(`>${status}</span>`);
      expect(markup).not.toContain("Đã duyệt");
    }
  });
  it("keeps unknown statuses visible with a neutral presentation", () => {
    const markup = renderToStaticMarkup(createElement(ApprovalStatus, { status: "Đang rà soát" }));
    expect(markup).toContain("approval-status neutral");
    expect(markup).toContain(">Đang rà soát</span>");
  });
});
