import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useConsumerAuth } from "../context/ConsumerAuthContext";
import { getLotCheck, type SavedLotCheck } from "../lib/lotCheckHistory";

// The full report page already has everything (screening, budget fit,
// floor plan, connect, bids) driven off the same query params, so a saved
// Lot Check's "detail page" is just a redirect back into it.
export default function LotCheckHistoryDetail() {
  const { checkId } = useParams();
  const { account } = useConsumerAuth();
  const [entry, setEntry] = useState<SavedLotCheck | null | undefined>(undefined);

  useEffect(() => {
    if (!account || !checkId) return;
    let active = true;
    getLotCheck(account.id, checkId).then((e) => active && setEntry(e));
    return () => {
      active = false;
    };
  }, [account, checkId]);

  if (!account) return null;
  if (entry === undefined) return null;
  if (!entry) return <Navigate to="/account" replace />;
  return <Navigate to={`/report?${entry.reportParams}`} replace />;
}
