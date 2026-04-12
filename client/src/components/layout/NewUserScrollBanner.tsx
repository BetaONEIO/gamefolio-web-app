import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { UserPlus } from "lucide-react";

interface RecentSignup {
  userId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  joinedAt: string;
}

export function NewUserScrollBanner() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: recentSignups = [] } = useQuery<RecentSignup[]>({
    queryKey: ["/api/recent-signups"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
  });

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || recentSignups.length === 0) return;

    const scroll = () => {
      if (scrollContainer.scrollLeft >= scrollContainer.scrollWidth / 2) {
        scrollContainer.scrollLeft = 0;
      } else {
        scrollContainer.scrollLeft += 1;
      }
    };

    const intervalId = setInterval(scroll, 30);

    return () => clearInterval(intervalId);
  }, [recentSignups]);

  if (recentSignups.length === 0) return null;

  const duplicatedSignups = [...recentSignups, ...recentSignups];

  return (
    <div className="bg-blue-500 border-b border-blue-600 overflow-hidden py-2">
      <div
        ref={scrollRef}
        className="flex gap-8 whitespace-nowrap overflow-hidden"
        style={{ scrollBehavior: "auto" }}
      >
        {duplicatedSignups.map((signup, index) => (
          <div
            key={`${signup.userId}-${index}`}
            className="inline-flex items-center gap-2 text-sm font-medium"
            style={{ color: '#131E2B' }}
          >
            <UserPlus className="h-4 w-4" />
            <Link href={`/user/${signup.username}`}>
              <span className="hover:underline cursor-pointer font-semibold">
                {signup.displayName || signup.username}
              </span>
            </Link>
            <span>has just joined the community!</span>
          </div>
        ))}
      </div>
    </div>
  );
}
