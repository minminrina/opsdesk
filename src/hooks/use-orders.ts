"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  OrderMutationResult,
  StoredOrder,
} from "@/lib/order-types";

class OrdersFetchError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "OrdersFetchError";
  }
}

function isAccessError(error: Error | null) {
  return (
    error instanceof OrdersFetchError &&
    (error.status === 401 || error.status === 403)
  );
}

async function fetchOrders(
  signal: AbortSignal,
): Promise<StoredOrder[]> {
  const response = await fetch("/api/orders", {
    signal,
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    const message =
      response.status === 401
        ? "Your session has expired. Sign in again."
        : response.status === 403
          ? "You do not have access to orders."
          : "Could not refresh orders. Showing the last loaded data.";

    throw new OrdersFetchError(message, response.status);
  }

  // Наш сервер возвращает сериализованный массив StoredOrder[].
  const data: StoredOrder[] = await response.json();

  if (!Array.isArray(data)) {
    throw new OrdersFetchError(
      "Unexpected response from the server.",
      502,
    );
  }

  return data;
}

export function useOrders(
  initialOrders: StoredOrder[],
  userId: string,
  isSaving: boolean,
) {
  const queryClient = useQueryClient();
  const queryKey = ["orders", userId] as const;

  const ordersQuery = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchOrders(signal),
    initialData: initialOrders,
    staleTime: 0,

    enabled: (query) =>
      !isSaving && !isAccessError(query.state.error),

    refetchInterval: (query) =>
      isAccessError(query.state.error) ? false : 5_000,

    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,

    retry: (failureCount, error) =>
      !isAccessError(error) && failureCount < 1,
  });

  const mutation = useMutation({
    mutationFn: (
      action: () => Promise<OrderMutationResult>,
    ) => action(),

    retry: false,

    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey,
      });
    },

    onSuccess: async (result) => {
      if (!result.ok) {
        return;
      }

      // Отменяем чтения, которые могли начаться перед
      // приостановкой автоматического обновления.
      await queryClient.cancelQueries({
        queryKey,
      });

      queryClient.setQueryData<StoredOrder[]>(
        queryKey,
        (current) =>
          (current ?? initialOrders).map((order) =>
            order.id === result.order.id &&
            order.version <= result.order.version
              ? result.order
              : order,
          ),
      );
    },

    onSettled: async () => {
      // После завершения сохранения запрос снова включится
      // и получит актуальные данные, в том числе после конфликта.
      await queryClient.invalidateQueries({
        queryKey,
      });
    },
  });

  return {
    orders: ordersQuery.data,
    isFetching: ordersQuery.isFetching,
    isPaused: ordersQuery.isPaused,
    refreshError: ordersQuery.error,
    accessDenied: isAccessError(ordersQuery.error),
    refetch: ordersQuery.refetch,
    executeMutation: mutation.mutateAsync,
  };
}
