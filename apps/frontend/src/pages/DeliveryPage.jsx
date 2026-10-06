import FadeIn from "../components/ui/FadeIn.jsx";
import Breadcrumbs from "../layout/Breadcrumbs.jsx";
import { useDeliveryZones } from "../hooks/useDeliveryZones.js";
import { usePageSEO } from "../hooks/usePageSEO.js";
import { formatNaira } from "../lib/formatNaira.js";
import { Truck } from "lucide-react";

/**
 * Delivery information. Fees and timelines are pulled from the live
 * /delivery-zones data (the same source checkout prices from), so this
 * page can't drift out of sync with what a customer is actually charged.
 */
export default function DeliveryPage() {
  usePageSEO({
    title: "Delivery information",
    description:
      "Delivery fees, timelines and payment options across Nigeria from TECH-U Fashion Store.",
  });

  const { data: zones, isLoading } = useDeliveryZones();
  const activeZones = (zones ?? []).filter((z) => z.isActive);

  return (
    <div className='px-4 sm:px-6 py-12 max-w-3xl mx-auto'>
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Delivery information" },
        ]}
      />

      <FadeIn>
        <h1 className='font-display font-bold text-3xl text-brand-dark mb-4'>
          Delivery information
        </h1>
        <p className='text-neutral-600 mb-8'>
          We ship across Nigeria from Lagos. Fees and timelines below are the
          same ones you see at checkout — no surprises on the way out.
        </p>

        <h2 className='font-display font-semibold text-lg text-brand-dark mb-3'>
          Fees and timelines
        </h2>

        {isLoading ? (
          <p className='text-neutral-500 text-sm'>Loading delivery zones…</p>
        ) : activeZones.length === 0 ? (
          <p className='text-neutral-500 text-sm'>
            Delivery zones are being updated. Please check back shortly.
          </p>
        ) : (
          <div className='border border-neutral-200 rounded-card overflow-x-auto'>
            {/* overflow-x-auto, not overflow-hidden: four columns with px-4
                cells need about 330px and a phone gives this table 272px. The
                old overflow-hidden clipped the last two columns with no way to
                reach them, so "Pay on delivery" was simply invisible. */}
            <table className='w-full text-sm min-w-[480px]'>
              <thead className='bg-neutral-50 text-left'>
                <tr>
                  <th className='px-4 py-3 font-semibold text-brand-dark'>
                    Zone
                  </th>
                  <th className='px-4 py-3 font-semibold text-brand-dark'>
                    Fee
                  </th>
                  <th className='px-4 py-3 font-semibold text-brand-dark'>
                    Delivery time
                  </th>
                  <th className='px-4 py-3 font-semibold text-brand-dark'>
                    Pay on delivery
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-neutral-100'>
                {activeZones.map((zone) => (
                  <tr key={zone._id}>
                    <td className='px-4 py-3 text-neutral-700'>{zone.name}</td>
                    <td className='px-4 py-3 text-neutral-700'>
                      {zone.fee > 0 ? formatNaira(zone.fee) : "Free"}
                    </td>
                    <td className='px-4 py-3 text-neutral-700'>
                      {zone.etaDays} working days
                    </td>
                    <td className='px-4 py-3 text-neutral-700'>
                      {zone.codAllowed ? "Available" : "Not available"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 className='font-display font-semibold text-lg text-brand-dark mt-10 mb-3'>
          How it works
        </h2>
        <ol className='space-y-3 text-neutral-600 list-decimal list-inside'>
          <li>Place your order and pay at checkout.</li>
          <li>
            We confirm your order by email, usually within a few hours.
          </li>
          <li>
            Your parcel is packed and handed to our delivery partner, and you
            get a tracking link.
          </li>
          <li>Delivery takes the number of working days listed above.</li>
        </ol>

        <div className='flex items-start gap-3 mt-8 p-4 bg-neutral-50 rounded-card'>
          <Truck className='w-5 h-5 text-brand-accent shrink-0 mt-0.5' />
          <p className='text-sm text-neutral-600'>
            Orders placed after 4pm are confirmed the next business day. Lagos
            deliveries are the quickest; remote areas take a little longer.
          </p>
        </div>
      </FadeIn>
    </div>
  );
}