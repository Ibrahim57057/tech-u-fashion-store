import { useState } from "react";
import Button from "../components/ui/Button.jsx";

const STORAGE_KEY = "techu-cookie-consent";

export default function CookieConsent() {
  // Read once during the initial render rather than in an effect: the
  // banner is either already agreed to or it isn't, and that can't
  // change without a reload. An effect here would only cause a second
  // render pass before the banner could appear.
  const [visible, setVisible] = useState(
    () => !localStorage.getItem(STORAGE_KEY),
  );

  function accept() {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className='fixed bottom-0 left-0 right-0 z-40 bg-brand-dark text-white px-4 py-4 md:px-6 flex flex-col md:flex-row items-center gap-3 justify-between'>
      <p className='text-sm text-neutral-300'>
        We use cookies to improve your shopping experience. By using TECH-U, you
        agree to our{" "}
        <a href='/privacy' className='underline hover:text-white'>
          privacy policy
        </a>
        .
      </p>
      <Button size='sm' onClick={accept} className='shrink-0'>
        Accept
      </Button>
    </div>
  );
}
