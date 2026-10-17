"use server";

import { getCurrentUser } from "@/lib/current-user";
import type { OrderMutationResult } from "@/lib/order-types";
import { orderInclude, serializeOrder } from "@/lib/orders-server";
import { prisma } from "@/lib/prisma";
import {
  isReturnReason,
  type ReturnReason,
} from "@/lib/return-types";

const RETURN_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

class ReturnRequestError extends Error {}

export async function requestOrderReturn(
  orderId: string,
  expectedVersion: number,
  reason: ReturnReason,
  comment: string,
): Promise<OrderMutationResult> {
  if (
    typeof orderId !== "string" ||
    orderId.length === 0 ||
    orderId.length > 100 ||
    !Number.isSafeInteger(expectedVersion) ||
    expectedVersion < 0 ||
    !isReturnReason(reason) ||
    typeof comment !== "string" ||
    comment.length > 1000
  ) {
    return {
      ok: false,
      error: "Invalid return request.",
    };
  }

  const normalizedComment = comment.trim();

  if (reason === "Other" && normalizedComment.length < 10) {
    return {
      ok: false,
      error: "Please explain the reason using at least 10 characters.",
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
        error: "You do not have permission to request returns.",
      };
    }

    const updatedOrder = await prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: {
            returnRequest: true,
          },
        });

        if (!order) {
          throw new ReturnRequestError("Order not found.");
        }

        if (order.returnRequest) {
          throw new ReturnRequestError(
            "A return request already exists. Reload the page to view it.",
          );
        }

        if (order.version !== expectedVersion) {
          throw new ReturnRequestError(
            "This order was updated elsewhere. Reload the page and try again.",
          );
        }

        if (order.status !== "Delivered") {
          throw new ReturnRequestError(
            "Only delivered orders can be returned.",
          );
        }

        const deliveryEvent = await tx.orderEvent.findFirst({
          where: {
            orderId,
            status: "Delivered",
          },
          orderBy: {
            sequence: "desc",
          },
        });

        if (!deliveryEvent) {
          throw new ReturnRequestError(
            "Delivery date is missing. The return cannot be created.",
          );
        }

        const elapsed = Date.now() - deliveryEvent.createdAt.getTime();

        if (elapsed < 0 || elapsed > RETURN_WINDOW_MS) {
          throw new ReturnRequestError(
            "Returns are available within 30 days of delivery.",
          );
        }

        const updateResult = await tx.order.updateMany({
          where: {
            id: orderId,
            version: expectedVersion,
            status: "Delivered",
          },
          data: {
            version: {
              increment: 1,
            },
          },
        });

        if (updateResult.count !== 1) {
          throw new ReturnRequestError(
            "This order was updated elsewhere. Reload the page and try again.",
          );
        }

        await tx.returnRequest.create({
          data: {
            orderId,
            reason,
            comment: normalizedComment || null,
            amount: order.total,
            status: "Requested",

            history: {
              create: {
                sequence: 1,
                status: "Requested",
                actor: `${user.name} (${user.email})`,
              },
            },
          },
        });

        return tx.order.findUniqueOrThrow({
          where: { id: orderId },
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
    if (error instanceof ReturnRequestError) {
      return {
        ok: false,
        error: error.message,
      };
    }

    console.error("Failed to create return request", error);

    return {
      ok: false,
      error:
        "Could not confirm the return request. Reload the page before trying again.",
    };
  }
}