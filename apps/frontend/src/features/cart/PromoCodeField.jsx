import { useState } from "react";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";

export default function PromoCodeField() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState(null);

  function apply(e) {
    e.preventDefault();
    if (!code) return;
    // No real backend yet — this just proves the interaction. Real
    // validation (expiry, usage limit, minimum spend) comes from the
    // orders/discounts API later.
    setMessage({ type: "error", text: "Invalid or expired code." });
  }

  return (
    <form onSubmit={apply} className='flex gap-2'>
      <Input
        placeholder='Promo code'
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className='flex-1'
      />
      <Button type='submit' variant='outline' size='md'>
        Apply
      </Button>
      {message && (
        <p className='text-xs text-danger mt-1 basis-full'>{message.text}</p>
      )}
    </form>
  );
}
