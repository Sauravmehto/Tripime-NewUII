"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/card";
import { FlightsResultsView } from "@/components/flights/flights-results-view";

export function FlightsPageClient() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
          <Skeleton className="h-20" />
          <Skeleton className="h-12" />
          <Skeleton className="h-36" />
        </div>
      }
    >
      <FlightsResultsView />
    </Suspense>
  );
}
