import OrdersClient from "@/components/orders/page";
import { requireEmployee } from "@/lib/current-user";
import { getOrders } from "@/lib/orders-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await requireEmployee();
  const orders = await getOrders();

  return (
    <OrdersClient
      initialOrders={orders}
      currentUser={{
        id: user.id,
        name: user.name,
        role: user.role,
      }}
    />
  );
}
