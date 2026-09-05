import {
  listApps,
  listEntitlements,
  listOfferings,
  listPackages,
  listProducts,
  getProductsFromEntitlement,
  getProductsFromPackage,
} from "@replit/revenuecat-sdk";
import { getUncachableRevenueCatClient } from "./revenueCatClient";

async function main() {
  const client = await getUncachableRevenueCatClient();

  const projectsResponse = await client.get({
    url: "/projects",
    query: { limit: 100 },
  });
  if (projectsResponse.error) throw new Error(`Unable to list projects: ${JSON.stringify(projectsResponse.error)}`);

  const projects = (projectsResponse.data as any)?.items ?? [];
  const project = projects.find((item: any) => item?.name === "Gamefolio") ?? projects[0];
  if (!project?.id) throw new Error("No RevenueCat project found");

  const [appsResponse, productsResponse, entitlementsResponse, offeringsResponse] = await Promise.all([
    listApps({ client, path: { project_id: project.id }, query: { limit: 100 } }),
    listProducts({ client, path: { project_id: project.id }, query: { limit: 100 } }),
    listEntitlements({ client, path: { project_id: project.id }, query: { limit: 100 } }),
    listOfferings({ client, path: { project_id: project.id }, query: { limit: 100 } }),
  ]);

  for (const [label, response] of [
    ["apps", appsResponse],
    ["products", productsResponse],
    ["entitlements", entitlementsResponse],
    ["offerings", offeringsResponse],
  ] as const) {
    if (response.error) throw new Error(`Unable to list ${label}: ${JSON.stringify(response.error)}`);
  }

  const offerings = (offeringsResponse.data as any)?.items ?? [];
  const offeringDetails = [];
  for (const offering of offerings) {
    const packagesResponse = await listPackages({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      query: { limit: 100 },
    });
    if (packagesResponse.error) throw new Error(`Unable to list packages: ${JSON.stringify(packagesResponse.error)}`);

    const packages = (packagesResponse.data as any)?.items ?? [];
    const packageDetails = [];
    for (const pkg of packages) {
      const packageProducts = await getProductsFromPackage({
        client,
        path: { project_id: project.id, package_id: pkg.id },
      });
      if (packageProducts.error) throw new Error(`Unable to list package products: ${JSON.stringify(packageProducts.error)}`);
      packageDetails.push({ package: pkg, products: packageProducts.data });
    }
    offeringDetails.push({ offering, packages: packageDetails });
  }

  const entitlements = (entitlementsResponse.data as any)?.items ?? [];
  const entitlementDetails = [];
  for (const entitlement of entitlements) {
    const entitlementProducts = await getProductsFromEntitlement({
      client,
      path: { project_id: project.id, entitlement_id: entitlement.id },
    });
    if (entitlementProducts.error) throw new Error(`Unable to list entitlement products: ${JSON.stringify(entitlementProducts.error)}`);
    entitlementDetails.push({ entitlement, products: entitlementProducts.data });
  }

  console.log(JSON.stringify({
    project: { id: project.id, name: project.name },
    apps: appsResponse.data,
    products: productsResponse.data,
    entitlements: entitlementDetails,
    offerings: offeringDetails,
  }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "RevenueCat inspection failed");
  process.exitCode = 1;
});