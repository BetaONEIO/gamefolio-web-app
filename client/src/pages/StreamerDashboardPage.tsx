import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Radio,
  BarChart3,
  CalendarClock,
  Scissors,
  Users,
  DollarSign,
} from "lucide-react";

// Scaffold for the Streamer Partner dashboard.
// Gated by PartnerProtectedRoute(partnerType="streamer"); sections are
// placeholders to be wired up as the Streamer Partner programme ships.
// NOTE: access is the PAID Streamer Partner entitlement — NOT the self-selected
// "streamer" persona tag or a connected Twitch/Kick channel.
export default function StreamerDashboardPage() {
  const { user } = useAuth();

  const stats = [
    { label: "Followers", value: "—", icon: Users },
    { label: "Clip Views (30d)", value: "—", icon: BarChart3 },
    { label: "Partner Earnings", value: "—", icon: DollarSign },
  ];

  const sections = [
    {
      title: "Go-Live Schedule",
      icon: CalendarClock,
      body: "Announce upcoming streams and sync your live schedule.",
    },
    {
      title: "Clip Performance",
      icon: Scissors,
      body: "Top-performing clips and reels across your channel.",
    },
    {
      title: "Audience Analytics",
      icon: BarChart3,
      body: "Follower growth, watch time, and engagement trends.",
    },
    {
      title: "Partner Earnings",
      icon: DollarSign,
      body: "Revenue share, payouts, and monetisation tools.",
    },
  ];

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-2">
        <Radio className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">Streamer Dashboard</h1>
        <Badge variant="secondary">Partner</Badge>
      </div>
      <p className="text-muted-foreground mb-6">
        Welcome{user?.displayName ? `, ${user.displayName}` : ""} — your streamer
        partner tools live here.
      </p>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <s.icon className="h-8 w-8 text-primary shrink-0" />
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((sec) => (
          <Card key={sec.title}>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <sec.icon className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{sec.title}</CardTitle>
              <Badge variant="outline" className="ml-auto text-[10px]">
                Coming soon
              </Badge>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {sec.body}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
