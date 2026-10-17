"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { OrderDetails } from "@/components/orders/order-details";
import { UserMenu } from "@/components/auth/user-menu";
import { useOrders } from "@/hooks/use-orders";
import {
  orderStatuses,
  type OrderStatus,
} from "@/lib/demo-orders";
import type { StoredOrder } from "@/lib/order-types";
import { canTransitionOrder } from "@/lib/order-workflow";
import { downloadOrdersCsv } from "@/lib/export-orders";
import type {
  ReturnReason,
  ReturnStatus,
} from "@/lib/return-types";
import { canTransitionReturn } from "@/lib/return-workflow";
import { changeOrderStatus } from "@/app/actions/orders";
import { requestOrderReturn } from "@/app/actions/returns";
import { changeReturnStatus } from "@/app/actions/return-status";

const statusStyles: Record<OrderStatus, string> = {
  Pending: "bg-amber-50 text-amber-700 ring-amber-200",
  Processing: "bg-blue-50 text-blue-700 ring-blue-200",
  Shipped: "bg-violet-50 text-violet-700 ring-violet-200",
  Delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Cancelled: "bg-slate-100 text-slate-600 ring-slate-200",
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

type OrderSort =
  | "date-desc"
  | "date-asc"
  | "total-desc"
  | "total-asc";

const PAGE_SIZE = 5;

type OrdersClientProps = {
  initialOrders: StoredOrder[];
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
};

export default function OrdersClient({
  initialOrders,
  currentUser,
}: OrdersClientProps) {
  const [isSaving, setIsSaving] = useState(false);

  const {
    orders,
    isFetching,
    isPaused,
    refreshError,
    accessDenied,
    refetch,
    executeMutation,
  } = useOrders(initialOrders, currentUser.id, isSaving);

  const [saveError, setSaveError] = useState<string | null>(null);
  const savingRef = useRef(false);

  const [sort, setSort] = useState<OrderSort>("date-desc");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | "All">("All");

  const [selectedOrderId, setSelectedOrderId] = useState<
    string | null
  >(null);

  const selectedOrder =
    orders.find((order) => order.id === selectedOrderId) ?? null;

  const query = search.trim().toLowerCase();

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = [
      order.id,
      order.customer,
      order.email,
    ].some((value) => value.toLowerCase().includes(query));

    const matchesStatus =
      status === "All" || order.status === status;

    return matchesSearch && matchesStatus;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let result = 0;

    switch (sort) {
      case "date-desc":
        result = b.date.localeCompare(a.date);
        break;

      case "date-asc":
        result = a.date.localeCompare(b.date);
        break;

      case "total-desc":
        result = b.total - a.total;
        break;

      case "total-asc":
        result = a.total - b.total;
        break;
    }

    return result || b.id.localeCompare(a.id);
  });

  const totalPages = Math.max(
    1,
    Math.ceil(sortedOrders.length / PAGE_SIZE),
  );

  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;

  const paginatedOrders = sortedOrders.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );

  const firstVisible =
    sortedOrders.length === 0 ? 0 : startIndex + 1;

  const lastVisible = Math.min(
    startIndex + PAGE_SIZE,
    sortedOrders.length,
  );

  const activeOrders = orders.filter(
    (order) => order.status !== "Cancelled",
  );

  const orderValue = activeOrders.reduce(
    (sum, order) => sum + order.total,
    0,
  );

  const awaitingProcessing = orders.filter(
    (order) => order.status === "Pending",
  ).length;

  const inProgress = orders.filter(
    (order) =>
      order.status === "Processing" ||
      order.status === "Shipped",
  ).length;

  const metrics = [
    {
      label: "Total orders",
      value: String(orders.length),
    },
    {
      label: "Active order value",
      value: currencyFormatter.format(orderValue),
    },
    {
      label: "Awaiting processing",
      value: String(awaitingProcessing),
    },
    {
      label: "In progress",
      value: String(inProgress),
    },
  ];

  function resetFilters() {
    setSearch("");
    setStatus("All");
    setPage(1);
  }

  async function handleStatusChange(nextStatus: OrderStatus) {
    if (
      savingRef.current ||
      accessDenied ||
      !selectedOrder ||
      !canTransitionOrder(selectedOrder.status, nextStatus)
    ) {
      return;
    }

    if (
      nextStatus === "Cancelled" &&
      !window.confirm(`Cancel order ${selectedOrder.id}?`)
    ) {
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await executeMutation(() =>
        changeOrderStatus(
          selectedOrder.id,
          nextStatus,
          selectedOrder.version,
        ),
      );

      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
    } catch {
      setSaveError(
        "Connection interrupted. Reload the page to check whether the update was saved.",
      );
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  async function handleRequestReturn(
    reason: ReturnReason,
    comment: string,
  ) {
    if (
      savingRef.current ||
      accessDenied ||
      !selectedOrder
    ) {
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await executeMutation(() =>
        requestOrderReturn(
          selectedOrder.id,
          selectedOrder.version,
          reason,
          comment,
        ),
      );

      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
    } catch {
      setSaveError(
        "Connection interrupted. Reload the page to check whether the return was saved.",
      );
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  async function handleReturnStatusChange(
    nextStatus: ReturnStatus,
  ) {
    if (
      savingRef.current ||
      accessDenied ||
      !selectedOrder ||
      !selectedOrder.returnRequest
    ) {
      return;
    }

    if (
      !canTransitionReturn(
        selectedOrder.returnRequest.status,
        nextStatus,
      )
    ) {
      return;
    }

    if (
      nextStatus === "Rejected" &&
      !window.confirm(
        `Reject the return for order ${selectedOrder.id}? This closes the request.`,
      )
    ) {
      return;
    }

    if (
      nextStatus === "Refunded" &&
      !window.confirm(
        `Record a demo refund of ${currencyFormatter.format(
          selectedOrder.returnRequest.amount,
        )} for order ${selectedOrder.id}? No real payment will be made.`,
      )
    ) {
      return;
    }

    const orderId = selectedOrder.id;
    const expectedVersion = selectedOrder.version;

    savingRef.current = true;
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await executeMutation(() =>
        changeReturnStatus(
          orderId,
          expectedVersion,
          nextStatus,
        ),
      );

      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
    } catch {
      setSaveError(
        "Connection interrupted. Reload the page to check the return status.",
      );
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900 lg:flex">
      <aside className="flex flex-col border-b border-slate-200 bg-white p-6 lg:fixed lg:inset-y-0 lg:w-60 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
            O
          </div>

          <span className="text-xl font-bold tracking-tight">
            OpsDesk
          </span>
        </div>

        <p className="mt-9 text-xs font-semibold tracking-widest text-slate-400">
          WORKSPACE
        </p>

        <nav aria-label="Main navigation" className="mt-3">
          <Link
            href="/"
            aria-current="page"
            className="flex items-center justify-between rounded-xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700"
          >
            Orders

            <span className="rounded-md bg-white px-2 py-0.5 text-xs">
              {orders.length}
            </span>
          </Link>
        </nav>

        <div className="mt-8 rounded-xl border border-slate-200 p-4 lg:mt-auto">
          <p className="text-sm font-semibold">
            Demo workspace
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Sample orders · KRW
          </p>
        </div>
      </aside>

      <div className="min-w-0 flex-1 lg:ml-60">
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-6 lg:px-10">
          <p className="text-sm text-slate-500">
            Workspace
            <span className="mx-2 text-slate-300">/</span>
            <span className="font-medium text-slate-900">
              Orders
            </span>
          </p>

          <UserMenu user={currentUser} />
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
          <div>
            <p className="text-xs font-semibold tracking-widest text-indigo-600">
              ORDER MANAGEMENT
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Orders
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Track orders and keep your daily operations moving.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
            <div>
              {refreshError ? (
                <p role="alert" className="text-red-700">
                  {refreshError.message}
                </p>
              ) : (
                <p className="text-slate-500">
                  {isSaving
                    ? "Saving changes…"
                    : isPaused
                      ? "Connection paused. Showing the last loaded data."
                      : isFetching
                        ? "Refreshing orders…"
                        : "Auto-refresh every 5 seconds while this tab is active."}
                </p>
              )}
            </div>

            {accessDenied ? (
              <Link
                href="/login"
                className="font-medium text-indigo-600 underline"
              >
                Sign in again
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={isSaving || isFetching || isPaused}
                className="rounded-lg border border-slate-200 px-3 py-2 font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Refresh now
              </button>
            )}
          </div>

          <section
            aria-label="Order overview"
            className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <p className="text-sm text-slate-500">
                  {metric.label}
                </p>

                <p className="mt-3 text-2xl font-bold tracking-tight">
                  {metric.value}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  All sample orders
                </p>
              </div>
            ))}
          </section>

          <section
            aria-label="Orders"
            className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="font-semibold">
                  All orders
                </h2>

                <p
                  aria-live="polite"
                  className="mt-1 text-sm text-slate-500"
                >
                  {filteredOrders.length} of {orders.length} orders
                </p>
              </div>

              <button
                type="button"
                onClick={() => downloadOrdersCsv(sortedOrders)}
                disabled={sortedOrders.length === 0 || isSaving}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Export CSV
              </button>
            </div>

            <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label
                  htmlFor="order-search"
                  className="mb-2 block text-xs font-medium text-slate-600"
                >
                  Search orders
                </label>

                <input
                  id="order-search"
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Order ID, customer or email..."
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="sm:w-48">
                <label
                  htmlFor="order-status"
                  className="mb-2 block text-xs font-medium text-slate-600"
                >
                  Status
                </label>

                <select
                  id="order-status"
                  value={status}
                  onChange={(event) => {
                    setStatus(
                      event.target.value as OrderStatus | "All",
                    );
                    setPage(1);
                  }}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="All">All statuses</option>

                  {orderStatuses.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                disabled={search === "" && status === "All"}
                className="h-11 rounded-lg border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reset
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
              <p className="text-sm text-slate-500">
                {filteredOrders.length} matching orders
              </p>

              <div className="flex items-center gap-3">
                <label
                  htmlFor="order-sort"
                  className="text-sm text-slate-500"
                >
                  Sort by
                </label>

                <select
                  id="order-sort"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as OrderSort);
                    setPage(1);
                  }}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="date-desc">
                    Newest first
                  </option>

                  <option value="date-asc">
                    Oldest first
                  </option>

                  <option value="total-desc">
                    Highest total
                  </option>

                  <option value="total-asc">
                    Lowest total
                  </option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">
                  Orders matching the current search and status filter
                </caption>

                <thead className="border-y border-slate-100 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 font-medium"
                    >
                      Order
                    </th>

                    <th
                      scope="col"
                      className="px-6 py-3 font-medium"
                    >
                      Customer
                    </th>

                    <th
                      scope="col"
                      className="px-6 py-3 font-medium"
                    >
                      Date
                    </th>

                    <th
                      scope="col"
                      className="px-6 py-3 font-medium"
                    >
                      Status
                    </th>

                    <th
                      scope="col"
                      className="px-6 py-3 text-right font-medium"
                    >
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="px-6 py-5">
                        <button
                          type="button"
                          onClick={() => {
                            setSaveError(null);
                            setSelectedOrderId(order.id);
                          }}
                          aria-haspopup="dialog"
                          aria-label={`View order ${order.id}`}
                          className="rounded text-left font-semibold text-indigo-600 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600"
                        >
                          {order.id}
                        </button>

                        <p className="mt-1 text-xs text-slate-400">
                          {order.items}{" "}
                          {order.items === 1 ? "item" : "items"}
                        </p>
                      </td>

                      <td className="px-6 py-5">
                        <p className="font-medium">
                          {order.customer}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {order.email}
                        </p>
                      </td>

                      <td className="px-6 py-5 text-slate-500">
                        <time dateTime={order.date}>
                          {order.date}
                        </time>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[order.status]}`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-right font-semibold tabular-nums">
                        {currencyFormatter.format(order.total)}
                      </td>
                    </tr>
                  ))}

                  {filteredOrders.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-16 text-center"
                      >
                        <p className="font-semibold">
                          No orders found
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                          Try another search or reset your filters.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-4 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p
                  aria-live="polite"
                  aria-atomic="true"
                  className="text-sm text-slate-600"
                >
                  Showing {firstVisible}–{lastVisible} of{" "}
                  {filteredOrders.length}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  All amounts are shown in South Korean won.
                </p>
              </div>

              <nav
                aria-label="Orders pagination"
                className="flex items-center gap-3"
              >
                <button
                  type="button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="text-sm text-slate-500">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </nav>
            </div>
          </section>
        </main>
      </div>

      <OrderDetails
        order={selectedOrder}
        onDismiss={() => {
          if (savingRef.current) {
            return;
          }

          setSaveError(null);
          setSelectedOrderId(null);
        }}
        onStatusChange={handleStatusChange}
        onRequestReturn={handleRequestReturn}
        onReturnStatusChange={handleReturnStatusChange}
        isSaving={isSaving}
        saveError={saveError}
      />
    </div>
  );
}
