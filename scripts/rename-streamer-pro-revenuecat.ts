import {
  listEntitlements,
  listOfferings,
  listPackages,
  listProducts,
  updateEntitlement,
  updateOffering,
  updatePackage,
  updateProduct,
} from "@replit/revenuecat-sdk";
import { getUncachableRevenueCatClient } from "./revenueCatClient";

async function requireData<T>(label: string, response: { data?: T; error?: unknown }): Promise<T> {
  if (response.error || !response.data) {
    throw new Error(`${label}: ${JSON.stringify(response.error ?? "missing response data")}`);
  }
  return response.data;
}

async function main() {
  const client = await getUncachableRevenueCatClient();
  const projects = await requireData<any>("List projects", await client.get({
    url: "/projects",
    query: { limit: 100 },
  }));
  const project = projects.items?.find((item: any) => item.name === "Gamefolio");
  if (!project?.id) throw new Error("Gamefolio RevenueCat project was not found");

  const [products, entitlements, offerings] = await Promise.all([
    listProducts({ client, path: { project_id: project.id }, query: { limit: 100 } }).then((r) => requireData<any>("List products", r)),
    listEntitlements({ client, path: { project_id: project.id }, query: { limit: 100 } }).then((r) => requireData<any>("List entitlements", r)),
    listOfferings({ client, path: { project_id: project.id }, query: { limit: 100 } }).then((r) => requireData<any>("List offerings", r)),
  ]);

  const entitlement = entitlements.items?.find((item: any) => item.lookup_key === "streamer_partner");
  const offering = offerings.items?.find((item: any) => item.lookup_key === "Gamefolio Streamer Partner");
  if (!entitlement?.id || !offering?.id) throw new Error("Streamer RevenueCat catalog was not found");

  await requireData("Rename entitlement", await updateEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
    body: { display_name: "Gamefolio Streamer Pro" },
  }));
  await requireData("Rename offering", await updateOffering({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    body: { display_name: "Gamefolio Streamer Pro" },
  }));

  const packageList = await requireData<any>("List packages", await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 100 },
  }));

  for (const pkg of packageList.items ?? []) {
    const yearly = pkg.lookup_key === "$rc_annual";
    await requireData("Rename package", await updatePackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
      body: { display_name: yearly ? "Streamer Pro Annual" : "Streamer Pro Monthly" },
    }));
  }

  for (const product of products.items ?? []) {
    if (!String(product.store_identifier).includes("streamer_partner")) continue;
    const yearly = String(product.store_identifier).includes("year");
    const platform = product.app_id === "appb0fb7fc89c" ? "Web" : "iOS";
    await requireData("Rename product", await updateProduct({
      client,
      path: { project_id: project.id, product_id: product.id },
      body: { display_name: `Gamefolio Streamer Pro ${platform} ${yearly ? "Annual" : "Monthly"}` },
    }));
  }

  console.log("RevenueCat Streamer entitlement, offering, packages, and products renamed to Streamer Pro.");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "RevenueCat rename failed");
  process.exitCode = 1;
});