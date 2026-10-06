import FadeIn from "../components/ui/FadeIn.jsx";
import { usePageSEO } from "../hooks/usePageSEO.js";

export default function AboutPage() {
  usePageSEO({
    title: "About us",
    description: "Learn more about TECH-U Fashion Store.",
  });

  return (
    <div className='px-4 sm:px-6 py-16 max-w-3xl mx-auto'>
      <FadeIn>
        <h1 className='font-display font-bold text-3xl text-brand-dark mb-6'>
          About TECH-U
        </h1>
        <div className='space-y-4 text-neutral-600'>
          <p>
            TECH-U is a Nigerian fashion and sneaker store built for people who
            want quality streetwear without the guesswork — accurate sizing,
            honest photos, and delivery you can actually track.
          </p>
          <p>
            We started with one simple idea: online shopping in Nigeria should
            feel as easy and trustworthy as walking into your favorite store.
            That means real product photos, clear return policies, and payment
            options that work for how people actually pay — card, bank transfer,
            USSD, or on delivery.
          </p>
          <p>
            Every order is packed with care and shipped from Lagos, with
            delivery tracking so you're never left wondering where your order
            is.
          </p>
        </div>
      </FadeIn>
    </div>
  );
}
