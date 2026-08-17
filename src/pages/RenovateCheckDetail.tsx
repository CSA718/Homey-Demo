import { Link, Navigate, useParams } from "react-router-dom";
import { useRenoAuth } from "../context/RenoAuthContext";
import { getCheck } from "../lib/renoChecks";
import RenovationEstimateCard from "../components/RenovationEstimateCard";

export default function RenovateCheckDetail() {
  const { checkId } = useParams();
  const { account } = useRenoAuth();
  if (!account) return null;

  const check = checkId ? getCheck(account.id, checkId) : null;
  if (!check) return <Navigate to="/renovate/dashboard" replace />;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <Link to="/renovate/dashboard" className="text-sm font-medium text-forest hover:underline">
        ← Back to your checks
      </Link>
      <div className="mt-6">
        <RenovationEstimateCard estimate={check.estimate} />
      </div>
    </div>
  );
}
