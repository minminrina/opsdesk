import type { OrderStatus } from "@/lib/demo-orders";

export const orderTransitions: Record<OrderStatus, OrderStatus[]> = {
    Pending: ["Processing", "Cancelled"],
    Processing: ["Shipped", "Cancelled"],
    Shipped: ["Delivered"],
    Delivered: [],
    Cancelled: [],
};

export const orderActionLabels: Record<OrderStatus, string> = {
    Pending: "Mark as pending",
    Processing: "Start processing",
    Shipped: "Mark as shipped",
    Delivered: "Confirm delivery",
    Cancelled: "Cancel order",
};

export function canTransitionOrder(
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
): boolean {
    return orderTransitions[currentStatus].includes(nextStatus);
}