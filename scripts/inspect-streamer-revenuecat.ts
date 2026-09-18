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
  const products = (productsResponse.data as any)?.items ?? [];
  const apps = (appsResponse.data as any)?.items ?? [];
  const playStoreAppId = apps.find((app: any) => app.type === "play_store")?.id;
  const productPrices = [];
  const productStoreStates = [];
  for (const product of products) {
    if (!String(product?.store_identifier ?? "").includes("streamer_partner")) continue;
    const pricesResponse = await client.get({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: product.id },
    });
    productPrices.push({
      product_id: product.id,
      store_identifier: product.store_identifier,
      app_id: product.app_id,
      prices: pricesResponse.error ? { error: pricesResponse.error } : pricesResponse.data,
    });
  }
  for (const product of products) {
    if (product.app_id !== playStoreAppId) continue;
    if (!/streamer_partner|gamefolio_pro/.test(String(product.store_identifier ?? ""))) continue;
    const storeStateResponse = await client.get({
      url: "/projects/{project_id}/products/{product_id}/store_state",
      path: { project_id: project.id, product_id: product.id },
      query: { store: "play_store" },
    });
    productStoreStates.push({
      product_id: product.id,
      store_identifier: product.store_identifier,
      store_state: storeStateResponse.error ? { error: storeStateResponse.error } : storeStateResponse.data,
    });
  }

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
    productPrices,
    productStoreStates,
    entitlements: entitlementDetails,
    offerings: offeringDetails,
  }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "RevenueCat inspection failed");
  process.exitCode = 1;
});