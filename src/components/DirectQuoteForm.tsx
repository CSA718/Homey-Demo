import { useState } from "react";
import { submitDirectQuote } from "../lib/directQuotes";

export default function DirectQuoteForm({
  builderAccountId,
  builderName,
  onSent,
}: {
  builderAccountId: string;
  builderName: string;
  onSent: () => void;
}) {
  const [consumerName, setConsumerName] = useState("");
  const [consumerEmail, setConsumerEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!consumerName.trim() || !consumerEmail.trim() || !value) {
      setError("Enter the consumer's name, email, and a quote amount.");
      return;
    }
    setError(null);
    setSending(true);
    try {
      await submitDirectQuote({
        builderAccountId,
        builderName,
        consumerEmail,
        consumerName,
        amount: value,
        message: message.trim(),
      });
      setConsumerName("");
      setConsumerEmail("");
      setAmount("");
      setMessage("");
      setSent(true);
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send quote.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-paper-raised p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Send a direct quote
      </p>
      <h2 className="mt-1 font-serif text-xl text-ink">
        Quote a lead from outside ClearParcel
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        For a lead that came in some other way — a phone call, a referral,
        someone at an open house. Enter their info and a number; it lands
        in their ClearParcel account as soon as they have one with this email.
      </p>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="quoteConsumerName" className="block text-sm font-medium text-ink">
              Consumer name
            </label>
            <input
              id="quoteConsumerName"
              type="text"
              value={consumerName}
              onChange={(e) => setConsumerName(e.target.value)}
              placeholder="Jordan Silva"
              className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
            />
          </div>
          <div>
            <label htmlFor="quoteConsumerEmail" className="block text-sm font-medium text-ink">
              Consumer email
            </label>
            <input
              id="quoteConsumerEmail"
              type="email"
              value={consumerEmail}
              onChange={(e) => setConsumerEmail(e.target.value)}
              placeholder="jordan@example.com"
              className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
            />
          </div>
        </div>
        <div>
          <label htmlFor="quoteAmount" className="block text-sm font-medium text-ink">
            Quote amount
          </label>
          <div className="relative mt-2 max-w-xs">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft">
              $
            </span>
            <input
              id="quoteAmount"
              type="number"
              min={0}
              step={500}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper py-2.5 pl-8 pr-3 text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
            />
          </div>
        </div>
        <div>
          <label htmlFor="quoteMessage" className="block text-sm font-medium text-ink">
            Note <span className="text-ink-soft">(optional)</span>
          </label>
          <textarea
            id="quoteMessage"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="e.g. what's included, availability, how you two connected"
            className="mt-2 w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-ink placeholder:text-ink-soft/50 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
        </div>
        {error && <p className="rounded-lg bg-flag-bg px-4 py-3 text-sm text-flag">{error}</p>}
        <button
          type="submit"
          disabled={sending}
          className="rounded-full bg-forest px-6 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-forest-dark disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send quote"}
        </button>
        {sent && !sending && <span className="ml-3 text-sm text-clear">Sent ✓</span>}
      </form>
    </div>
  );
}
