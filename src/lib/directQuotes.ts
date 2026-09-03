// Direct quotes — a builder sending a specific dollar number straight to
// a consumer by email, with no existing Lot Check lead or Renovation
// listing required (a lead that came in outside the app: a phone call, a
// referral, a conversation at an open house). Matched to the consumer by
// email at read time, so it reaches them as soon as they have a ClearLot
// account with that email — even if they didn't have one yet when the
// builder sent it.

import { supabase } from "./supabaseClient";

export interface DirectQuote {
  id: string;
  builderAccountId: string;
  builderName: string;
  consumerEmail: string;
  consumerName: string;
  amount: number;
  message: string;
  createdAt: string;
}

interface DirectQuoteRow {
  id: string;
  builder_account_id: string;
  builder_name: string;
  consumer_email: string;
  consumer_name: string;
  amount: number;
  message: string;
  created_at: string;
}

function fromRow(row: DirectQuoteRow): DirectQuote {
  return {
    id: row.id,
    builderAccountId: row.builder_account_id,
    builderName: row.builder_name,
    consumerEmail: row.consumer_email,
    consumerName: row.consumer_name,
    amount: row.amount,
    message: row.message,
    createdAt: row.created_at,
  };
}

export async function submitDirectQuote(
  input: Omit<DirectQuote, "id" | "createdAt">,
): Promise<DirectQuote> {
  const { data, error } = await supabase
    .from("direct_quotes")
    .insert({
      builder_account_id: input.builderAccountId,
      builder_name: input.builderName,
      consumer_email: input.consumerEmail.trim().toLowerCase(),
      consumer_name: input.consumerName.trim(),
      amount: input.amount,
      message: input.message,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to send quote");
  return fromRow(data as DirectQuoteRow);
}

export async function getQuotesSentByBuilder(builderAccountId: string): Promise<DirectQuote[]> {
  const { data, error } = await supabase
    .from("direct_quotes")
    .select("*")
    .eq("builder_account_id", builderAccountId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as DirectQuoteRow[]).map(fromRow);
}

export async function getQuotesForConsumer(email: string): Promise<DirectQuote[]> {
  const { data, error } = await supabase
    .from("direct_quotes")
    .select("*")
    .eq("consumer_email", email.trim().toLowerCase())
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as DirectQuoteRow[]).map(fromRow);
}

// Admin-only: every quote sent, across every builder.
export async function listAllDirectQuotes(): Promise<DirectQuote[]> {
  const { data, error } = await supabase
    .from("direct_quotes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as DirectQuoteRow[]).map(fromRow);
}
