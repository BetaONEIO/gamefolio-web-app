import { defineRailway, github, project, service } from "railway/iac";

// This repository owns only the application service. The named partial keeps
// staging Postgres and the separate production website outside this spec.
export const partial = "gamefolio-web-app";

export default defineRailway((ctx) => {
  const isProduction = ctx.projectName === "gamefolio-app-production";
  const isStaging = ctx.projectName === "gamefolio-app-staging";

  if (!isProduction && !isStaging) {
    throw new Error(`Refusing unknown Railway project: ${ctx.projectName}`);
  }

  const expectedEnvironment = isProduction ? "production" : "staging";
  if (ctx.environment !== expectedEnvironment) {
    throw new Error(
      `Expected ${expectedEnvironment}, received ${ctx.environment}`,
    );
  }

  const gamefolioWebApp = isProduction
    ? service("gamefolio-web-app", {
        source: github("BetaONEIO/gamefolio-web-app", {
          branch: "main",
          checkSuites: false,
        }),
        healthcheck: "/api/health/ready",
        healthcheckTimeout: 300,
        replicas: { "europe-west4-drams3a": 1 },
        deploy: { ipv6EgressEnabled: true },
        domains: [
          { domain: "app.gamefolio.com", port: 5000 },
          { domain: "developer.gamefolio.com", port: 5000 },
          { domain: "www.app.gamefolio.com", port: 5000 },
        ],
      })
    : service("gamefolio-web-app", {
        source: github("BetaONEIO/gamefolio-web-app", {
          branch: "bounties",
          checkSuites: false,
        }),
        healthcheck: "/api/health/ready",
        healthcheckTimeout: 300,
        replicas: { sfo: 1 },
        domains: [{ domain: "staging-app.gamefolio.com", port: 8080 }],
      });

  return project(ctx.projectName, {
    variables: { managed: false },
    resources: [gamefolioWebApp],
  });
});
