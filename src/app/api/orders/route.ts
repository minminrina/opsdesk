import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getOrders } from "@/lib/orders-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "private, no-store",
};

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Your session has expired. Sign in again.",
        },
        {
          status: 401,
          headers,
        },
      );
    }

    if (user.role !== "manager" && user.role !== "admin") {
      return NextResponse.json(
        {
          error: "You do not have access to orders.",
        },
        {
          status: 403,
          headers,
        },
      );
    }

    return NextResponse.json(await getOrders(), {
      headers,
    });
  } catch (error) {
    console.error("Failed to load orders:", error);

    return NextResponse.json(
      {
        error: "Could not refresh orders. Please try again.",
      },
      {
        status: 500,
        headers,
      },
    );
  }
}
