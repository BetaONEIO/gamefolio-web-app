import {
  attachProductsToEntitlement,
  attachProductsToPackage,
  createProduct,
  getProductStoreStateOperation,
  getProductsFromEntitlement,
  getProductsFromPackage,
  listApps,
  listEntitlements,
  listOfferings,
  listPackages,
  listProducts,
  setProductStoreState,
} from "@replit/revenuecat-sdk";
import { getUncachableRevenueCatClient } from "./revenueCatClient";

const ANDROID_BASE_PLANS = [
  {
    basePlanId: "monthly",
    storeIdentifier: "gamefolio_streamer_partner:monthly",
    displayName: "Gamefolio Streamer Pro Android Monthly",
    duration: "ONE_MONTH" as const,
    packageLookupKey: "$rc_monthly",
    amountMicros: 4_990_000,
  },
  {
    basePlanId: "annual",
    storeIdentifier: "gamefolio_streamer_partner:annual",
    displayName: "Gamefolio Streamer Pro Android Annual",
    duration: "ONE_YEAR" as const,
    packageLookupKey: "$rc_annual",
    amountMicros: 44_990_000,
  },
] as const;

const ANDROID_APP_NAME = "Gamefolio Android";
const STREAMER_ENTITLEMENT_LOOKUP_KEY = "streamer_partner";
const STREAMER_OFFERING_LOOKUP_KEY = "Gamefolio Streamer Partner";

async function requireData<T>(label: string, response: { data?: T; error?: unknown }): Promise<T> {
  if (response.error || response.data === undefined) {
    throw new Error(`${label}: ${JSON.stringify(response.error ?? "missing response data")}`);
  }
  return response.data;
}

async function waitForStoreOperation(
  client: Awaited<ReturnType<typeof getUncachableRevenueCatClient>>,
  projectId: string,
  productId: string,
  operationId: string,
) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await getProductStoreStateOperation({
      client,
      path: { project_id: projectId, product_id: productId, operation_id: operationId },
    });
    const data = await requireData("Poll Play Store product operation", response);
    const status = (data as { status?: string }).status;
    if (status === "completed" || status === "succeeded" || status === "success") return data;
    if (status === "failed" || status === "error") {
      throw new Error(`Play Store product operation failed: ${JSON.stringify(data)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`Timed out waiting for Play Store operation ${operationId}`);
}

async function main() {
  const client = await getUncachableRevenueCatClient();
  const projects = await requireData<any>("List projects", await client.get({
    url: "/projects",
    query: { limit: 100 },
  }));
  const project = projects.items?.find((item: any) => item.name === "Gamefolio");
  if (!project?.id) throw new Error("Gamefolio RevenueCat project was not found");

  const apps = await requireData<any>("List apps", await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  }));
  const androidApp = apps.items?.find((app: any) => app.name === ANDROID_APP_NAME && app.type === "play_store");
  if (!androidApp?.id) throw new Error("Gamefolio Android RevenueCat app was not found");

  const productsResponse = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  const products = await requireData<any>("List products", productsResponse);

  const androidProducts: Record<string, any> = {};
  for (const plan of ANDROID_BASE_PLANS) {
    let product = products.items?.find(
      (item: any) => item.app_id === androidApp.id && item.store_identifier === plan.storeIdentifier,
    );
    if (!product) {
      product = await requireData("Create Android Streamer Pro product", await createProduct({
        client,
        path: { project_id: project.id },
        body: {
          app_id: androidApp.id,
          store_identifier: plan.storeIdentifier,
          type: "subscription",
          display_name: plan.displayName,
        },
      }));
      console.log(`Created ${plan.basePlanId} Android product ${product.id}`);
    } else {
      console.log(`Android ${plan.basePlanId} product already exists: ${product.id}`);
    }
    androidProducts[plan.basePlanId] = product;

    const storeState = await setProductStoreState({
      client,
      path: { project_id: project.id, product_id: product.id },
      body: {
        store: "play_store",
        common: {
          title: plan.displayName,
          duration: plan.duration,
          pricing: {
            territory_prices: {
              GB: {
                amount_micros: plan.amountMicros,
                currency: "GBP",
              },
            },
          },
          availability: {
            territories: { GB: true },
            available_in_new_territories: true,
          },
          localizations: {
            "en-GB": {
              name: "Gamefolio Streamer Pro",
              description: "Streamer Pro access.",
            },
          },
        },
        store_state: {
          base_plans: {
            [plan.basePlanId]: {
              auto_renewing_base_plan_type: {
                billing_period_duration: plan.duration === "ONE_MONTH" ? "P1M" : "P1Y",
              },
            },
          },
        },
      },
    });
    const operation = await requireData("Queue Play Store product operation", storeState);
    console.log(`Queued ${plan.basePlanId} Play Store product operation ${operation.operation_id}`);
    await waitForStoreOperation(client, project.id, product.id, operation.operation_id);
    console.log(`Applied ${plan.basePlanId} Play Store product state`);
  }

  const entitlements = await requireData<any>("List entitlements", await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  }));
  const entitlement = entitlements.items?.find((item: any) => item.lookup_key === STREAMER_ENTITLEMENT_LOOKUP_KEY);
  if (!entitlement?.id) throw new Error("Streamer Pro entitlement was not found");
  const entitlementProducts = await requireData<any>("List Streamer Pro entitlement products", await getProductsFromEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
  }));
  const existingEntitlementProductIds = new Set(
    (entitlementProducts.items ?? []).map((product: any) => product.id),
  );
  const missingEntitlementProductIds = Object.values(androidProducts)
    .map((product: any) => product.id)
    .filter((productId) => !existingEntitlementProductIds.has(productId));
  if (missingEntitlementProductIds.length > 0) {
    await requireData("Attach Android products to Streamer Pro entitlement", await attachProductsToEntitlement({
      client,
      path: { project_id: project.id, entitlement_id: entitlement.id },
      body: { product_ids: missingEntitlementProductIds },
    }));
  }

  const offerings = await requireData<any>("List offerings", await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  }));
  const offering = offerings.items?.find((item: any) => item.lookup_key === STREAMER_OFFERING_LOOKUP_KEY);
  if (!offering?.id) throw new Error("Streamer Pro offering was not found");
  const packages = await requireData<any>("List Streamer Pro packages", await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 100 },
  }));

  for (const plan of ANDROID_BASE_PLANS) {
    const pkg = packages.items?.find((item: any) => item.lookup_key === plan.packageLookupKey);
    if (!pkg?.id) throw new Error(`Streamer Pro package ${plan.packageLookupKey} was not found`);
    const packageProducts = await requireData<any>(`List ${plan.packageLookupKey} products`, await getProductsFromPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
    }));
    const productId = androidProducts[plan.basePlanId].id;
    if (!(packageProducts.items ?? []).some((product: any) => product.product?.id === productId)) {
      await requireData(`Attach Android ${plan.basePlanId} product to package`, await attachProductsToPackage({
        client,
        path: { project_id: project.id, package_id: pkg.id },
        body: {
          products: [{
            product_id: productId,
            eligibility_criteria: "all",
          }],
        },
      }));
    }
    console.log(`Attached Android ${plan.basePlanId} product to ${plan.packageLookupKey}`);
  }

  console.log("Android Streamer Pro products are configured in Play Store, RevenueCat, packages, and entitlement.");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Android Streamer Pro setup failed");
  process.exitCode = 1;
});