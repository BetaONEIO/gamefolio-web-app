import { useAuth } from "@/hooks/use-auth";

export function useIndieMode() {
  const { user } = useAuth();
  const isIndieMode = !!(
    user &&
    user.userType
      ?.split(",")
      .map((t: string) => t.trim())
      .includes("indie_developer")
  );
  return { isIndieMode };
}
