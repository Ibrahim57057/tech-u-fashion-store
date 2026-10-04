import { useState } from "react";
import { Send } from "lucide-react";
import { apiFetchWithMeta } from "../lib/apiClient.js";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";

/**
 * Footer newsletter form. Talks to POST /api/v1/newsletter/subscribe.
 * The backend is idempotent, so submitting an address twice succeeds —
 * this just reflects whatever the server said back.
 */
export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [message, setMessage] = useState("");

  async function handleSubscribe(e) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await apiFetchWithMeta("/newsletter/subscribe", {
        method: "POST",
        body: { email },
      });
      setStatus("done");
      setMessage(
        res.message ||
          (res.data?.alreadySubscribed
            ? "You're already on the list."
            : "Thanks — you're subscribed!"),
      );
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err.message);
    }
  }

  const inputClass = "bg-white";

  return (
    <form onSubmit={handleSubscribe} noValidate className="max-w-sm">
      <div className="flex gap-2">
        <Input
          type="email"
          required
          placeholder="you@example.com"
          aria-label="Email address for the newsletter"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <Button
          type="submit"
          size="md"
          aria-label="Subscribe"
          disabled={status === "loading"}>
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {message && (
        <p
          role="status"
          className={`mt-2 text-xs ${
            status === "error" ? "text-danger" : "text-success"
          }`}>
          {message}
        </p>
      )}
    </form>
  );
}