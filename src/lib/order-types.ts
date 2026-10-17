import type { Order } from "@/lib/demo-orders";
import type { ReturnSummary } from "@/lib/return-types";

export type StoredOrder = Order & {
  version: number;
  returnRequest: ReturnSummary | null;
};

export type OrderMutationResult =
  | {
      ok: true;
      order: StoredOrder;
    }
  | {
      ok: false;
      error: string;
    };

export type ChangeOrderStatusResult = OrderMutationResult;