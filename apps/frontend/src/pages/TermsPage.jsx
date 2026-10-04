import PolicyPage from "./PolicyPage.jsx";

const content = {
  sections: [
    {
      heading: "Orders",
      body: [
        "An order is accepted once payment is confirmed and you receive a confirmation email with your order number. We may cancel and refund an order if an item turns out to be unavailable or if we suspect fraud.",
      ],
    },
    {
      heading: "Pricing and payment",
      body: [
        "All prices are in Nigerian Naira and include VAT where applicable. Payment is taken at checkout by card, bank transfer, USSD or on delivery, depending on your delivery zone.",
      ],
    },
    {
      heading: "Delivery",
      body: [
        "Delivery estimates are given at checkout and start from the day your order is confirmed, not the day it is placed. Orders placed after 4pm are confirmed the following business day.",
      ],
    },
    {
      heading: "Your right to cancel",
      body: [
        "You can cancel any order before it ships, at no charge. Email us with your order number and we'll refund you in full within 5 working days.",
      ],
    },
    {
      heading: "Returns",
      body: [
        "Delivered items can be returned within 7 days if they're unworn, unwashed and still in their original packaging. See the returns page for how to start one.",
      ],
    },
    {
      heading: "Liability",
      body: [
        "We've taken care to photograph products accurately, but screens vary and colours can appear slightly different. Your statutory rights aren't affected by anything in these terms.",
      ],
    },
  ],
};

export default function TermsPage() {
  return (
    <PolicyPage
      title='Terms of service'
      intro='The rules for shopping with TECH-U Fashion Store.'
      seo={{
        title: "Terms of service",
        description: "The rules for shopping with TECH-U Fashion Store.",
      }}
      {...content}
    />
  );
}