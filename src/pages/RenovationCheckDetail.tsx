import { Link, Navigate, useParams } from "react-router-dom";
import { useConsumerAuth } from "../context/ConsumerAuthContext";
import { getCheck } from "../lib/renoChecks";
import RenovationEstimateCard from "../components/RenovationEstimateCard";

export default function RenovationCheckDetail() {
  const { checkId } = useParams();
  const { account } = useConsumerAuth();
  if (!account) return null;

  const check = checkId ? getCheck(account.id, checkId) : null;
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
