import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface BlockedUser {
  id: number;
  userId: number;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export function useBlockedUsers() {
  const { user } = useAuth();

  const { data: blockedUsers = [] } = useQuery<BlockedUser[]>({
    queryKey: ["/api/users/blocked"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users/blocked");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const blockedUserIds = new Set<number>(
    blockedUsers.flatMap((u) => [u.id, u.userId].filter(Boolean))
  );

  const isBlocked = (userId: number) => blockedUserIds.has(userId);

  return { blockedUsers, blockedUserIds, isBlocked };
}
