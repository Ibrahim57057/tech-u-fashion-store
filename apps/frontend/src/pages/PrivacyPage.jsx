import PolicyPage from "./PolicyPage.jsx";

const content = {
  sections: [
    {
      heading: "What we collect",
      body: [
        "When you place an order we collect your name, email address, phone number and delivery address. We also keep a record of the items you ordered so we can handle returns and support requests.",
      ],
    },
    {
      heading: "Payment details",
      body: [
        "Card payments are processed by Paystack. We never see or store your full card number — it goes straight from you to Paystack over an encrypted connection, and only the last four digits are kept for your receipt.",
      ],
    },
    {
      heading: "Cookies",
      body: [
        "We use a small number of cookies to keep you signed in and to remember your cart. Analytics cookies help us understand which pages are useful. You can clear these at any time in your browser settings.",
      ],
    },
    {
      heading: "Who we share it with",
      body: [
        "We share only what's needed to fulfil your order: your address goes to our delivery partner, and your email goes to Paystack for payment processing. We do not sell your data to anyone.",
      ],
    },
    {
      heading: "Your choices",
      body: [
        "You can ask us to correct or delete your data at any time by emailing support@techu.ng. If you subscribed to the newsletter, every email we send includes an unsubscribe link.",
      ],
    },
  ],
};

export default function PrivacyPage() {
  return (
    <PolicyPage
      title='Privacy policy'
      intro='How TECH-U Fashion Store collects, uses and protects your information.'
      seo={{
        title: "Privacy policy",
        description:
          "How TECH-U Fashion Store collects, uses and protects your information.",
      }}
      {...content}
    />
  );
}