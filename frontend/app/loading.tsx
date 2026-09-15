import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/card";

export default function Loading() {
  return (
    <Container className="py-12">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-4 h-4 w-96" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </Container>
  );
}
