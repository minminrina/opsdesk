import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { requireEmployee } from "@/lib/current-user";
import type { StoredOrder } from "@/lib/order-types";
import { prisma } from "@/lib/prisma";

export const orderInclude = {
  lineItems: {
    orderBy: {
      sku: "asc",
    },
  },
  history: {
    orderBy: {
      sequence: "asc",
    },
  },
  returnRequest: {
    include: {
      history: {
        orderBy: {
          sequence: "asc",
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

type DatabaseOrder = Prisma.OrderGetPayload<{
  include: typeof orderInclude;
}>;

export function serializeOrder(order: DatabaseOrder): StoredOrder {
  return {
    id: order.id,
    customer: order.customer,
    email: order.email,
    date: order.date.toISOString().slice(0, 10),
    total: order.total,
    status: order.status,
    version: order.version,

    items: order.lineItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    ),

    lineItems: order.lineItems.map((item) => ({
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),

    history: order.history.map((event) => ({
      id: event.id,
      status: event.status,
      createdAt: event.createdAt.toISOString(),
      actor: event.actor,
    })),

    returnRequest: order.returnRequest
      ? {
          id: order.returnRequest.id,
          status: order.returnRequest.status,
          reason: order.returnRequest.reason,
          comment: order.returnRequest.comment,
          amount: order.returnRequest.amount,
          createdAt: order.returnRequest.createdAt.toISOString(),
          history: order.returnRequest.history.map((event) => ({
            id: event.id,
            status: event.status,
            actor: event.actor,
            createdAt: event.createdAt.toISOString(),
          })),
        }
      : null,
  };
}

export async function getOrders(): Promise<StoredOrder[]> {
  await requireEmployee();

  const orders = await prisma.order.findMany({
    orderBy: [
      { date: "desc" },
      { id: "desc" },
    ],
    include: orderInclude,
  });

  return orders.map(serializeOrder);
}