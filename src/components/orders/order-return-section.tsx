"use client";

import { useState, type FormEvent } from "react";
import type { StoredOrder } from "@/lib/order-types";
import {
  returnReasons,
  returnReasonLabels,
  type ReturnReason,
} from "@/lib/return-types";

type OrderReturnSectionProps = {
  order: StoredOrder;
  isSaving: boolean;
  onRequestReturn: (reason: ReturnReason, comment: string) => void;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

export function OrderReturnSection({
  order,
  isSaving,
  onRequestReturn,
}: OrderReturnSectionProps) {
  const [reason, setReason] = useState<ReturnReason>("Damaged");
  const [comment, setComment] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    onRequestReturn(reason, comment);
  }

  const request = order.returnRequest;

  return (
    <section
      aria-labelledby="return-title"
      className="rounded-2xl border border-slate-200 p-5"
    >
      <h3 id="return-title" className="font-semibold">
        Return
      </h3>

      {request ? (
        <div className="mt-4 space-y-4">
          <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            {request.status}
          </span>

          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Reason</dt>
              <dd className="mt-1 font-medium">
                {returnReasonLabels[request.reason]}
              </dd>
            </div>

            <div>
              <dt className="text-slate-500">Requested amount</dt>
              <dd className="mt-1 font-semibold">
                {currencyFormatter.format(request.amount)}
              </dd>
            </div>

            {request.comment && (
              <div>
                <dt className="text-slate-500">Comment</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words">
                  {request.comment}
                </dd>
              </div>
            )}
          </dl>

          <p className="text-xs text-slate-500">
            This return request has been saved.
          </p>
        </div>
      ) : order.status !== "Delivered" ? (
        <p className="mt-3 text-sm leading-6 text-slate-500">
          A return can be requested after delivery.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-sm leading-6 text-slate-500">
            Full-order returns are available within 30 days of delivery.
            The request will be reviewed before a refund.
          </p>

          <div>
            <label
              htmlFor="return-reason"
              className="mb-2 block text-sm font-medium"
            >
              Reason
            </label>

            <select
              id="return-reason"
              value={reason}
              disabled={isSaving}
              onChange={(event) =>
                setReason(event.target.value as ReturnReason)
              }
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              {returnReasons.map((value) => (
                <option key={value} value={value}>
                  {returnReasonLabels[value]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="return-comment"
              className="mb-2 block text-sm font-medium"
            >
              Comment {reason === "Other" ? "(required)" : "(optional)"}
            </label>

            <textarea
              id="return-comment"
              rows={3}
              maxLength={1000}
              minLength={reason === "Other" ? 10 : undefined}
              required={reason === "Other"}
              value={comment}
              disabled={isSaving}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Describe the customer's issue..."
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">
              {currencyFormatter.format(order.total)}
            </span>

            <button
              type="submit"
              disabled={
                isSaving ||
                (reason === "Other" && comment.trim().length < 10)
              }
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Request return"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}