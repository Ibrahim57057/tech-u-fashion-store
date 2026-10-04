import FadeIn from "../components/ui/FadeIn.jsx";
import Breadcrumbs from "../layout/Breadcrumbs.jsx";
import { usePageSEO } from "../hooks/usePageSEO.js";
import { Link } from "react-router-dom";

/**
 * One renderer for the footer's informational pages (privacy, terms,
 * delivery, returns). Each one is just a title plus a set of sections,
 * so they share a layout instead of four near-identical page files.
 */
export default function PolicyPage({ title, intro, sections = [], seo }) {
  usePageSEO({
    title: seo?.title ?? title,
    description: seo?.description ?? intro,
  });

  return (
    <div className='px-6 py-12 max-w-3xl mx-auto'>
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: title },
        ]}
      />

      <FadeIn>
        <h1 className='font-display font-bold text-3xl text-brand-dark mb-4'>
          {title}
        </h1>
        {intro && <p className='text-neutral-600 mb-8'>{intro}</p>}

        <div className='space-y-8'>
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className='font-display font-semibold text-lg text-brand-dark mb-2'>
                {section.heading}
              </h2>
              <div className='space-y-3 text-neutral-600'>
                {section.body.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
              {section.list && (
                <ul className='list-disc list-inside space-y-1 mt-3 text-neutral-600'>
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <p className='mt-10 text-sm text-neutral-500'>
          Questions about this?{" "}
          <Link
            to='/contact'
            className='text-brand-accent hover:underline font-medium'>
            Contact us
          </Link>
          .
        </p>
      </FadeIn>
    </div>
  );
}