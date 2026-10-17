import type { ReturnStatus } from "@/lib/return-types";

export const returnTransitions: Record<
  ReturnStatus,
  readonly ReturnStatus[]
> = {
  Requested: ["Approved", "Rejected"],
  Approved: ["Received"],
  Rejected: [],
  Received: ["Refunded"],
  Refunded: [],
};

export const returnActionLabels: Record<ReturnStatus, string> = {
  Requested: "Request return",
  Approved: "Approve return",
  Rejected: "Reject return",
  Received: "Confirm item received",
  Refunded: "Confirm demo refund",
};

export function isReturnStatus(value: unknown): value is ReturnStatus {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(returnTransitions, value)
  );
}

export function canTransitionReturn(
  currentStatus: ReturnStatus,
  nextStatus: ReturnStatus,
): boolean {
  return returnTransitions[currentStatus].includes(nextStatus);
}