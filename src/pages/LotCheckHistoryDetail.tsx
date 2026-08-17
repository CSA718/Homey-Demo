import { Navigate, useParams } from "react-router-dom";
import { useConsumerAuth } from "../context/ConsumerAuthContext";
import { getLotChecksForAccount } from "../lib/lotCheckHistory";

// The full report page already has everything (screening, budget fit,
// floor plan, connect, bids) driven off the same query params, so a saved
// Lot Check's "detail page" is just a redirect back into it.
export default function LotCheckHistoryDetail() {
  const { checkId } = useParams();
  const { account } = useConsumerAuth();
  if (!account) return null;

  const entry = checkId
    ? getLotChecksForAccount(account.id).find((c) => c.id === checkId)
    : null;

  if (!entry) return <Navigate to="/account" replace />;
  return <Navigate to={`/report?${entry.reportParams}`} replace />;
}
