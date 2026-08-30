import { useAuth } from "@/hooks/use-auth";
import { hasIndieDeveloperAccess } from "@shared/partner-access";
import { GAME_DEVELOPER_FEATURES_ENABLED } from "@/lib/feature-flags";

export function useIndieMode() {
  const { user } = useAuth();
  const isIndieMode = GAME_DEVELOPER_FEATURES_ENABLED && hasIndieDeveloperAccess(user);
  return { isIndieMode };
}
