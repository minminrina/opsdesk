"use server";

import { getCurrentUser } from "@/lib/current-user";
import type { OrderMutationResult } from "@/lib/order-types";
import { orderInclude, serializeOrder } from "@/lib/orders-server";
import { prisma } from "@/lib/prisma";
import type { ReturnStatus } from "@/lib/return-types";
import {
  canTransitionReturn,
  isReturnStatus,
} from "@/lib/return-workflow";

class ReturnStatusError extends Error {}

export async function changeReturnStatus(
  orderId: string,
  expectedVersion: number,
  nextStatus: ReturnStatus,
): Promise<OrderMutationResult> {
  if (
    typeof orderId !== "string" ||
    orderId.length === 0 ||
    orderId.length > 100 ||
    !Number.isSafeInteger(expectedVersion) ||
    expectedVersion < 0 ||
    !isReturnStatus(nextStatus)
  ) {
    return {
      ok: false,
      error: "Invalid return update.",
    };
  }

  try {
    const user = await getCurrentUser();

    if (!user) {
      return {
        ok: false,
        error: "Your session has expired. Sign in again.",
      };
    }

    if (user.role !== "manager" && user.role !== "admin") {
      return {
        ok: false,
        error: "You do not have permission to process returns.",
      };
    }

    const updatedOrder = await prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { returnRequest: true },
        });

        if (!order) {
          throw new ReturnStatusError("Order not found.");
        }

        const request = order.returnRequest;

        if (!request) {
          throw new ReturnStatusError(
            "This order does not have a return request.",
          );
        }

        if (order.version !== expectedVersion) {
          throw new ReturnStatusError(
            "This order was updated by another employee. Reload the page.",
          );
        }

        if (order.status !== "Delivered") {
          throw new ReturnStatusError(
            "Returns can only be processed for delivered orders.",
          );
        }

        if (!canTransitionReturn(request.status, nextStatus)) {
          throw new ReturnStatusError(
            `Cannot change return status from ${request.status} to ${nextStatus}.`,
          );
        }

        const orderUpdate = await tx.order.updateMany({
          where: {
            id: orderId,
            version: expectedVersion,
            status: "Delivered",
          },
          data: {
            version: { increment: 1 },
          },
        });

        if (orderUpdate.count !== 1) {
          throw new ReturnStatusError(
            "This order was updated by another employee. Reload the page.",
          );
        }

        const returnUpdate = await tx.returnRequest.updateMany({
          where: {
            id: request.id,
            status: request.status,
          },
          data: {
            status: nextStatus,
          },
        });

        if (returnUpdate.count !== 1) {
          throw new ReturnStatusError(
            "This return was updated by another employee. Reload the page.",
          );
        }

        const lastEvent = await tx.returnEvent.findFirst({
          where: {
            returnId: request.id,
          },
          orderBy: {
            sequence: "desc",
          },
          select: {
            sequence: true,
          },
        });

        await tx.returnEvent.create({
          data: {
            returnId: request.id,
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
        maxWait: 10_000,
        timeout: 15_000,
      },
    );

    return {
      ok: true,
      order: serializeOrder(updatedOrder),
    };
  } catch (error) {
    if (error instanceof ReturnStatusError) {
      return {
        ok: false,
        error: error.message,
      };
    }

    console.error("Failed to update return status:", error);

    return {
      ok: false,
      error:
        "Could not confirm the return update. Reload the page to check its current status.",
    };
  }
}