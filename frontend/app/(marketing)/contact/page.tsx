import { Mail, MessageCircle, Phone } from "lucide-react";
import { Container } from "@/components/layout/container";
import { LeadEnquiryForm } from "@/components/enquiries/lead-enquiry-form";
import { Card } from "@/components/ui/card";
import { HELPLINE_DISPLAY, SUPPORT_EMAIL, mailLink, telLink, whatsappLink } from "@/lib/contact";

export const metadata = {
  title: "Contact",
  description: "Call, WhatsApp, or send an enquiry to Tripime.",
};

const CHANNELS = [
  {
    icon: Phone,
    title: "Call us",
    body: HELPLINE_DISPLAY,
    href: telLink(),
  },
  {
    icon: MessageCircle,
    title: "WhatsApp",
    body: "Chat with a travel expert",
    href: whatsappLink("Hi Tripime, I have a question."),
  },
  {
    icon: Mail,
    title: "Email",
    body: SUPPORT_EMAIL,
    href: mailLink(),
  },
];

export default function ContactPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
          Contact us
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink">We are here to help</h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-muted">
          Share your trip idea and a Tripime expert will get back on call or WhatsApp.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {CHANNELS.map(({ icon: Icon, title, body, href }) => (
            <a
              key={title}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noreferrer" : undefined}
              className="group flex items-center gap-3 rounded-xl border border-neutral-200/80 bg-white p-4 shadow-xs transition duration-300 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-medium"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                <Icon className="size-4" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{title}</span>
                <span className="block text-xs text-ink-muted">{body}</span>
              </span>
            </a>
          ))}
        </div>

        <Card className="mt-6">
          <LeadEnquiryForm source="contact" submitLabel="Send message" />
        </Card>
      </div>
    </Container>
  );
}
