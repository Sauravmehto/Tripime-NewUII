import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container className="py-16 text-center">
      <h1 className="text-2xl font-bold text-ink">Page not found</h1>
      <p className="mt-2 text-sm text-ink-muted">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link href="/" className="mt-6 inline-block">
        <Button>Back to home</Button>
      </Link>
    </Container>
  );
}
