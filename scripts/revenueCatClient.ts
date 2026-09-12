import { createClient } from "@replit/revenuecat-sdk/client";

/**
 * Creates a fresh RevenueCat Developer API client for each standalone
 * management script. The API key is supplied through Replit Secrets and is
 * never written to the repository or exposed to the browser.
 */
export async function getUncachableRevenueCatClient() {
  const apiKey = process.env.REVENUECAT_API_KEY;
  if (!apiKey) {
    throw new Error("REVENUECAT_API_KEY is not configured");
  }

  return createClient({
    baseUrl: "https://api.revenuecat.com/v2",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}