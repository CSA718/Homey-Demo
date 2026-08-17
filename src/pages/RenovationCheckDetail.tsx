import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useConsumerAuth } from "../context/ConsumerAuthContext";
import { getCheck, type SavedRenovationCheck } from "../lib/renoChecks";
import RenovationEstimateCard from "../components/RenovationEstimateCard";

export default function RenovationCheckDetail() {
  const { checkId } = useParams();
  const { account } = useConsumerAuth();
  const [check, setCheck] = useState<SavedRenovationCheck | null | undefined>(undefined);

  useEffect(() => {
    if (!account || !checkId) return;
    let active = true;
    getCheck(account.id, checkId).then((c) => active && setCheck(c));
    return () => {
      active = false;
    };
  }, [account, checkId]);

  if (!account) return null;
  if (check === undefined) return null;
  if (!check) return <Navigate to="/account" replace />;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <Link to="/account" className="text-sm font-medium text-forest hover:underline">
        ← Back to your account
      </Link>
      <div className="mt-6">
        <RenovationEstimateCard estimate={check.estimate} />
      </div>
    </div>
  );
}
