import type { Order } from "@/lib/demo-orders";

function escapeCsvCell(value: string | number): string {
  let text = String(value);

  // Защита текстовых значений от интерпретации как формул.
  if (
    typeof value === "string" &&
    /^[\s\u0000-\u001f]*[=+\-@＝＋－＠]/u.test(text)
  ) {
    text = `\t${text}`;
  }

  // Кавычки внутри значения удваиваем.
  // Само значение заключаем в кавычки.
  return `"${text.replace(/"/g, '""')}"`;
}

export function createOrdersCsv(orders: readonly Order[]): string {
  const headers = [
    "Order ID",
    "Customer",
    "Email",
    "Order date",
    "Status",
    "Items",
    "Total",
    "Currency",
  ];

  const rows: Array<Array<string | number>> = [
    headers,
    ...orders.map((order) => [
      order.id,
      order.customer,
      order.email,
      order.date,
      order.status,
      order.items,
      order.total,
      "KRW",
    ]),
  ];

  const content = rows
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n");

  // UTF-8 BOM помогает Excel распознавать корейские и русские символы.
  return `\uFEFF${content}\r\n`;
}

export function downloadOrdersCsv(orders: readonly Order[]): void {
  if (orders.length === 0) {
    return;
  }

  const csv = createOrdersCsv(orders);

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  link.href = url;
  link.download = `opsdesk-orders-${timestamp}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}