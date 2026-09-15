"use client";

import { Bus, Hotel } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Reveal } from "@/components/motion/reveal";
import { LeadEnquiryForm } from "@/components/enquiries/lead-enquiry-form";
import { Badge, Card } from "@/components/ui/card";
import type { ServiceType } from "@/types";

export function ComingSoonProductPage({
  product,
  title,
  description,
  icon: Icon,
  serviceType,
}: {
  product: string;
  title: string;
  description: string;
  icon: typeof Hotel;
  serviceType: ServiceType;
}) {
  return (
    <div className="relative isolate overflow-hidden border-b border-neutral-200/70">
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary-50/70 via-canvas to-accent-soft/30"
        aria-hidden
      />
      <Container className="relative py-12 sm:py-16">
        <Reveal>
          <Card className="mx-auto max-w-lg rounded-2xl shadow-elevated">
            <div className="text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary-600 to-primary-800 text-white">
                <Icon className="size-6" aria-hidden />
              </span>
              <div className="mt-4 flex items-center justify-center gap-2">
                <h1 className="text-2xl font-bold text-ink">{title}</h1>
                <Badge tone="accent">Coming soon</Badge>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</p>
            </div>
            <div className="mt-6">
              <LeadEnquiryForm
                source="service"
                serviceType={serviceType}
                title={`Enquire about ${product.toLowerCase()}`}
                submitLabel="Send enquiry"
              />
            </div>
          </Card>
        </Reveal>
      </Container>
    </div>
  );
}

export function HotelsPageView() {
  return (
    <ComingSoonProductPage
      product="Hotels"
      title="Hotels"
      description="Online hotel booking is launching soon. Leave your details and our travel experts will help you book stays today."
      icon={Hotel}
      serviceType="hotel"
    />
  );
}

export function BusesPageView() {
  return (
    <ComingSoonProductPage
      product="Buses"
      title="Buses"
      description="Bus booking is launching soon. Leave your details and our travel experts will help you book coaches today."
      icon={Bus}
      serviceType="bus"
    />
  );
}
