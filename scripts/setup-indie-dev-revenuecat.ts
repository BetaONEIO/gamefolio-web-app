import {
  attachProductsToEntitlement,
  attachProductsToPackage,
  createEntitlement,
  createOffering,
  createPackages,
  createProduct,
  getProductsFromEntitlement,
  getProductsFromPackage,
  listApps,
  listEntitlements,
  listOfferings,
  listPackages,
  listProducts,
} from "@replit/revenuecat-sdk";
import { getUncachableRevenueCatClient } from "./revenueCatClient";

const APPLY = process.argv.includes("--apply");
const PROJECT_NAME = "Gamefolio";
const ENTITLEMENT_KEY = "indie_dev";
const OFFERING_KEY = "Gamefolio Indie Developer";

const PLANS = [
  {
    packageKey: "$rc_monthly",
    packageName: "Gamefolio Developer Pro Monthly",
    iosStoreIdentifier: "gamefolio_indie_dev",
    androidStoreIdentifier: "gamefolio_indie_dev:p1m",
  },
  {
    packageKey: "$rc_annual",
    packageName: "Gamefolio Developer Pro Annual",
    iosStoreIdentifier: "gamefolio_indie_dev_annual",
    androidStoreIdentifier: "gamefolio_indie_dev:p1y",
  },
] as const;

async function requireData<T>(label: string, response: { data?: T; error?: unknown }): Promise<T> {
  if (response.error || response.data === undefined) {
    throw new Error(`${label}: ${JSON.stringify(response.error ?? "missing response data")}`);
  }
  return response.data;
}

function findGamefolioApp(apps: any[], type: "app_store" | "play_store") {
  const matching = apps.filter((app) => app.type === type);
  return matching.find((app) => /gamefolio/i.test(String(app.name ?? ""))) ?? matching[0];
}

async function main() {
  const client = await getUncachableRevenueCatClient();
  const projects = await requireData<any>("List projects", await client.get({
    url: "/projects",
    query: { limit: 100 },
  }));
  const project = projects.items?.find((item: any) => item.name === PROJECT_NAME);
  if (!project?.id) throw new Error(`RevenueCat project "${PROJECT_NAME}" was not found`);

  const [appsData, productsData, entitlementsData, offeringsData] = await Promise.all([
    listApps({ client, path: { project_id: project.id }, query: { limit: 100 } }).then((r) => requireData<any>("List apps", r)),
    listProducts({ client, path: { project_id: project.id }, query: { limit: 100 } }).then((r) => requireData<any>("List products", r)),
    listEntitlements({ client, path: { project_id: project.id }, query: { limit: 100 } }).then((r) => requireData<any>("List entitlements", r)),
    listOfferings({ client, path: { project_id: project.id }, query: { limit: 100 } }).then((r) => requireData<any>("List offerings", r)),
  ]);

  const apps = appsData.items ?? [];
  const iosApp = findGamefolioApp(apps, "app_store");
  const androidApp = findGamefolioApp(apps, "play_store");
  if (!iosApp?.id) throw new Error("No Apple App Store app is connected to the RevenueCat project");
  if (!androidApp?.id) throw new Error("No Google Play app is connected to the RevenueCat project");

  const changes: string[] = [];
  const missing: string[] = [];
  const products = [...(productsData.items ?? [])];

  const ensureProduct = async (app: any, storeIdentifier: string, displayName: string) => {
    let product = products.find((item: any) =>
      item.app_id === app.id && item.store_identifier === storeIdentifier,
    );
    if (product) return product;
    missing.push(`product:${storeIdentifier}`);
    if (!APPLY) return null;
    product = await requireData<any>(`Create ${storeIdentifier}`, await createProduct({
      client,
      path: { project_id: project.id },
      body: { app_id: app.id, store_identifier: storeIdentifier, type: "subscription", display_name: displayName },
    }));
    products.push(product);
    changes.push(`created product ${storeIdentifier}`);
    return product;
  };

  const planProducts: Array<{ packageKey: string; products: any[] }> = [];
  for (const plan of PLANS) {
    const iosProduct = await ensureProduct(iosApp, plan.iosStoreIdentifier, `${plan.packageName} iOS`);
    const androidProduct = await ensureProduct(androidApp, plan.androidStoreIdentifier, `${plan.packageName} Android`);
    planProducts.push({ packageKey: plan.packageKey, products: [iosProduct, androidProduct].filter(Boolean) });
  }

  let entitlement = entitlementsData.items?.find((item: any) => item.lookup_key === ENTITLEMENT_KEY);
  if (!entitlement) {
    missing.push(`entitlement:${ENTITLEMENT_KEY}`);
    if (APPLY) {
      entitlement = await requireData<any>("Create Developer Pro entitlement", await createEntitlement({
        client,
        path: { project_id: project.id },
        body: { lookup_key: ENTITLEMENT_KEY, display_name: "Gamefolio Developer Pro" },
      }));
      changes.push(`created entitlement ${ENTITLEMENT_KEY}`);
    }
  }

  let offering = offeringsData.items?.find((item: any) => item.lookup_key === OFFERING_KEY);
  if (!offering) {
    missing.push(`offering:${OFFERING_KEY}`);
    if (APPLY) {
      offering = await requireData<any>("Create Developer Pro offering", await createOffering({
        client,
        path: { project_id: project.id },
        body: { lookup_key: OFFERING_KEY, display_name: OFFERING_KEY },
      }));
      changes.push(`created offering ${OFFERING_KEY}`);
    }
  }

  if (entitlement) {
    const attached = await requireData<any>("List Developer Pro entitlement products", await getProductsFromEntitlement({
      client,
      path: { project_id: project.id, entitlement_id: entitlement.id },
    }));
    const attachedIds = new Set((attached.items ?? []).map((item: any) => item.id));
    const missingProducts = planProducts.flatMap((plan) => plan.products).filter((product) => !attachedIds.has(product.id));
    for (const product of missingProducts) missing.push(`entitlement-product:${product.store_identifier}`);
    if (APPLY && missingProducts.length > 0) {
      await requireData("Attach Developer Pro entitlement products", await attachProductsToEntitlement({
        client,
        path: { project_id: project.id, entitlement_id: entitlement.id },
        body: { product_ids: missingProducts.map((product) => product.id) },
      }));
      changes.push(`attached ${missingProducts.length} product(s) to ${ENTITLEMENT_KEY}`);
    }
  }

  if (offering) {
    const packagesData = await requireData<any>("List Developer Pro packages", await listPackages({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      query: { limit: 100 },
    }));
    const packages = [...(packagesData.items ?? [])];
    for (let index = 0; index < PLANS.length; index += 1) {
      const plan = PLANS[index];
      let pkg = packages.find((item: any) => item.lookup_key === plan.packageKey);
      if (!pkg) {
        missing.push(`package:${plan.packageKey}`);
        if (APPLY) {
          pkg = await requireData<any>(`Create package ${plan.packageKey}`, await createPackages({
            client,
            path: { project_id: project.id, offering_id: offering.id },
            body: { lookup_key: plan.packageKey, display_name: plan.packageName, position: index + 1 },
          }));
          packages.push(pkg);
          changes.push(`created package ${plan.packageKey}`);
        }
      }
      if (!pkg) continue;

      const attached = await requireData<any>(`List ${plan.packageKey} products`, await getProductsFromPackage({
        client,
        path: { project_id: project.id, package_id: pkg.id },
      }));
      const attachedIds = new Set((attached.items ?? []).map((item: any) => item.product?.id));
      const required = planProducts.find((item) => item.packageKey === plan.packageKey)?.products ?? [];
      const missingProducts = required.filter((product) => !attachedIds.has(product.id));
      for (const product of missingProducts) missing.push(`package-product:${plan.packageKey}:${product.store_identifier}`);
      if (APPLY && missingProducts.length > 0) {
        await requireData(`Attach ${plan.packageKey} products`, await attachProductsToPackage({
          client,
          path: { project_id: project.id, package_id: pkg.id },
          body: { products: missingProducts.map((product) => ({ product_id: product.id, eligibility_criteria: "all" as const })) },
        }));
        changes.push(`attached ${missingProducts.length} product(s) to ${plan.packageKey}`);
      }
    }
  }

  console.log(JSON.stringify({
    mode: APPLY ? "apply" : "audit",
    project: { id: project.id, name: project.name },
    apps: { ios: { id: iosApp.id, name: iosApp.name }, android: { id: androidApp.id, name: androidApp.name } },
    expected: { entitlement: ENTITLEMENT_KEY, offering: OFFERING_KEY, plans: PLANS },
    missing,
    changes,
    readyForStoreValidation: APPLY ? true : missing.length === 0,
    note: "Store products must exist in App Store Connect and Google Play before enabling purchases.",
  }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Developer Pro RevenueCat setup failed");
  process.exitCode = 1;
});
