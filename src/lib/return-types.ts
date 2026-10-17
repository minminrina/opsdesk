export const returnReasons = [
  "Damaged",
  "WrongItem",
  "NotAsDescribed",
  "ChangedMind",
  "Other",
] as const;

export type ReturnReason = (typeof returnReasons)[number];

export type ReturnStatus =
  | "Requested"
  | "Approved"
  | "Rejected"
  | "Received"
  | "Refunded";

export const returnReasonLabels: Record<ReturnReason, string> = {
  Damaged: "Item arrived damaged",
  WrongItem: "Wrong item received",
  NotAsDescribed: "Item not as described",
  ChangedMind: "Customer changed their mind",
  Other: "Other",
};

export type ReturnHistoryEvent = {
  id: string;
  status: ReturnStatus;
  actor: string;
  createdAt: string;
};

export type ReturnSummary = {
  id: string;
  status: ReturnStatus;
  reason: ReturnReason;
  comment: string | null;
  amount: number;
  createdAt: string;
  history: ReturnHistoryEvent[];
};

export function isReturnReason(value: unknown): value is ReturnReason {
  return returnReasons.some((reason) => reason === value);
}