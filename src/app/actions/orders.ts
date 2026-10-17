"use server";

import {
  orderStatuses,
  type OrderStatus,
} from "@/lib/demo-orders";
import { getCurrentUser } from "@/lib/current-user";
import type { ChangeOrderStatusResult } from "@/lib/order-types";
import { canTransitionOrder } from "@/lib/order-workflow";
import { orderInclude, serializeOrder } from "@/lib/orders-server";
import { prisma } from "@/lib/prisma";

class OrderUpdateError extends Error {}

function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    orderStatuses.some((status) => status === value)
  );
}

export async function changeOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  expectedVersion: number,
): Promise<ChangeOrderStatusResult> {
  if (
    typeof orderId !== "string" ||
    orderId.length === 0 ||
    orderId.length > 100 ||
    !isOrderStatus(nextStatus) ||
    !Number.isSafeInteger(expectedVersion) ||
    expectedVersion < 0
  ) {
    return {
      ok: false,
      error: "Invalid order update.",
    };
  }

  try {
    const user = await getCurrentUser();

    if (!user) {
      return {
        ok: false,
        error: "Your session has expired. Reload the page and sign in.",
      };
    }

    if (user.role !== "admin" && user.role !== "manager") {
      return {
        ok: false,
        error: "You do not have permission to update orders.",
      };
    }

    const updatedOrder = await prisma.$transaction(
      async (tx) => {
        const currentOrder = await tx.order.findUnique({
          where: {
            id: orderId,
          },
        });

        if (!currentOrder) {
          throw new OrderUpdateError("Order not found.");
        }

        if (currentOrder.version !== expectedVersion) {
          throw new OrderUpdateError(
            "This order was updated elsewhere. Reload the page and try again.",
          );
        }

        if (!canTransitionOrder(currentOrder.status, nextStatus)) {
          throw new OrderUpdateError(
            `Cannot change ${currentOrder.status} to ${nextStatus}.`,
          );
        }

        const updateResult = await tx.order.updateMany({
          where: {
            id: orderId,
            version: expectedVersion,
            status: currentOrder.status,
          },
          data: {
            status: nextStatus,
            version: {
              increment: 1,
            },
          },
        });

        if (updateResult.count !== 1) {
          throw new OrderUpdateError(
            "This order was updated elsewhere. Reload the page and try again.",
          );
        }

        const lastEvent = await tx.orderEvent.findFirst({
          where: {
            orderId,
          },
          orderBy: {
            sequence: "desc",
          },
          select: {
            sequence: true,
          },
        });

        await tx.orderEvent.create({
          data: {
            orderId,
            sequence: (lastEvent?.sequence ?? 0) + 1,
            status: nextStatus,
            actor: `${user.name} (${user.email})`,
          },
        });

        return tx.order.findUniqueOrThrow({
          where: {
            id: orderId,
          },
          include: orderInclude,
        });
      },
      {
        maxWait: 10000,
        timeout: 15000,
      },
    );

    return {
      ok: true,
      order: serializeOrder(updatedOrder),
    };
  } catch (error: unknown) {
    if (error instanceof OrderUpdateError) {
      return {
        ok: false,
        error: error.message,
      };
    }

    console.error("Failed to update order", error);

    return {
      ok: false,
      error:
        "Could not confirm the update. Reload the page to check the order before trying again.",
    };
  }
}