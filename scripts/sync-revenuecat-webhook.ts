/**
 * Sync RevenueCat's webhook authorization header with the server-side secret
 * used by POST /api/revenuecat/webhook.
 *
 * This keeps the credential in environment variables: it is never logged,
 * written to the repository, or sent to the browser.
 */
const apiKey = process.env.REVENUECAT_SECRET_KEY ?? process.env.REVENUECAT_API_KEY;
const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

if (!apiKey) throw new Error("REVENUECAT_SECRET_KEY or REVENUECAT_API_KEY is required");
if (!webhookSecret) throw new Error("REVENUECAT_WEBHOOK_SECRET is required");

const baseUrl = "https://api.revenuecat.com/v2";
const request = (path: string, init: RequestInit = {}) =>
  fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

async function readJson(response: Response) {
  try {
    return await response.json() as any;
  } catch {
    return null;
  }
}

async function main() {
  const projectsResponse = await request("/projects?limit=100");
  const projectsBody = await readJson(projectsResponse);
  if (!projectsResponse.ok) throw new Error(`Unable to list RevenueCat projects (${projectsResponse.status})`);

  const project = projectsBody?.items?.find((item: any) => item?.name === "Gamefolio");
  if (!project?.id) throw new Error("Gamefolio RevenueCat project was not found");

  const webhooksResponse = await request(`/projects/${project.id}/integrations/webhooks?limit=100`);
  const webhooksBody = await readJson(webhooksResponse);
  if (!webhooksResponse.ok) throw new Error(`Unable to list RevenueCat webhooks (${webhooksResponse.status})`);

  const webhook = webhooksBody?.items?.find((item: any) =>
    typeof item?.url === "string" && item.url.endsWith("/api/revenuecat/webhook"),
  );
  if (!webhook?.id) throw new Error("Gamefolio RevenueCat webhook was not found");

  const updateResponse = await request(`/projects/${project.id}/integrations/webhooks/${webhook.id}`, {
    method: "POST",
    body: JSON.stringify({ authorization_header: webhookSecret }),
  });
  if (!updateResponse.ok) throw new Error(`Unable to update RevenueCat webhook (${updateResponse.status})`);

  console.log("RevenueCat webhook authorization header synced.");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "RevenueCat webhook sync failed");
  process.exitCode = 1;
});