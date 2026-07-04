import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Gamepad2,
  BarChart3,
  Megaphone,
  Rocket,
  Users,
  Wrench,
} from "lucide-react";

// Scaffold for the Indie Developer Partner dashboard.
// Gated by PartnerProtectedRoute(partnerType="indie"); sections are placeholders
// to be wired up as the Indie Developer Partner programme ships.
export default function IndieDashboardPage() {
  const { user } = useAuth();

  const stats = [
    { label: "Published Games", value: "—", icon: Gamepad2 },
    { label: "Total Reach", value: "—", icon: Users },
    { label: "Active Campaigns", value: "—", icon: Megaphone },
  ];

  const sections = [
    {
      title: "Your Games",
      icon: Gamepad2,
      body: "List and manage the games you've published to Gamefolio.",
    },
    {
      title: "Promotion Campaigns",
      icon: Megaphone,
      body: "Launch and track promo campaigns and game bounties.",
    },
    {
      title: "Performance Analytics",
      icon: BarChart3,
      body: "Views, wishlists, and engagement across your titles.",
    },
    {
      title: "Developer Tools",
      icon: Wrench,
      body: "Press kits, embeddable widgets, and partner assets.",
    },
  ];

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-2">
        <Rocket className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">Indie Developer Dashboard</h1>
        <Badge variant="secondary">Partner</Badge>
      </div>
      <p className="text-muted-foreground mb-6">
        Welcome{user?.displayName ? `, ${user.displayName}` : ""} — your indie
        developer partner tools live here.
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
