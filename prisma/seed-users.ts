import "dotenv/config";

import { randomBytes } from "node:crypto";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL;
const secret = process.env.BETTER_AUTH_SECRET;
const baseURL = process.env.BETTER_AUTH_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL is missing");
}

if (!secret || secret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET is missing or too short");
}

if (!baseURL) {
  throw new Error("BETTER_AUTH_URL is missing");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const seedAuth = betterAuth({
  secret,
  baseURL,

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    minPasswordLength: 12,
  },
});

const users = [
  {
    name: "Karina",
    email: "admin@opsdesk.example",
    role: "admin",
  },
  {
    name: "Demo Manager",
    email: "manager@opsdesk.example",
    role: "manager",
  },
] as const;

async function main() {
  for (const user of users) {
    const existing = await prisma.user.findUnique({
      where: {
        email: user.email,
      },
    });

    if (existing) {
      console.log(`Already exists: ${user.email}`);
      continue;
    }

    const password = randomBytes(18).toString("base64url");

    const result = await seedAuth.api.signUpEmail({
      body: {
        name: user.name,
        email: user.email,
        password,
      },
    });

    await prisma.user.update({
      where: {
        id: result.user.id,
      },
      data: {
        role: user.role,
      },
    });

    console.log(`Created: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Password: ${password}`);
    console.log("");
  }

  console.log("User setup complete.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });