import React from "react";

/** Presentation only: preserve the supplied status and omit absent statuses. */
export function ApprovalStatus({ status }: { status?: string | null }) {
  if (!status?.trim()) return null;
  const tone = status === "Đã duyệt" || status === "approved" ? "approved"
    : status === "Bản nháp" ? "draft"
    : status === "Chờ duyệt" || status === "pending" ? "pending"
    : status === "Từ chối" || status === "Không duyệt" || status === "rejected" ? "rejected"
    : "neutral";
  return <span className={`status-pill approval-status ${tone}`} data-approval-status={status}>{status}</span>;
}
