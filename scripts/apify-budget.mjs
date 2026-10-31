export const freeBudgetDecision = (user, usage) => {
  const plan = user?.plan;
  const free = String(plan?.tier || plan?.id || "").toUpperCase() === "FREE";
  const included = plan?.monthlyUsageCreditsUsd;
  const used = usage?.totalUsageCreditsUsdAfterVolumeDiscount;
  if (!free || plan?.monthlyBasePriceUsd !== 0 || user?.isPaying === true) {
    return { allowed: false, reason: "free-plan-required" };
  }
  if (typeof included !== "number" || typeof used !== "number" || !Number.isFinite(included) || !Number.isFinite(used) || used < 0) {
    return { allowed: false, reason: "budget-unverified" };
  }
  // Keep a reserve for storage/other usage. Never use more than $4 of free credits.
  const ceiling = Math.min(4, included - 0.5);
  const maxRunUsd = 0.2;
  return {
    allowed: used + maxRunUsd <= ceiling,
    reason: used + maxRunUsd <= ceiling ? "within-free-credit" : "free-credit-reserve",
    usedUsd: used, ceilingUsd: ceiling, maxRunUsd,
  };
};

export const checkApifyFreeBudget = async (token) => {
  const get = async (resource) => {
    const response = await fetch(`https://api.apify.com/v2/${resource}`, {
      headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("budget-unverified");
    return (await response.json()).data;
  };
  try {
    const [user, usage] = await Promise.all([get("users/me"), get("users/me/usage/monthly")]);
    return freeBudgetDecision(user, usage);
  } catch {
    return { allowed: false, reason: "budget-unverified" };
  }
};
