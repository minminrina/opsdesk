"use client";

import { useEffect, useRef } from "react";
import type { OrderStatus } from "@/lib/demo-orders";
import type { StoredOrder } from "@/lib/order-types";
import type {
  ReturnReason,
  ReturnStatus,
} from "@/lib/return-types";
import { ReturnProcessing } from "@/components/orders/return-processing";
import { OrderReturnSection } from "@/components/orders/order-return-section";
import {
  orderTransitions,
  orderActionLabels,
} from "@/lib/order-workflow";

type OrderDetailsProps = {
  order: StoredOrder | null;
  onDismiss: () => void;
  onStatusChange: (nextStatus: OrderStatus) => void;
  onRequestReturn: (reason: ReturnReason, comment: string) => void;
  onReturnStatusChange: (nextStatus: ReturnStatus) => void;
  isSaving: boolean;
  saveError: string | null;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Seoul",
});

const eventLabels: Record<OrderStatus, string> = {
  Pending: "Order received",
  Processing: "Processing started",
  Shipped: "Order shipped",
  Delivered: "Order delivered",
  Cancelled: "Order cancelled",
};

export function OrderDetails({
  order,
  onDismiss,
  onStatusChange,
  onRequestReturn,
  onReturnStatusChange,
  isSaving,
  saveError,
}: OrderDetailsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isOpen = order !== null;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog || !isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    dialog.showModal();
    document.body.style.overflow = "hidden";

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="order-details-title"
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-lg overflow-y-auto border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40"
    >
      {order && (
        <>
          <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Order details
              </p>
              <h2
                id="order-details-title"
                className="mt-1 text-xl font-bold"
              >
                {order.id}
              </h2>
            </div>

            <button
              type="button"
              onClick={onDismiss}
              disabled={isSaving}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600"
            >
              Close
            </button>
          </header>

          <div className="space-y-6 p-6">
            <section className="rounded-2xl bg-indigo-50 p-5">
              <p className="text-sm font-medium text-indigo-700">
                Current status
              </p>

              <p
                aria-live="polite"
                aria-atomic="true"
                className="mt-2 text-2xl font-bold text-indigo-950"
              >
                {order.status}
              </p>

              {isSaving && (
                <p role="status" className="mt-3 text-sm text-indigo-700">
                  Saving changes...
                </p>
              )}

              {saveError && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {saveError}
                </p>
              )}

              {orderTransitions[order.status].length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {orderTransitions[order.status].map((nextStatus) => (
                    <button
                      key={nextStatus}
                      type="button"
                      onClick={() => onStatusChange(nextStatus)}
                      disabled={isSaving}
                      className={
                        nextStatus === "Cancelled"
                          ? "rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600"
                          : "rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                      }
                    >
                      {orderActionLabels[nextStatus]}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-indigo-700">
                  {order.status === "Delivered"
                    ? "Delivery completed."
                    : "This order has been cancelled."}
                </p>
              )}
            </section>

            <section
              aria-labelledby="customer-title"
              className="rounded-2xl border border-slate-200 p-5"
            >
              <h3 id="customer-title" className="font-semibold">
                Customer
              </h3>

              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="text-slate-500">Full name</dt>
                  <dd className="mt-1 font-medium">
                    {order.customer}
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-500">Email address</dt>
                  <dd className="mt-1 break-all font-medium">
                    {order.email}
                  </dd>
                </div>
              </dl>
            </section>

            <section
              aria-labelledby="items-title"
              className="rounded-2xl border border-slate-200 p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <h3 id="items-title" className="font-semibold">
                  Items
                </h3>
                <span className="text-xs text-slate-500">
                  {order.items} units
                </span>
              </div>

              <ul className="mt-2 divide-y divide-slate-100">
                {order.lineItems.map((item) => (
                  <li key={item.sku} className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          SKU: {item.sku}
                        </p>
                      </div>

                      <p className="shrink-0 text-sm font-semibold tabular-nums">
                        {currencyFormatter.format(
                          item.unitPrice * item.quantity,
                        )}
                      </p>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      {currencyFormatter.format(item.unitPrice)}
                      {" × "}
                      {item.quantity}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section
              aria-labelledby="summary-title"
              className="rounded-2xl border border-slate-200 p-5"
            >
              <h3 id="summary-title" className="font-semibold">
                Order summary
              </h3>

              <dl className="mt-4 space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Order date</dt>
                  <dd className="font-medium">
                    <time dateTime={order.date}>{order.date}</time>
                  </dd>
                </div>

                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Number of items</dt>
                  <dd className="font-medium">{order.items}</dd>
                </div>

                <div className="flex justify-between gap-4 border-t border-slate-100 pt-4">
                  <dt className="font-semibold">Order total</dt>
                  <dd className="text-lg font-bold tabular-nums">
                    {currencyFormatter.format(order.total)}
                  </dd>
                </div>
              </dl>
            </section>

            <OrderReturnSection
              key={order.id}
              order={order}
              isSaving={isSaving}
              onRequestReturn={onRequestReturn}
            />

            {order.returnRequest && (
              <ReturnProcessing
                request={order.returnRequest}
                isSaving={isSaving}
                onStatusChange={onReturnStatusChange}
              />
            )}

            <section
              aria-labelledby="history-title"
              className="rounded-2xl border border-slate-200 p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <h3 id="history-title" className="font-semibold">
                  Order history
                </h3>
                <span className="text-xs text-slate-400">KST</span>
              </div>

              <ol className="mt-5">
                {order.history.map((event, index) => {
                  const isLatest = index === order.history.length - 1;

                  return (
                    <li
                      key={event.id}
                      className="relative ml-1 border-l border-slate-200 pb-6 pl-5 last:border-transparent last:pb-0"
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute top-1 -left-[5px] size-[9px] rounded-full ring-4 ring-white ${
                          isLatest ? "bg-indigo-600" : "bg-slate-300"
                        }`}
                      />

                      <p className="text-sm font-medium">
                        {eventLabels[event.status]}
                      </p>

                      <time
                        dateTime={event.createdAt}
                        className="mt-1 block text-xs text-slate-500"
                      >
                        {dateFormatter.format(
                          new Date(event.createdAt),
                        )}
                      </time>

                      <p className="mt-1 text-xs text-slate-400">
                        By {event.actor}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>
        </>
      )}
    </dialog>
  );
}
