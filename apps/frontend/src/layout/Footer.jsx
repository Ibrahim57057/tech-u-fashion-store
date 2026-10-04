import { Link } from "react-router-dom";
import AnimatedLogo from "../components/ui/AnimatedLogo.jsx";
import NewsletterForm from "../components/NewsletterForm.jsx";
import logo from "../assets/tech-u-logo.png";

const footerLinks = {
  Shop: [
    { label: "All products", to: "/products" },
    { label: "Sneakers", to: "/products?category=sneakers" },
    { label: "Clothing", to: "/products?category=clothing" },
  ],
  Help: [
    { label: "Contact us", to: "/contact" },
    { label: "Returns & exchanges", to: "/returns" },
    { label: "Delivery information", to: "/delivery" },
  ],
  Company: [
    { label: "About us", to: "/about" },
    { label: "Privacy policy", to: "/privacy" },
    { label: "Terms of service", to: "/terms" },
  ],
};

const socials = [
  {
    label: "Instagram",
    href: "https://instagram.com/techufashion",
    icon: <InstagramIcon />,
  },
  { label: "X", href: "https://x.com/techufashion", icon: <XIcon /> },
  {
    label: "Facebook",
    href: "https://facebook.com/techufashion",
    icon: <FacebookIcon />,
  },
];

export default function Footer() {
  return (
    <footer className='bg-brand-dark text-neutral-300 mt-16'>
      <div className='max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8'>
        <div className='col-span-2 md:col-span-1'>
          <AnimatedLogo
            src={logo}
            alt='TECH-U Fashion Store'
            className='h-8 w-auto brightness-0 invert mb-3'
          />
          <p className='text-sm'>
            Sneakers and streetwear, delivered across Nigeria.
          </p>
          <div className='flex gap-3 mt-4'>
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target='_blank'
                // noopener stops the opened tab from reaching back
                // through window.opener to this page
                rel='noopener noreferrer'
                aria-label={social.label}
                className='hover:text-white transition-colors'>
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        {Object.entries(footerLinks).map(([heading, links]) => (
          <div key={heading}>
            <h3 className='font-body font-semibold text-white text-sm mb-3'>
              {heading}
            </h3>
            <ul className='space-y-2'>
              {links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className='text-sm hover:text-white transition-colors'>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className='border-t border-neutral-700'>
        <div className='max-w-7xl mx-auto px-6 py-8'>
          <h3 className='font-body font-semibold text-white text-sm mb-3'>
            Stay in the loop
          </h3>
          <p className='text-sm mb-3'>
            New drops and restocks, straight to your inbox. No spam.
          </p>
          <NewsletterForm />
        </div>
      </div>

      <div className='border-t border-neutral-700'>
        <div className='max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs'>
          <p>
            © {new Date().getFullYear()} TECH-U Fashion Store. All rights
            reserved.
          </p>
          <p>Pay by card, bank transfer, USSD, or on delivery (Lagos).</p>
        </div>
      </div>
    </footer>
  );
}

function InstagramIcon() {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='w-5 h-5'
      aria-hidden='true'>
      <rect width='20' height='20' x='2' y='2' rx='5' ry='5' />
      <path d='M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z' />
      <line x1='17.5' x2='17.51' y1='6.5' y2='6.5' />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='currentColor'
      className='w-5 h-5'
      aria-hidden='true'>
      <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='currentColor'
      className='w-5 h-5'
      aria-hidden='true'>
      <path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
    </svg>
  );
}