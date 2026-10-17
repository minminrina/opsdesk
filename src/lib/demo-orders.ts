export type OrderStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

export type OrderItem = {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type OrderEvent = {
  id: string;
  status: OrderStatus;
  createdAt: string;
  actor: string;
};

export type Order = {
  id: string;
  customer: string;
  email: string;
  date: string;
  total: number;
  items: number;
  status: OrderStatus;
  lineItems: OrderItem[];
  history: OrderEvent[];
};

export const orderStatuses: OrderStatus[] = [
  "Pending",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

// Demo data generator for creating fictional order history only for demonstration purposes.
// After connecting to the database, the history will be recorded for each action.
function createDemoHistory(
  orderId: string,
  date: string,
  status: OrderStatus,
): OrderEvent[] {
  const fulfillmentSteps: OrderStatus[] = [
    "Pending",
    "Processing",
    "Shipped",
    "Delivered",
  ];

  const steps: OrderStatus[] =
    status === "Cancelled"
      ? ["Pending", "Cancelled"]
      : fulfillmentSteps.slice(
          0,
          fulfillmentSteps.indexOf(status) + 1,
        );

  return steps.map((step, index) => ({
    id: `${orderId}-event-${index + 1}`,
    status: step,
    createdAt: `${date}T${String(8 + index).padStart(2, "0")}:00:00+09:00`,
    actor: index === 0 ? "System" : "Demo manager",
  }));
}

type OrderSeed = Omit<Order, "total" | "items" | "history">;

const orderSeeds: OrderSeed[] = [
  {
    id: "ORD-1048",
    customer: "Hana Kim",
    email: "hana@example.com",
    date: "2026-10-02",
    status: "Pending",
    lineItems: [
      {
        sku: "BAG-001",
        name: "Everyday Tote",
        quantity: 1,
        unitPrice: 59000,
      },
      {
        sku: "BOT-001",
        name: "Insulated Bottle",
        quantity: 2,
        unitPrice: 35000,
      },
    ],
  },
  {
    id: "ORD-1047",
    customer: "Daniel Park",
    email: "daniel@example.com",
    date: "2026-10-02",
    status: "Processing",
    lineItems: [
      {
        sku: "BAG-001",
        name: "Everyday Tote",
        quantity: 1,
        unitPrice: 59000,
      },
      {
        sku: "PCH-001",
        name: "Travel Pouch",
        quantity: 1,
        unitPrice: 30000,
      },
    ],
  },
  {
    id: "ORD-1046",
    customer: "Sofia Lee",
    email: "sofia@example.com",
    date: "2026-10-01",
    status: "Shipped",
    lineItems: [
      {
        sku: "BAG-001",
        name: "Everyday Tote",
        quantity: 2,
        unitPrice: 59000,
      },
      {
        sku: "DSK-001",
        name: "Desk Organizer",
        quantity: 2,
        unitPrice: 48000,
      },
    ],
  },
  {
    id: "ORD-1045",
    customer: "Alex Morgan",
    email: "alex@example.com",
    date: "2026-10-01",
    status: "Delivered",
    lineItems: [
      {
        sku: "LMP-001",
        name: "Reading Lamp",
        quantity: 1,
        unitPrice: 56000,
      },
    ],
  },
  {
    id: "ORD-1044",
    customer: "Yuna Choi",
    email: "yuna@example.com",
    date: "2026-09-30",
    status: "Delivered",
    lineItems: [
      {
        sku: "BAG-001",
        name: "Everyday Tote",
        quantity: 2,
        unitPrice: 59000,
      },
      {
        sku: "BLK-001",
        name: "Cotton Throw",
        quantity: 1,
        unitPrice: 60000,
      },
    ],
  },
  {
    id: "ORD-1043",
    customer: "Noah Wilson",
    email: "noah@example.com",
    date: "2026-09-30",
    status: "Cancelled",
    lineItems: [
      {
        sku: "MUG-001",
        name: "Ceramic Mug Set",
        quantity: 1,
        unitPrice: 42000,
      },
    ],
  },
  {
    id: "ORD-1042",
    customer: "Minjun Seo",
    email: "minjun@example.com",
    date: "2026-09-29",
    status: "Processing",
    lineItems: [
      {
        sku: "DSK-001",
        name: "Desk Organizer",
        quantity: 2,
        unitPrice: 48000,
      },
    ],
  },
  {
    id: "ORD-1041",
    customer: "Emma Davis",
    email: "emma@example.com",
    date: "2026-09-29",
    status: "Delivered",
    lineItems: [
      {
        sku: "CUS-001",
        name: "Linen Cushion",
        quantity: 3,
        unitPrice: 49000,
      },
    ],
  },
];

export const demoOrders: Order[] = orderSeeds.map((order) => ({
  ...order,
  total: order.lineItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  ),
  items: order.lineItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  ),
  history: createDemoHistory(order.id, order.date, order.status),
}));