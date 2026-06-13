import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Globe, Loader2 } from "lucide-react";

/**
 * Read-only cosmetics catalog shown to NATIVE (Capacitor) users in place of the
 * full crypto-wired StorePage.
 *
 * The mobile binaries must not contain cryptocurrency features (App Store / Play
 * financial-features compliance — see lib/crypto-features.ts). This page lets
 * mobile users *browse* the cosmetic catalogue (name tags, borders, badges) and
 * see what they already own, but it deliberately renders NO GFT/token prices, no
 * "buy"/"mint" actions, no NFT surfaces, and no wallet. Purchasing happens on the
 * web app. It only calls the public catalogue GET endpoints (which are not
 * blocked for native clients).
 */

interface CosmeticItem {
  id: number;
  name: string;
  imageUrl: string;
  rarity?: string;
  owned?: boolean;
  isDefault?: boolean;
}

function rarityClasses(rarity?: string): string {
  switch (rarity) {
    case "legendary":
      return "bg-gradient-to-r from-yellow-500 to-amber-600 text-white";
    case "epic":
      return "bg-gradient-to-r from-[#B7FF1A] to-[#A2F000] text-black";
    case "rare":
      return "bg-gradient-to-r from-[#B7FF1A] to-[#6FA800] text-white";
    default:
      return "bg-gray-600 text-white";
  }
}

function CosmeticCard({ item, aspect }: { item: CosmeticItem; aspect: "video" | "square" }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="bg-card rounded-xl border border-border p-2 flex flex-col">
      <div
        className={`relative w-full ${aspect === "square" ? "aspect-square" : "aspect-video"} flex items-center justify-center overflow-hidden rounded-lg bg-muted/40`}
      >
        {broken || !item.imageUrl ? (
          <div className={`w-full h-full flex items-center justify-center text-center px-1 ${rarityClasses(item.rarity)}`}>
            <span className="text-xs font-semibold line-clamp-2">{item.name}</span>
          </div>
        ) : (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="max-w-full max-h-full object-contain drop-shadow-lg"
            onError={() => setBroken(true)}
          />
        )}
        {item.owned && (
          <Badge className="absolute top-1.5 right-1.5 bg-primary text-[10px] px-1.5 py-0.5">
            <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
            Owned
          </Badge>
        )}
      </div>
      <h3 className="font-semibold text-xs line-clamp-1 mt-2">{item.name}</h3>
      {item.rarity && !item.isDefault && (
        <Badge className={`mt-1 w-fit text-[10px] px-1.5 py-0.5 capitalize ${rarityClasses(item.rarity)}`}>
          {item.rarity}
        </Badge>
      )}
    </div>
  );
}

function CatalogGrid({
  endpoint,
  aspect,
  emptyLabel,
}: {
  endpoint: string;
  aspect: "video" | "square";
  emptyLabel: string;
}) {
  const { data: items = [], isLoading } = useQuery<CosmeticItem[]>({
    queryKey: [endpoint],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!items.length) {
    return <p className="text-center text-sm text-muted-foreground py-16">{emptyLabel}</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <CosmeticCard key={item.id} item={item} aspect={aspect} />
      ))}
    </div>
  );
}

export default function MobileStorePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Cosmetics</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Browse name tags, borders and badges for your profile.
      </p>

      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 mb-6">
        <Globe className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Cosmetics are purchased and managed on the Gamefolio web app at{" "}
          <span className="font-medium text-foreground">gamefolio.com</span>. Anything you already
          own appears on your profile here automatically.
        </p>
      </div>

      <Tabs defaultValue="name-tags" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="name-tags">Name Tags</TabsTrigger>
          <TabsTrigger value="borders">Borders</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
        </TabsList>

        <TabsContent value="name-tags">
          <CatalogGrid
            endpoint="/api/store/name-tags"
            aspect="video"
            emptyLabel="No name tags available right now."
          />
        </TabsContent>
        <TabsContent value="borders">
          <CatalogGrid
            endpoint="/api/store/borders"
            aspect="square"
            emptyLabel="No borders available right now."
          />
        </TabsContent>
        <TabsContent value="badges">
          <CatalogGrid
            endpoint="/api/store/verification-badges"
            aspect="square"
            emptyLabel="No badges available right now."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
