import { useAuth } from "@/hooks/use-auth";
import { hasIndieDeveloperAccess } from "@shared/partner-access";

export function useIndieMode() {
  const { user } = useAuth();
  const isIndieMode = hasIndieDeveloperAccess(user);
  return { isIndieMode };
}
