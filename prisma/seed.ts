import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { demoOrders } from "../src/lib/demo-orders";

const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL is missing in .env");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const order of demoOrders) {
    await prisma.order.upsert({
      where: {
        id: order.id,
      },

      // Повторный запуск сохраняет существующий заказ без изменений.
      update: {},

      create: {
        id: order.id,
        customer: order.customer,
        email: order.email,
        date: new Date(`${order.date}T00:00:00.000Z`),
        total: order.total,
        status: order.status,

        lineItems: {
          create: order.lineItems.map((item) => ({
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },

        history: {
          create: order.history.map((event, index) => ({
            id: event.id,
            sequence: index + 1,
            status: event.status,
            createdAt: new Date(event.createdAt),
            actor: event.actor,
          })),
        },
      },
    });
  }

  const count = await prisma.order.count();

  console.log(`Database ready. Orders: ${count}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });