export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDocContent {
  eyebrow: string;
  title: string;
  intro: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export const PRIVACY_CONTENT: LegalDocContent = {
  eyebrow: "Legal",
  title: "Privacy Policy",
  intro:
    "This Privacy Policy explains how Tripime (“we”, “us”) collects, uses, and shares personal information when you use our website and travel services in India. It describes our current product practices in plain language.",
  lastUpdated: "3 October 2026",
  sections: [
    {
      id: "who-we-are",
      title: "Who we are",
      paragraphs: [
        "Tripime is operated under TRIPIME TRIPS. Our office address is Building No-3, FFS-11, First Floor, Ansal Chambers-1, Bhikaji Cama Place, New Delhi - 110066.",
        "You can reach us by email at info@tripime.com, by phone at +91 98996 44177, or on WhatsApp using the same number.",
      ],
    },
    {
      id: "what-we-collect",
      title: "What we collect",
      paragraphs: [
        "We collect information you choose to give us and some technical details needed to run the site.",
      ],
      bullets: [
        "Enquiry and contact forms: name, email, phone, travel month, number of travellers, and your message (including package or visa context when relevant).",
        "Customer profile (optional lead capture): name, email, phone number with country code, consent time, signup page, and login activity for greeting and form prefilling only.",
        "Flight bookings: passenger details and contact information required to issue tickets and send confirmations.",
        "Technical data: limited logs such as flight-search records (including IP address where stored) to operate and secure the service.",
      ],
    },
    {
      id: "how-we-use",
      title: "How we use your information",
      paragraphs: [
        "We use personal information only for travel-related purposes you would reasonably expect.",
      ],
      bullets: [
        "Responding to enquiries by call, WhatsApp, or email.",
        "Helping you plan packages, visas, and itineraries with a Tripime expert.",
        "Prefilling enquiry forms when you have saved a customer profile.",
        "Completing flight bookings and sending tickets or invoices.",
        "Improving site reliability, preventing abuse (including rate limits), and responding to support requests.",
      ],
    },
    {
      id: "payments",
      title: "Payments and card data",
      paragraphs: [
        "When you pay for a booking, your card number and CVV are validated in your browser only. Tripime does not send or store full card number or CVV on our servers.",
        "Payment processing may involve third-party payment partners required to complete the transaction.",
      ],
    },
    {
      id: "sharing",
      title: "How we share information",
      paragraphs: [
        "We do not sell your personal information.",
        "We may share details with airlines, travel suppliers, and payment partners only as needed to fulfil a booking or enquiry you requested. We may also disclose information if required by law or to protect our rights and users’ safety.",
      ],
    },
    {
      id: "retention",
      title: "How long we keep data",
      paragraphs: [
        "We keep personal information for as long as needed to provide bookings and support, meet legal or accounting obligations, and resolve disputes. Lead and booking records are stored in our operational systems (including file-based admin stores used by the current platform).",
        "You can clear your local customer-profile session anytime using Log out in the site header.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies and local storage",
      paragraphs: [
        "We use browser storage to keep the site usable—for example, a customer-profile session token and a short-lived preference for dismissing the profile popup. These are not used to unlock bookings or invoices by themselves.",
      ],
    },
    {
      id: "your-choices",
      title: "Your choices",
      paragraphs: [
        "You may contact us to ask about access, correction, or deletion of lead or enquiry data where we can reasonably do so. If you registered a customer profile, Log out removes the session from your browser; ask us if you also want the stored profile record reviewed.",
        "You can choose not to use the optional profile popup and still browse flights and packages.",
      ],
    },
    {
      id: "children",
      title: "Children",
      paragraphs: [
        "Tripime is not directed at children under 18. If you believe a child has provided personal information, contact us and we will take appropriate steps.",
      ],
    },
    {
      id: "changes",
      title: "Changes to this policy",
      paragraphs: [
        "We may update this Privacy Policy as the product evolves. The “Last updated” date at the top of this page will change when we do. Continued use of the site after an update means you should review the revised policy.",
      ],
    },
    {
      id: "contact",
      title: "Contact us about privacy",
      paragraphs: [
        "For privacy questions or requests, email info@tripime.com, call +91 98996 44177, or message us on WhatsApp. We will respond as promptly as we reasonably can.",
      ],
    },
  ],
};
