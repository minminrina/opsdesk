"use client";

import type {
  ReturnStatus,
  ReturnSummary,
} from "@/lib/return-types";
import {
  returnActionLabels,
  returnTransitions,
} from "@/lib/return-workflow";

type ReturnProcessingProps = {
  request: ReturnSummary;
  isSaving: boolean;
  onStatusChange: (nextStatus: ReturnStatus) => void;
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export function ReturnProcessing({
  request,
  isSaving,
  onStatusChange,
}: ReturnProcessingProps) {
  const availableStatuses = returnTransitions[request.status];

  return (
    <section className="space-y-5 border-t border-slate-200 pt-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          Process return
        </h3>

        <p
          className="mt-2 text-sm text-slate-600"
          aria-live="polite"
        >
          Current status:{" "}
          <span className="font-medium text-slate-900">
            {request.status}
          </span>
        </p>
      </div>

      {availableStatuses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableStatuses.map((nextStatus) => (
            <button
              key={nextStatus}
              type="button"
              disabled={isSaving}
              onClick={() => onStatusChange(nextStatus)}
              className={
                nextStatus === "Rejected"
                  ? "rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  : "rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              }
            >
              {returnActionLabels[nextStatus]}
            </button>
          ))}
        </div>
      )}

      {request.status === "Approved" && (
        <p className="text-sm text-slate-500">
          Confirm receipt only after the returned items have arrived.
        </p>
      )}

      {request.status === "Received" && (
        <p className="text-sm text-slate-500">
          The next action records a demo refund. No real payment is made.
        </p>
      )}

      {request.status === "Rejected" && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          This return request was rejected and is now closed.
        </p>
      )}

      {request.status === "Refunded" && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          Demo refund completed. This return is now closed.
        </p>
      )}

      <div>
        <h4 className="text-sm font-semibold text-slate-900">
          Return history
        </h4>

        <ol className="mt-3 space-y-3">
          {request.history.map((event) => (
            <li
              key={event.id}
              className="border-l-2 border-violet-200 pl-3"
            >
              <p className="text-sm font-medium text-slate-900">
                {event.status}
              </p>

              <p className="mt-1 break-words text-xs text-slate-500">
                {event.actor}
              </p>

              <time
                dateTime={event.createdAt}
                className="mt-1 block text-xs text-slate-500"
              >
                {dateFormatter.format(new Date(event.createdAt))}
                {" · Seoul"}
              </time>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
