import React, { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import AdminContentFilter from "./AdminContentFilter";
import { UserWithBadges, BannerSettings, Badge as BadgeType, assetTypes, AssetType } from "@shared/schema";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Admin data types
interface AdminStats {
  overview: {
    totalUsers: number;
    totalClips: number;
    totalGames: number;
  };
  analytics: {
    userTypeDistribution: Array<{ type: string; count: number }>;
    ageRangeDistribution: Array<{ range: string; count: number }>;
    topGames: Array<{ id: number; name: string }>;
    recentClips: Array<{ id: number; title: string; user: { username: string } }>;
  };
}

interface UsersData {
  users: UserWithBadges[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ClipsData {
  clips: Array<{ id: number; title: string; user: { username: string } }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface HeroTextData {
  title: string;
  subtitle: string;
  buttonText?: string;
  buttonUrl?: string;
  targetAudience?: string;
}

interface AssetReward {
  id: number;
  name: string;
  imageUrl: string;
  assetType: string;
  rarity: string;
  unlockChance: number;
  timesRewarded: number;
  isActive: boolean;
  availableInLootbox: boolean;
  availableInStore: boolean;
  proOnly: boolean;
  freeItem: boolean;
  redeemable: boolean;
  rewardCategory: string;
  storePrice: number | null;
  sourceBucket: string | null;
  sourcePath: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

interface BucketFile {
  name: string;
  id: string;
  size: number;
  createdAt: string;
  publicUrl: string;
  path: string;
}

interface BucketContents {
  files: BucketFile[];
  folders: string[];
  bucket: string;
  currentFolder: string;
}

interface AssetRewardWithClaims extends AssetReward {
  claims: Array<{
    id: number;
    rewardId: number;
    userId: number;
    claimedAt: string;
    user: { id: number; username: string; displayName: string; avatarUrl?: string | null };
  }>;
}

// Banner Management Component
function BannerManagement() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch current banner settings
  const { data: bannerSettings, isLoading: isLoadingBanner, refetch: refetchBanner } = useQuery<BannerSettings>({
    queryKey: ['/api/admin/banner-settings'],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 1000 * 60 * 5,
  });

  // Form state
  const [formData, setFormData] = useState({
    isEnabled: true,
    title: "Alpha Stage",
    message: "This app is currently in Alpha. You may encounter issues while using it.",
    linkText: "report a bug",
    linkUrl: "/contact",
    variant: "primary" as const,
    showIcon: true,
    isDismissible: true,
  });

  // Update form data when banner settings load
  React.useEffect(() => {
    if (bannerSettings) {
      setFormData({
        isEnabled: bannerSettings.isEnabled,
        title: bannerSettings.title,
        message: bannerSettings.message,
        linkText: bannerSettings.linkText || "",
        linkUrl: bannerSettings.linkUrl || "",
        variant: bannerSettings.variant as any,
        showIcon: bannerSettings.showIcon,
        isDismissible: bannerSettings.isDismissible,
      });
    }
  }, [bannerSettings]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await apiRequest('PUT', '/api/admin/banner-settings', formData);

      toast({
        title: "Banner updated",
        description: "Banner settings have been saved successfully.",
        variant: "gamefolioSuccess",
      });

      await refetchBanner();
      
      // Also invalidate the public banner settings
      queryClient.invalidateQueries({ queryKey: ['/api/banner-settings'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update banner settings.",
        variant: "gamefolioError",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      await apiRequest('POST', '/api/admin/banner-settings/reset');

      toast({
        title: "Banner reset",
        description: "Banner settings have been reset to defaults.",
        variant: "gamefolioSuccess",
      });

      await refetchBanner();
      queryClient.invalidateQueries({ queryKey: ['/api/banner-settings'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset banner settings.",
        variant: "gamefolioError",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingBanner) {
    return (
      <Card>
        <CardContent className="p-6">
          <div>Loading banner settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Banner Settings Form */}
      <Card>
        <CardHeader>
          <CardTitle>Banner Settings</CardTitle>
          <CardDescription>
            Manage the site-wide banner displayed to all users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable/Disable Banner */}
          <div className="flex items-center space-x-2">
            <Switch
              id="banner-enabled"
              checked={formData.isEnabled}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, isEnabled: checked }))
              }
              data-testid="switch-banner-enabled"
            />
            <Label htmlFor="banner-enabled">Enable Banner</Label>
          </div>

          {/* Banner Title */}
          <div className="space-y-2">
            <Label htmlFor="banner-title">Title</Label>
            <Input
              id="banner-title"
              value={formData.title}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, title: e.target.value }))
              }
              placeholder="Enter banner title"
              data-testid="input-banner-title"
            />
          </div>

          {/* Banner Message */}
          <div className="space-y-2">
            <Label htmlFor="banner-message">Message</Label>
            <Textarea
              id="banner-message"
              value={formData.message}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, message: e.target.value }))
              }
              placeholder="Enter banner message"
              rows={3}
              data-testid="textarea-banner-message"
            />
          </div>

          {/* Link Text */}
          <div className="space-y-2">
            <Label htmlFor="banner-link-text">Link Text (optional)</Label>
            <Input
              id="banner-link-text"
              value={formData.linkText}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, linkText: e.target.value }))
              }
              placeholder="e.g., report a bug"
              data-testid="input-banner-link-text"
            />
          </div>

          {/* Link URL */}
          <div className="space-y-2">
            <Label htmlFor="banner-link-url">Link URL (optional)</Label>
            <Input
              id="banner-link-url"
              value={formData.linkUrl}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, linkUrl: e.target.value }))
              }
              placeholder="e.g., /contact"
              data-testid="input-banner-link-url"
            />
          </div>

          {/* Show Icon */}
          <div className="flex items-center space-x-2">
            <Switch
              id="banner-show-icon"
              checked={formData.showIcon}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, showIcon: checked }))
              }
              data-testid="switch-banner-show-icon"
            />
            <Label htmlFor="banner-show-icon">Show Icon</Label>
          </div>

          {/* Is Dismissible */}
          <div className="flex items-center space-x-2">
            <Switch
              id="banner-dismissible"
              checked={formData.isDismissible}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, isDismissible: checked }))
              }
              data-testid="switch-banner-dismissible"
            />
            <Label htmlFor="banner-dismissible">Allow Dismissal</Label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              data-testid="button-save-banner"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isLoading}
              data-testid="button-reset-banner"
            >
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Banner Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            See how the banner will appear to users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formData.isEnabled ? (
            <div className="border border-primary/30 bg-primary/10 backdrop-blur-sm p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span>
                  <strong className="text-primary">{formData.title}:</strong> {formData.message}
                  {formData.linkText && formData.linkUrl && (
                    <>
                      {" "}If you experience any problems, please {" "}
                      <span className="text-primary underline font-medium">
                        {formData.linkText}
                      </span>
                      !
                    </>
                  )}
                </span>
                {formData.isDismissible && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-4 h-6 w-6 p-0 text-primary hover:text-primary/80 hover:bg-primary/20"
                  >
                    ×
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-center py-8">
              Banner is disabled
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Store Management Component
interface AdminStoreItem {
  id: number;
  name: string;
  imageUrl: string | null;
  type: "name_tag" | "profile_border" | "nft_avatar";
  rarity: string;
  gfCost: number;
  proOnly: boolean;
  isActive: boolean;
  availableInStore: boolean;
  availableInLootbox: boolean;
  isDefault: boolean;
  proDiscount: boolean;
  shape?: string;
}

function StoreManagement() {
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: storeItemsList = [], isLoading, refetch } = useQuery<AdminStoreItem[]>({
    queryKey: ['/api/admin/store/items'],
    queryFn: async () => {
      const res = await fetch('/api/admin/store/items', { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    staleTime: 0,
  });

  const typeLabels: Record<string, string> = {
    name_tag: "Name Tag",
    profile_border: "Profile Border",
    nft_avatar: "NFT Avatar",
  };

  const rarityColors: Record<string, string> = {
    common: "bg-gray-600",
    rare: "bg-blue-600",
    epic: "bg-purple-600",
    legendary: "bg-amber-600",
  };

  const filteredItems = storeItemsList.filter(item => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (statusFilter === "pro" && !item.proOnly) return false;
    if (statusFilter === "free" && item.proOnly) return false;
    if (statusFilter === "active" && !item.isActive) return false;
    if (statusFilter === "inactive" && item.isActive) return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalItems = storeItemsList.length;
  const proItems = storeItemsList.filter(i => i.proOnly).length;
  const freeItems = storeItemsList.filter(i => !i.proOnly).length;
  const activeItems = storeItemsList.filter(i => i.isActive).length;

  const handleToggleActive = async (item: AdminStoreItem) => {
    try {
      await apiRequest("PATCH", `/api/admin/store/items/${item.type}/${item.id}`, {
        isActive: !item.isActive,
      });
      toast({ title: "Updated", description: `${item.name} is now ${item.isActive ? "inactive" : "active"}` });
      refetch();
    } catch (err) {
      toast({ title: "Error", description: "Failed to update item", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pro Items</CardTitle>
            <Crown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{proItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free User Items</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{freeItems}</div>
            <p className="text-xs text-muted-foreground">Pro users get 20% discount</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Items</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeItems}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Store Items Management
          </CardTitle>
          <CardDescription>
            View and manage all store items across Name Tags, Profile Borders, and NFT Avatars. Pro users get a 20% discount on free user items.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48"
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Item Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="name_tag">Name Tags</SelectItem>
                <SelectItem value="profile_border">Profile Borders</SelectItem>
                <SelectItem value="nft_avatar">NFT Avatars</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pro">Pro Only</SelectItem>
                <SelectItem value="free">Free Users</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading store items...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No items match the current filters.</div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-2 text-left w-12">Image</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Rarity</th>
                    <th className="p-2 text-left">Price (GF)</th>
                    <th className="p-2 text-left">Pro Discounted</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Access</th>
                    <th className="p-2 text-left">Store</th>
                    <th className="p-2 text-left">Lootbox</th>
                    <th className="p-2 text-left w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item: AdminStoreItem) => (
                    <tr key={`${item.type}-${item.id}`} className="border-b hover:bg-muted/30">
                      <td className="p-2">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center">
                            <ShoppingBag className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="p-2 font-medium">{item.name}</td>
                      <td className="p-2">
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="text-xs capitalize w-fit">
                            {typeLabels[item.type] || item.type}
                          </Badge>
                          {item.type === 'profile_border' && item.shape && (
                            <Badge variant="outline" className={`text-[10px] w-fit ${item.shape === 'square' ? 'text-purple-400 border-purple-400/50' : 'text-blue-400 border-blue-400/50'}`}>
                              {item.shape === 'square' ? 'NFT/Square' : 'Circle'}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <Badge className={`text-xs text-white capitalize ${rarityColors[item.rarity] || "bg-gray-600"}`}>
                          {item.rarity}
                        </Badge>
                      </td>
                      <td className="p-2 font-mono">{item.gfCost}</td>
                      <td className="p-2 font-mono">
                        {item.proDiscount ? (
                          <span className="text-green-500 font-semibold">{Math.floor(item.gfCost * 0.8)} GF</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2">
                        {item.isActive ? (
                          <Badge className="bg-green-600 text-white text-xs">Active</Badge>
                        ) : (
                          <Badge className="bg-red-600 text-white text-xs">Inactive</Badge>
                        )}
                      </td>
                      <td className="p-2">
                        {item.proOnly ? (
                          <Badge className="bg-amber-600 text-white text-xs flex items-center gap-1 w-fit">
                            <Crown className="h-3 w-3" />
                            Pro Only
                          </Badge>
                        ) : (
                          <Badge className="bg-green-600 text-white text-xs">Free Users</Badge>
                        )}
                      </td>
                      <td className="p-2">
                        {item.availableInStore ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </td>
                      <td className="p-2">
                        {item.availableInLootbox ? (
                          <Gift className="h-4 w-4 text-purple-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </td>
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(item)}
                          className="h-7 px-2"
                        >
                          {item.isActive ? (
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Pro Subscribers Management Component
interface ProSubscriber {
  id: number;
  username: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isPro: boolean;
  proSubscriptionType: string | null;
  proSubscriptionStartDate: string | null;
  proSubscriptionEndDate: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
}

function ProSubscribersManagement() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled' | 'expired'>('all');

  const { data, isLoading, refetch } = useQuery<{ subscribers: ProSubscriber[]; total: number }>({
    queryKey: ['/api/admin/pro-subscribers'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateDuration = (startDate: string | null) => {
    if (!startDate) return 'Unknown';
    const start = new Date(startDate);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return '1 day';
    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 60) return '1 month';
    const months = Math.floor(diffDays / 30);
    if (months < 12) return `${months} months`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`;
    return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
  };

  const getSubscriptionBadgeColor = (type: string | null) => {
    switch (type?.toLowerCase()) {
      case 'yearly': return 'bg-amber-500';
      case 'monthly': return 'bg-blue-500';
      default: return 'bg-green-500';
    }
  };

  const getStatus = (sub: ProSubscriber): 'active' | 'cancelled' | 'expired' => {
    if (sub.isPro && sub.stripeSubscriptionId) return 'active';
    if (sub.isPro && !sub.stripeSubscriptionId) return 'active';
    if (!sub.isPro && sub.proSubscriptionEndDate && new Date(sub.proSubscriptionEndDate) > new Date()) return 'cancelled';
    return 'expired';
  };

  const getStatusBadge = (status: 'active' | 'cancelled' | 'expired') => {
    switch (status) {
      case 'active': return <Badge className="bg-green-600 text-white">Active</Badge>;
      case 'cancelled': return <Badge className="bg-yellow-600 text-white">Cancelled</Badge>;
      case 'expired': return <Badge className="bg-red-600 text-white">Expired</Badge>;
    }
  };

  const filteredSubscribers = data?.subscribers?.filter(sub => {
    if (statusFilter === 'all') return true;
    return getStatus(sub) === statusFilter;
  }) || [];

  const activeCount = data?.subscribers?.filter(s => getStatus(s) === 'active').length || 0;
  const cancelledCount = data?.subscribers?.filter(s => getStatus(s) === 'cancelled').length || 0;
  const expiredCount = data?.subscribers?.filter(s => getStatus(s) === 'expired').length || 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter('all')}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Total</p>
              <Crown className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold mt-1">{data?.total || 0}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-green-500/50 transition-colors" onClick={() => setStatusFilter('active')}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Active</p>
              <div className="w-2 h-2 rounded-full bg-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-500 mt-1">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-yellow-500/50 transition-colors" onClick={() => setStatusFilter('cancelled')}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Cancelled</p>
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-yellow-500 mt-1">{cancelledCount}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-red-500/50 transition-colors" onClick={() => setStatusFilter('expired')}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Expired</p>
              <div className="w-2 h-2 rounded-full bg-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-500 mt-1">{expiredCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Pro Subscribers
                {statusFilter !== 'all' && (
                  <Badge variant="outline" className="ml-2 text-xs capitalize">{statusFilter}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                View and manage Pro subscribers and their subscription details
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Loading Pro subscribers...
            </div>
          ) : filteredSubscribers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {statusFilter === 'all' ? 'No Pro subscribers yet.' : `No ${statusFilter} subscribers.`}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Pro Since</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Renewal / Expiry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscribers.map((subscriber) => {
                    const status = getStatus(subscriber);
                    return (
                      <TableRow key={subscriber.id} className={status === 'expired' ? 'opacity-60' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {subscriber.avatarUrl ? (
                              <img 
                                src={subscriber.avatarUrl} 
                                alt={subscriber.username}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <User className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{subscriber.displayName || subscriber.username}</p>
                              <p className="text-xs text-muted-foreground">@{subscriber.username}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(status)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getSubscriptionBadgeColor(subscriber.proSubscriptionType)}`}>
                            {subscriber.proSubscriptionType || 'Pro'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDate(subscriber.proSubscriptionStartDate)}
                        </TableCell>
                        <TableCell>
                          <span className={status === 'active' ? 'text-green-500 font-medium' : 'text-muted-foreground'}>
                            {calculateDuration(subscriber.proSubscriptionStartDate)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {subscriber.proSubscriptionEndDate ? (
                            <span className={
                              status === 'expired' ? 'text-red-500' :
                              status === 'cancelled' ? 'text-yellow-500' :
                              ''
                            }>
                              {formatDate(subscriber.proSubscriptionEndDate)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Lootbox Management Component
interface LootboxOpen {
  id: number;
  userId: number;
  lastOpenedAt: string;
  rewardId: number | null;
  openCount: number;
  user: { id: number; username: string; displayName: string; avatarUrl: string | null };
  reward: { id: number; name: string; rarity: string; imageUrl: string } | null;
}

function LootboxManagement() {
  const { toast } = useToast();
  const [resetLoading, setResetLoading] = useState<number | null>(null);

  const { data: lootboxOpens, isLoading, refetch } = useQuery<LootboxOpen[]>({
    queryKey: ['/api/admin/lootbox/opens'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const handleResetLootbox = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to reset ${username}'s lootbox? They will be able to open another lootbox today.`)) {
      return;
    }
    
    setResetLoading(userId);
    try {
      await apiRequest('POST', `/api/admin/lootbox/reset/${userId}`);
      toast({
        title: "Lootbox reset",
        description: `${username} can now open another lootbox today.`,
        variant: "gamefolioSuccess",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset lootbox",
        variant: "gamefolioError",
      });
    } finally {
      setResetLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-500';
      case 'rare': return 'bg-blue-500';
      case 'epic': return 'bg-purple-500';
      case 'legendary': return 'bg-amber-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5" />
          Lootbox Management
        </CardTitle>
        <CardDescription>
          View who has opened lootboxes and manage their daily lootbox status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Loading lootbox data...
          </div>
        ) : !lootboxOpens || lootboxOpens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No lootbox opens recorded yet.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Total opens: {lootboxOpens.length}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Opened At</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead>Rarity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lootboxOpens.map((open) => (
                  <TableRow key={open.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {open.user.avatarUrl ? (
                          <img
                            src={open.user.avatarUrl}
                            alt={open.user.username}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{open.user.displayName}</div>
                          <div className="text-sm text-muted-foreground">@{open.user.username}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(open.lastOpenedAt)}</TableCell>
                    <TableCell>
                      {open.reward ? (
                        <div className="flex items-center gap-2">
                          {open.reward.imageUrl && (
                            <img
                              src={open.reward.imageUrl}
                              alt={open.reward.name}
                              className="w-8 h-8 rounded object-cover"
                            />
                          )}
                          <span>{open.reward.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No reward</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {open.reward && (
                        <Badge className={`${getRarityBadgeColor(open.reward.rarity)} text-white capitalize`}>
                          {open.reward.rarity}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetLootbox(open.userId, open.user.username)}
                        disabled={resetLoading === open.userId}
                        data-testid={`button-reset-lootbox-${open.userId}`}
                      >
                        {resetLoading === open.userId ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reset
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Ban,
  Edit,
  Trash,
  Video,
  User,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Key,
  CheckCircle,
  XCircle,
  UserCog,
  UserMinus,
  Award,
  Star,
  Crown,
  Shield,
  Plus,
  Minus,
  Type,
  Trash2,
  Upload,
  Heart,
  MessageCircle,
  Eye,
  Trophy,
  Flame,
  Gift,
  ShoppingBag,
  Store,
  FolderOpen,
  Users,
  ArrowLeft,
  Ticket,
  HelpCircle,
  Package,
  ChevronDown,
} from "lucide-react";

const AdminPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [clipPage, setClipPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [selectedBadgeType, setSelectedBadgeType] = useState("");
  const [badgeUserSearch, setBadgeUserSearch] = useState("");
  const [selectedBadgeUser, setSelectedBadgeUser] = useState<any>(null);
  const [heroTextTitle, setHeroTextTitle] = useState("");
  const [heroTextSubtitle, setHeroTextSubtitle] = useState("");
  const [heroButtonText, setHeroButtonText] = useState("");
  const [heroButtonUrl, setHeroButtonUrl] = useState("");
  const [heroTargetAudience, setHeroTargetAudience] = useState("experienced_users");

  // Hero slides state
  const [heroSlideDialogOpen, setHeroSlideDialogOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<any>(null);
  const [slideTitle, setSlideTitle] = useState("");
  const [slideSubtitle, setSlideSubtitle] = useState("");
  const [slideButtonText, setSlideButtonText] = useState("");
  const [slideButtonLink, setSlideButtonLink] = useState("");
  const [slideImageUrl, setSlideImageUrl] = useState("");
  const [slideDisplayImageUrl, setSlideDisplayImageUrl] = useState("");
  const [slideIsActive, setSlideIsActive] = useState(true);
  const [slideVisibility, setSlideVisibility] = useState("everyone");
  const [slideUploading, setSlideUploading] = useState(false);
  const [activeSlideTab, setActiveSlideTab] = useState<string>("overview");
  const [slideBucketBrowser, setSlideBucketBrowser] = useState(false);
  const [slideBucketName, setSlideBucketName] = useState("gamefolio-backgrounds");
  const [slideBucketImages, setSlideBucketImages] = useState<any[]>([]);
  const [slideBucketLoading, setSlideBucketLoading] = useState(false);
  const [slideBucketSearch, setSlideBucketSearch] = useState("");
  
  // Level management state
  const [levelUserSearch, setLevelUserSearch] = useState("");
  const [selectedLevelUser, setSelectedLevelUser] = useState<any>(null);
  const [newLevel, setNewLevel] = useState("");
  const [newXP, setNewXP] = useState("");

  // Streak management state
  const [streakUserSearch, setStreakUserSearch] = useState("");
  const [selectedStreakUser, setSelectedStreakUser] = useState<any>(null);
  const [newCurrentStreak, setNewCurrentStreak] = useState("");
  const [newLongestStreak, setNewLongestStreak] = useState("");

  // Badge creation state
  const [newBadgeName, setNewBadgeName] = useState("");
  const [newBadgeDescription, setNewBadgeDescription] = useState("");
  const [newBadgeTextColor, setNewBadgeTextColor] = useState("#FFFFFF");
  const [newBadgeBackgroundColor, setNewBadgeBackgroundColor] = useState("#6B7280");
  const [newBadgeImageUrl, setNewBadgeImageUrl] = useState("");
  const [createBadgeLoading, setCreateBadgeLoading] = useState(false);
  const [editingBadge, setEditingBadge] = useState<any>(null);
  const [editBadgeDialogOpen, setEditBadgeDialogOpen] = useState(false);

  // Points tab state
  const [selectedPointsUserId, setSelectedPointsUserId] = useState<number | null>(null);
  const [pointsHistory, setPointsHistory] = useState<any[] | null>(null);
  const [isLoadingPointsHistory, setIsLoadingPointsHistory] = useState(false);
  const [pointsAdjustment, setPointsAdjustment] = useState<number | null>(null);
  const [pointsAdjustmentReason, setPointsAdjustmentReason] = useState("");

  // Asset rewards state
  const [newRewardName, setNewRewardName] = useState("");
  const [newRewardImageUrl, setNewRewardImageUrl] = useState("");
  const [newRewardImageFile, setNewRewardImageFile] = useState<File | null>(null);
  const [newRewardRarity, setNewRewardRarity] = useState<"common" | "rare" | "epic" | "legendary">("common");
  const [newRewardAssetType, setNewRewardAssetType] = useState<AssetType>("other");
  const [newRewardAvailableInLootbox, setNewRewardAvailableInLootbox] = useState(true);
  const [newRewardAvailableInStore, setNewRewardAvailableInStore] = useState(false);
  const [newRewardProOnly, setNewRewardProOnly] = useState(false);
  const [newRewardFreeItem, setNewRewardFreeItem] = useState(false);
  const [newRewardRedeemable, setNewRewardRedeemable] = useState(false);
  const [newRewardCategory, setNewRewardCategory] = useState<string>("other");
  const [newRewardStorePrice, setNewRewardStorePrice] = useState("");
  const [createRewardLoading, setCreateRewardLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Bucket browser state
  const [selectedBucket, setSelectedBucket] = useState<string>("gamefolio-name-tags");
  const [currentBucketFolder, setCurrentBucketFolder] = useState<string>("");
  const [bucketContents, setBucketContents] = useState<BucketContents | null>(null);
  const [loadingBucket, setLoadingBucket] = useState(false);
  
  // Assets management state
  const [assetsSelectedFile, setAssetsSelectedFile] = useState<BucketFile | null>(null);
  const [assetsAssignDialogOpen, setAssetsAssignDialogOpen] = useState(false);
  const [assetsInLootbox, setAssetsInLootbox] = useState<boolean>(true);
  const [assetsInStore, setAssetsInStore] = useState<boolean>(false);
  const [assetsProOnly, setAssetsProOnly] = useState<boolean>(false);
  const [assetsRarity, setAssetsRarity] = useState<string>("common");
  const [assetsUnlockChance, setAssetsUnlockChance] = useState<number>(10);
  const [assetsStorePrice, setAssetsStorePrice] = useState<string>("");
  const [assetsAssetType, setAssetsAssetType] = useState<string>("other");
  const [assetsAssignName, setAssetsAssignName] = useState<string>("");
  const [assetsAssigning, setAssetsAssigning] = useState(false);
  
  // Reward category options
  const rewardCategoryOptions = [
    { value: "pro_user", label: "Pro User Exclusive", icon: "crown" },
    { value: "lootbox", label: "Loot Box Reward", icon: "gift" },
    { value: "free_item", label: "Free Item (All Users)", icon: "users" },
    { value: "store_item", label: "Store/Buyable Item", icon: "shopping-bag" },
    { value: "redeemable", label: "Redeemable Item", icon: "ticket" },
    { value: "other", label: "Other (TBD)", icon: "help-circle" },
  ];
  
  const extractAssetFilePath = (url: string): string => {
    try {
      const patterns = [
        /\/storage\/v1\/object\/(?:public|sign)\/(.+?)(?:\?.*)?$/,
        /\/storage\/v1\/object\/(.+?)(?:\?.*)?$/,
      ];
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }
      return url;
    } catch {
      return url;
    }
  };

  const getAssignment = (fileUrl: string) => {
    if (!assetAssignments) return undefined;
    const key = extractAssetFilePath(fileUrl);
    return assetAssignments[key];
  };

  // Asset type display names
  const assetTypeDisplayNames: Record<string, string> = {
    avatar_border: "Avatar Border",
    profile_banner: "Profile Picture Border",
    profile_background: "Profile Background",
    badge: "Badge",
    emoji: "Emoji",
    sound_effect: "Sound Effect",
    other: "Other",
  };
  
  // Rarity to unlock chance mapping
  const rarityChanceMap: Record<string, number> = {
    common: 60,
    rare: 25,
    epic: 12,
    legendary: 3,
  };
  
  // Handle reward image upload
  const handleRewardImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/admin/asset-rewards/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      const data = await response.json();
      setNewRewardImageUrl(data.imageUrl);
      setNewRewardImageFile(file);
      toast({
        title: "Image uploaded",
        description: "Reward image uploaded successfully.",
        variant: "gamefolioSuccess",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image",
        variant: "gamefolioError",
      });
    } finally {
      setUploadingImage(false);
    }
  };
  const [selectedReward, setSelectedReward] = useState<AssetRewardWithClaims | null>(null);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<AssetReward | null>(null);
  const [editRewardDialogOpen, setEditRewardDialogOpen] = useState(false);
  const [editUploadingImage, setEditUploadingImage] = useState(false);
  
  // Handle edit reward image upload
  const handleEditRewardImageUpload = async (file: File) => {
    if (!editingReward) return;
    setEditUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/admin/asset-rewards/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      const data = await response.json();
      setEditingReward({ ...editingReward, imageUrl: data.imageUrl });
      toast({
        title: "Image uploaded",
        description: "Reward image updated successfully.",
        variant: "gamefolioSuccess",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image",
        variant: "gamefolioError",
      });
    } finally {
      setEditUploadingImage(false);
    }
  };

  // Access check is now handled by AdminProtectedRoute

  // Fetch admin stats
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch users with pagination
  const { data: usersData, isLoading: usersLoading } = useQuery<UsersData>({
    queryKey: ["/api/admin/users", { page: userPage, search: userSearch }],
    queryFn: getQueryFn({ on401: "throw" }),
    placeholderData: keepPreviousData,
  });

  // Fetch users for badge assignment search
  const { data: badgeUsersData, isLoading: badgeUsersLoading } = useQuery<UsersData>({
    queryKey: ["/api/admin/users", { page: 1, search: badgeUserSearch, limit: 10 }],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: badgeUserSearch.length >= 2,
    placeholderData: keepPreviousData,
  });

  // Fetch users for streak assignment search
  const { data: streakUsersData, isLoading: streakUsersLoading } = useQuery<UsersData>({
    queryKey: ["/api/admin/users", { page: 1, search: streakUserSearch, limit: 10 }],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: streakUserSearch.length >= 2,
    placeholderData: keepPreviousData,
  });

  // Fetch clips with pagination
  const { data: clipsData, isLoading: clipsLoading } = useQuery<ClipsData>({
    queryKey: ["/api/admin/clips", { page: clipPage }],
    queryFn: getQueryFn({ on401: "throw" }),
    placeholderData: keepPreviousData,
  });

  // Fetch current hero text settings
  const { data: currentHeroText, isLoading: heroTextLoading } = useQuery<HeroTextData>({
    queryKey: ["/api/hero-text/experienced"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Badge management queries
  const { data: badgesData, isLoading: badgesLoading, refetch: refetchBadges } = useQuery<BadgeType[]>({
    queryKey: ["/api/admin/badges"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Asset rewards queries
  const { data: assetRewardsData, isLoading: rewardsLoading, refetch: refetchRewards } = useQuery<AssetReward[]>({
    queryKey: ["/api/admin/asset-rewards"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Bucket contents query - uses default fetcher with query parameters
  const bucketFilesUrl = `/api/admin/storage/buckets/${selectedBucket}/files`;
  const { data: bucketData, isLoading: bucketLoading, refetch: refetchBucket } = useQuery<BucketContents>({
    queryKey: [bucketFilesUrl, currentBucketFolder ? { folder: currentBucketFolder } : undefined],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Assets tab state
  const [assetsActiveBucket, setAssetsActiveBucket] = useState<string>("");
  const [assetsDropdownBucket, setAssetsDropdownBucket] = useState<string>("");
  const [assetsBucketFolder, setAssetsBucketFolder] = useState<string>("");
  const [assetsSelectedBucketName, setAssetsSelectedBucketName] = useState<string>("");
  const [assetsSearchQuery, setAssetsSearchQuery] = useState<string>("");

  // Hero slides query
  const { data: heroSlides, isLoading: heroSlidesLoading, refetch: refetchHeroSlides } = useQuery<any[]>({
    queryKey: ["/api/admin/hero-slides"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Hero slide settings (interval)
  const { data: heroSlideSettings, refetch: refetchHeroSlideSettings } = useQuery<{ intervalSeconds: number }>({
    queryKey: ["/api/admin/hero-slides/settings"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  const [slideIntervalSeconds, setSlideIntervalSeconds] = useState<number>(6);

  const { data: assetBucketList, isLoading: assetBucketsLoading } = useQuery<{ id: string; name: string; public: boolean; createdAt: string }[]>({
    queryKey: ["/api/admin/storage/buckets"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: assetsActiveBucketData, isLoading: assetsActiveBucketLoading, refetch: refetchActiveBucket } = useQuery<BucketContents>({
    queryKey: [`/api/admin/storage/buckets/${assetsActiveBucket}/files`, assetsBucketFolder ? { folder: assetsBucketFolder } : undefined],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!assetsActiveBucket,
  });

  const handleAssetsGo = () => {
    if (assetsDropdownBucket) {
      setAssetsBucketFolder("");
      setAssetsActiveBucket(assetsDropdownBucket);
    }
  };

  // Asset assignments query
  const { data: assetAssignments, isLoading: assignmentsLoading, refetch: refetchAssignments } = useQuery<Record<string, any>>({
    queryKey: ["/api/admin/assets/assignments"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Function to select a file from bucket and use it as reward image
  const selectBucketFileAsReward = (file: BucketFile) => {
    setNewRewardImageUrl(file.publicUrl);
    setNewRewardName(file.name.replace(/\.[^/.]+$/, "")); // Remove file extension for name
    toast({
      title: "Asset Selected",
      description: `Selected "${file.name}" from ${selectedBucket}`,
      variant: "gamefolioSuccess",
    });
  };

  const handleAssetAssign = async () => {
    if (!assetsSelectedFile) return;
    setAssetsAssigning(true);
    try {
      await apiRequest('POST', '/api/admin/assets/assign', {
        imageUrl: assetsSelectedFile.publicUrl,
        name: assetsAssignName || assetsSelectedFile.name.replace(/\.[^/.]+$/, ""),
        bucket: assetsSelectedBucketName,
        path: assetsSelectedFile.path,
        availableInLootbox: assetsInLootbox,
        availableInStore: assetsInStore,
        proOnly: assetsProOnly,
        rarity: assetsRarity,
        unlockChance: assetsUnlockChance,
        storePrice: assetsStorePrice ? parseInt(assetsStorePrice) : null,
        assetType: assetsAssetType,
      });
      toast({
        title: "Asset Assigned",
        description: `"${assetsAssignName || assetsSelectedFile.name}" has been assigned successfully.`,
        variant: "gamefolioSuccess",
      });
      refetchAssignments();
      setAssetsAssignDialogOpen(false);
      setAssetsSelectedFile(null);
    } catch (error: any) {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign asset",
        variant: "gamefolioError",
      });
    } finally {
      setAssetsAssigning(false);
    }
  };

  const handleAssetUnassign = async (imageUrl: string) => {
    try {
      await apiRequest('POST', '/api/admin/assets/unassign', { imageUrl });
      toast({
        title: "Asset Unassigned",
        description: "Asset has been removed from all assignments.",
        variant: "gamefolioSuccess",
      });
      refetchAssignments();
    } catch (error: any) {
      toast({
        title: "Unassign Failed",
        description: error.message || "Failed to unassign asset",
        variant: "gamefolioError",
      });
    }
  };

  const openAssignDialog = (file: BucketFile, bucketName?: string) => {
    setAssetsSelectedFile(file);
    if (bucketName) setAssetsSelectedBucketName(bucketName);
    setAssetsAssignName(file.name.replace(/\.[^/.]+$/, ""));
    const existing = getAssignment(file.publicUrl);
    if (existing) {
      setAssetsRarity(existing.rarity || 'common');
      setAssetsUnlockChance(existing.unlockChance ?? 10);
      setAssetsInLootbox(existing.availableInLootbox ?? false);
      setAssetsInStore(existing.availableInStore ?? false);
      setAssetsProOnly(existing.proOnly ?? false);
      setAssetsStorePrice(existing.storePrice?.toString() || '');
      setAssetsAssetType(existing.assetType || 'other');
      setAssetsAssignName(existing.name || file.name.replace(/\.[^/.]+$/, ""));
    } else {
      setAssetsRarity('common');
      setAssetsUnlockChance(60);
      setAssetsInLootbox(true);
      setAssetsInStore(false);
      setAssetsProOnly(false);
      setAssetsStorePrice('');
      setAssetsAssetType('other');
    }
    setAssetsAssignDialogOpen(true);
  };

  // Update form fields when data loads
  React.useEffect(() => {
    if (currentHeroText) {
      setHeroTextTitle(currentHeroText.title || "");
      setHeroTextSubtitle(currentHeroText.subtitle || "");
      setHeroButtonText(currentHeroText.buttonText || "");
      setHeroButtonUrl(currentHeroText.buttonUrl || "");
      setHeroTargetAudience(currentHeroText.targetAudience || "experienced_users");
    }
  }, [currentHeroText]);

  React.useEffect(() => {
    if (heroSlideSettings) {
      setSlideIntervalSeconds(heroSlideSettings.intervalSeconds || 6);
    }
  }, [heroSlideSettings]);

  // Handle user search
  const handleUserSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setUserPage(1); // Reset to first page on new search
    // The query will be refetched automatically due to the dependency on userSearch
  };

  // Handle user actions
  const handleBanUser = async (userId: number) => {
    try {
      await apiRequest("POST", `/api/admin/users/${userId}/ban`, { reason: banReason });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"], exact: false });
      toast({
        title: "User banned",
        description: "The user has been banned successfully.",
      });
      setUserDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to ban user. Please try again.",
        variant: "gamefolioError",
      });
    }
  };

  const handleUnbanUser = async (userId: number) => {
    try {
      await apiRequest("POST", `/api/admin/users/${userId}/unban`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"], exact: false });
      toast({
        title: "User unbanned",
        description: "The user has been unbanned successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unban user. Please try again.",
        variant: "gamefolioError",
      });
    }
  };

  const handleMakeAdmin = async (userId: number) => {
    try {
      await apiRequest("POST", `/api/admin/users/${userId}/make-admin`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"], exact: false });
      toast({
        title: "Role updated",
        description: "The user is now an administrator.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user role. Please try again.",
        variant: "gamefolioError",
      });
    }
  };

  const handleRemoveAdmin = async (userId: number) => {
    try {
      await apiRequest("POST", `/api/admin/users/${userId}/remove-admin`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"], exact: false });
      toast({
        title: "Role updated",
        description: "Admin privileges removed from user.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user role. Please try again.",
        variant: "gamefolioError",
      });
    }
  };

  const handleResetPassword = async (userId: number) => {
    try {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/reset-password`);
      const data = await response.json();
      
      toast({
        title: "Password reset",
        description: "Password reset link has been sent to the user.",
      });
      
      // In development environment, show the temporary password
      if (data.tempPassword) {
        toast({
          title: "Development mode",
          description: `Temporary password: ${data.tempPassword}`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset password. Please try again.",
        variant: "gamefolioError",
      });
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (confirm(`Are you sure you want to delete user "${username}"? This will permanently delete:\n\n• All their clips and screenshots\n• All their comments and likes\n• All their messages and notifications\n• All their follow relationships\n• Their entire profile and data\n\nThis action cannot be undone!`)) {
      try {
        await apiRequest("DELETE", `/api/admin/users/${userId}`);
        // Use more specific query invalidation to avoid affecting auth state
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"], exact: false });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"], exact: false });
        toast({
          title: "User deleted",
          description: `User "${username}" and all related data has been deleted successfully.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete user. Please try again.",
          variant: "gamefolioError",
        });
      }
    }
  };

  const handleDeleteClip = async (clipId: number) => {
    if (confirm("Are you sure you want to delete this clip? This action cannot be undone.")) {
      try {
        await apiRequest("DELETE", `/api/admin/clips/${clipId}`);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/clips"], exact: false });
        toast({
          title: "Clip deleted",
          description: "The clip has been deleted successfully.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete clip. Please try again.",
          variant: "gamefolioError",
        });
      }
    }
  };

  // Badge management functions
  const handleAssignBadge = async (userId: number, badgeType: string) => {
    try {
      await apiRequest("POST", `/api/admin/users/${userId}/badges`, { badgeType });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"], exact: false });
      toast({
        title: "Badge assigned",
        description: `${badgeType} badge assigned successfully.`,
      });
      setBadgeDialogOpen(false);
      setSelectedBadgeType("");
      setSelectedBadgeUser(null);
      setBadgeUserSearch("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign badge. Please try again.",
        variant: "gamefolioError",
      });
    }
  };

  const handleRemoveBadge = async (userId: number, badgeType: string) => {
    try {
      await apiRequest("DELETE", `/api/admin/users/${userId}/badges/${badgeType}`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"], exact: false });
      toast({
        title: "Badge removed",
        description: `${badgeType} badge removed successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove badge. Please try again.",
        variant: "gamefolioError",
      });
    }
  };

  const handleCleanupBadges = async () => {
    try {
      await apiRequest("POST", "/api/admin/badges/cleanup");
      toast({
        title: "Badges cleaned up",
        description: "Expired badges have been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cleanup badges. Please try again.",
        variant: "gamefolioError",
      });
    }
  };

  // New badge management handlers
  const handleCreateBadge = async () => {
    if (!newBadgeName.trim()) {
      toast({
        title: "Error",
        description: "Badge name is required.",
        variant: "gamefolioError",
      });
      return;
    }

    setCreateBadgeLoading(true);
    try {
      await apiRequest("POST", "/api/admin/badges", {
        name: newBadgeName.trim(),
        description: newBadgeDescription.trim() || null,
        imageUrl: newBadgeImageUrl || null,
        textColor: newBadgeTextColor,
        backgroundColor: newBadgeBackgroundColor,
        isActive: true
      });
      
      // Reset form
      setNewBadgeName("");
      setNewBadgeDescription("");
      setNewBadgeTextColor("#FFFFFF");
      setNewBadgeBackgroundColor("#6B7280");
      setNewBadgeImageUrl("");
      
      // Refresh badges list
      refetchBadges();
      
      toast({
        title: "Badge created",
        description: `Badge "${newBadgeName}" created successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create badge. Please try again.",
        variant: "gamefolioError",
      });
    } finally {
      setCreateBadgeLoading(false);
    }
  };

  const handleDeleteBadge = async (badgeId: number) => {
    if (!confirm("Are you sure you want to delete this badge? This action cannot be undone.")) {
      return;
    }

    try {
      await apiRequest("DELETE", `/api/admin/badges/${badgeId}`);
      refetchBadges();
      toast({
        title: "Badge deleted",
        description: "Badge deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete badge. It may be assigned to users.",
        variant: "gamefolioError",
      });
    }
  };

  const handleBadgeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For now, we'll use a placeholder URL simulation
    // In a real implementation, you would upload to your file storage service
    try {
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create a temporary local URL for preview
      const imageUrl = URL.createObjectURL(file);
      setNewBadgeImageUrl(imageUrl);
      
      toast({
        title: "Image uploaded",
        description: "Badge image uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "gamefolioError",
      });
    }
  };

  const getBadgeIcon = (badgeType: string) => {
    switch (badgeType) {
      case 'newcomer': return <Star className="h-4 w-4" />;
      case 'founder': return <Crown className="h-4 w-4" />;
      case 'admin': return <Shield className="h-4 w-4" />;
      default: return <Award className="h-4 w-4" />;
    }
  };

  const getBadgeColor = (badgeType: string) => {
    switch (badgeType) {
      case 'newcomer': return "bg-green-500";
      case 'founder': return "bg-purple-500";
      case 'admin': return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  // Helper function to count badges by type
  const getBadgeCount = (badgeType: string): number => {
    if (!usersData?.users) return 0;
    return usersData.users.reduce((count, user) => {
      return count + (user.badges?.filter(badge => badge.badgeType === badgeType).length || 0);
    }, 0);
  };

  // Handle hero text update
  const handleUpdateHeroText = async () => {
    try {
      await apiRequest("PATCH", "/api/hero-text/experienced", {
        title: heroTextTitle,
        subtitle: heroTextSubtitle,
        buttonText: heroButtonText || null,
        buttonUrl: heroButtonUrl || null,
        targetAudience: heroTargetAudience,
      });

      toast({
        title: "Success",
        description: "Hero text updated successfully",
      });
      // Refresh hero text data
      queryClient.invalidateQueries({ queryKey: ["/api/hero-text/experienced"] });
    } catch (error) {
      console.error("Error updating hero text:", error);
      toast({
        title: "Error",
        description: "Failed to update hero text",
        variant: "gamefolioError",
      });
    }
  };

  // Data transformation for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  const formatUserTypeData = () => {
    if (!stats?.analytics?.userTypeDistribution) return [];
    return stats.analytics.userTypeDistribution.map((item: any, index: number) => ({
      name: item.type === 'unspecified' ? 'Not specified' : item.type,
      value: item.count,
      fill: COLORS[index % COLORS.length]
    }));
  };
  
  const formatAgeRangeData = () => {
    if (!stats?.analytics?.ageRangeDistribution) return [];
    return stats.analytics.ageRangeDistribution.map((item: any, index: number) => ({
      name: item.range === 'unspecified' ? 'Not specified' : item.range,
      value: item.count,
      fill: COLORS[index % COLORS.length]
    }));
  };

  // Hero slide interval handler
  const handleSaveSlideInterval = async () => {
    try {
      await apiRequest("PATCH", "/api/admin/hero-slides/settings", { intervalSeconds: slideIntervalSeconds });
      toast({ title: "Interval updated", description: `Slides will now rotate every ${slideIntervalSeconds} seconds.` });
      refetchHeroSlideSettings();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update interval", variant: "destructive" });
    }
  };

  // Hero slides handlers
  const resetSlideForm = () => {
    setEditingSlide(null);
    setSlideTitle("");
    setSlideSubtitle("");
    setSlideButtonText("");
    setSlideButtonLink("");
    setSlideImageUrl("");
    setSlideDisplayImageUrl("");
    setSlideIsActive(true);
    setSlideVisibility("everyone");
  };

  const openEditSlide = (slide: any) => {
    setEditingSlide(slide);
    setSlideTitle(slide.title || "");
    setSlideSubtitle(slide.subtitle || "");
    setSlideButtonText(slide.buttonText || "");
    setSlideButtonLink(slide.buttonLink || "");
    setSlideImageUrl(slide.imageUrl || "");
    setSlideDisplayImageUrl(slide.signedImageUrl || slide.imageUrl || "");
    setSlideIsActive(slide.isActive ?? true);
    setSlideVisibility(slide.visibility || "everyone");
    setActiveSlideTab(`slide-${slide.id}`);
  };

  const fetchSlideBucketImages = async (bucket: string) => {
    setSlideBucketLoading(true);
    try {
      const res = await fetch(`/api/admin/storage/buckets/${bucket}/files`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load images");
      const data = await res.json();
      setSlideBucketImages(data.files?.filter((f: any) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name)) || []);
    } catch (err) {
      setSlideBucketImages([]);
    } finally {
      setSlideBucketLoading(false);
    }
  };

  const handleAddNewSlide = () => {
    resetSlideForm();
    setActiveSlideTab("new-slide");
  };

  const handleSlideImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Hero banner images must be under 10MB.", variant: "destructive" });
      e.target.value = '';
      return;
    }
    
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({ title: "Invalid format", description: "Please upload a JPG, PNG, or WebP image.", variant: "destructive" });
      e.target.value = '';
      return;
    }
    
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    const dimensionCheck = await new Promise<{ width: number; height: number }>((resolve) => {
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(objectUrl);
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
        URL.revokeObjectURL(objectUrl);
      };
      img.src = objectUrl;
    });
    
    if (dimensionCheck.width < 1200 || dimensionCheck.height < 400) {
      toast({ title: "Image too small", description: `Image is ${dimensionCheck.width}×${dimensionCheck.height}px. Minimum recommended is 1200×400px for sharp display.`, variant: "destructive" });
      e.target.value = '';
      return;
    }
    
    if (dimensionCheck.height > dimensionCheck.width) {
      toast({ title: "Landscape orientation required", description: "Hero banners should be wider than they are tall. Please use a landscape image.", variant: "destructive" });
      e.target.value = '';
      return;
    }
    
    setSlideUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/admin/hero-slides/upload-image", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setSlideImageUrl(data.imageUrl);
      setSlideDisplayImageUrl(data.signedImageUrl || data.imageUrl);
      toast({ title: "Image uploaded", description: `Hero slide image uploaded successfully (${dimensionCheck.width}×${dimensionCheck.height}px).` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Failed to upload image", variant: "destructive" });
    } finally {
      setSlideUploading(false);
    }
  };

  const handleSaveSlide = async () => {
    if (!slideTitle.trim() || !slideImageUrl.trim()) {
      toast({ title: "Missing fields", description: "Title and image are required.", variant: "destructive" });
      return;
    }
    try {
      const body = {
        title: slideTitle.trim(),
        subtitle: slideSubtitle.trim() || null,
        buttonText: slideButtonText.trim() || null,
        buttonLink: slideButtonLink.trim() || null,
        imageUrl: slideImageUrl.trim(),
        isActive: slideIsActive,
        visibility: slideVisibility,
        displayOrder: editingSlide?.displayOrder ?? (heroSlides?.length || 0),
      };
      if (editingSlide) {
        await apiRequest("PATCH", `/api/admin/hero-slides/${editingSlide.id}`, body);
        toast({ title: "Slide updated", description: "Hero slide has been updated." });
      } else {
        await apiRequest("POST", "/api/admin/hero-slides", body);
        toast({ title: "Slide created", description: "New hero slide has been added." });
      }
      resetSlideForm();
      setActiveSlideTab("overview");
      refetchHeroSlides();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save slide", variant: "destructive" });
    }
  };

  const handleDeleteSlide = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/admin/hero-slides/${id}`);
      toast({ title: "Slide deleted", description: "Hero slide has been removed." });
      refetchHeroSlides();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete slide", variant: "destructive" });
    }
  };

  const handleToggleSlide = async (slide: any) => {
    try {
      await apiRequest("PATCH", `/api/admin/hero-slides/${slide.id}`, { isActive: !slide.isActive });
      refetchHeroSlides();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to toggle slide", variant: "destructive" });
    }
  };

  const handleMoveSlide = async (slide: any, direction: 'up' | 'down') => {
    if (!heroSlides) return;
    const sorted = [...heroSlides].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex((s) => s.id === slide.id);
    if (direction === 'up' && idx <= 0) return;
    if (direction === 'down' && idx >= sorted.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const reordered = sorted.map((s, i) => ({
      id: s.id,
      displayOrder: i === idx ? sorted[swapIdx].displayOrder : i === swapIdx ? sorted[idx].displayOrder : s.displayOrder,
    }));
    try {
      await apiRequest("POST", "/api/admin/hero-slides/reorder", { slides: reordered });
      refetchHeroSlides();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to reorder slides", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <div>
          <Button variant="outline" onClick={() => window.location.href = "/"}>
            Return to App
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="dashboard" className="text-xs px-3 py-1.5">Dashboard</TabsTrigger>
          <TabsTrigger value="users" className="text-xs px-3 py-1.5">Users</TabsTrigger>
          <TabsTrigger value="content" className="text-xs px-3 py-1.5">Content</TabsTrigger>
          <TabsTrigger value="content-filter" className="text-xs px-3 py-1.5">Filter</TabsTrigger>
          <TabsTrigger value="banner" className="text-xs px-3 py-1.5">Banner</TabsTrigger>
          <TabsTrigger value="badges" className="text-xs px-3 py-1.5">Badges</TabsTrigger>
          <TabsTrigger value="levels" className="text-xs px-3 py-1.5">Levels</TabsTrigger>
          <TabsTrigger value="streaks" className="text-xs px-3 py-1.5">Streaks</TabsTrigger>
          <TabsTrigger value="points" className="text-xs px-3 py-1.5">Points</TabsTrigger>
          <TabsTrigger value="hero-text" className="text-xs px-3 py-1.5">Hero</TabsTrigger>
          <TabsTrigger value="asset-rewards" className="text-xs px-3 py-1.5">Rewards</TabsTrigger>
          <TabsTrigger value="lootbox" className="text-xs px-3 py-1.5">Lootbox</TabsTrigger>
          <TabsTrigger value="store-management" className="text-xs px-3 py-1.5">Store</TabsTrigger>
          <TabsTrigger value="assets" className="text-xs px-3 py-1.5">Assets</TabsTrigger>
          <TabsTrigger value="pro-subscribers" className="text-xs px-3 py-1.5">Pro</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs px-3 py-1.5">Settings</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? "Loading..." : stats?.overview?.totalUsers || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Registered accounts on the platform
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clips</CardTitle>
                <Video className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? "Loading..." : stats?.overview?.totalClips || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Video clips uploaded to the platform
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Games</CardTitle>
                <Video className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? "Loading..." : stats?.overview?.totalGames || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Games available on the platform
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Actions</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"], exact: false });
                    toast({
                      title: "Refreshed",
                      description: "Dashboard data has been updated.",
                    });
                  }}
                >
                  Refresh Data
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>User Types</CardTitle>
                <CardDescription>
                  Distribution of user types from onboarding
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-80">
                  {statsLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <p>Loading data...</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={formatUserTypeData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {formatUserTypeData().map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Age Range</CardTitle>
                <CardDescription>
                  Distribution of user age ranges
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-80">
                  {statsLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <p>Loading data...</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={formatAgeRangeData()}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" name="Users" fill="#4C8">
                          {formatAgeRangeData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Games</CardTitle>
                <CardDescription>Most popular games among users</CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex h-40 items-center justify-center">
                    <p>Loading data...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats?.analytics?.topGames?.map((game: any, i: number) => (
                      <div key={game.id} className="flex items-center">
                        <div className="w-8 text-center font-bold">{i + 1}</div>
                        <div className="ml-2 flex-1">
                          <div className="font-medium">{game.name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Clips</CardTitle>
                <CardDescription>Latest content uploads</CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex h-40 items-center justify-center">
                    <p>Loading data...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats?.analytics?.recentClips?.map((clip: any) => (
                      <div key={clip.id} className="flex items-center">
                        <div className="flex-1">
                          <div className="font-medium">{clip.title}</div>
                          <div className="text-sm text-muted-foreground">
                            By {clip.user.username}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.location.href = `/clips/${clip.id}`}
                        >
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage users, roles, and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUserSearch} className="flex items-center space-x-2 mb-4">
                <Input
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </form>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Privacy</TableHead>
                      <TableHead>Current Streak</TableHead>
                      <TableHead>Longest Streak</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">
                          Loading users...
                        </TableCell>
                      </TableRow>
                    ) : usersData?.users?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      usersData?.users.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.email || "No email"}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === "admin" ? "default" : "outline"}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                user.status === "active"
                                  ? "default"
                                  : user.status === "banned"
                                  ? "destructive"
                                  : "outline"
                              }
                            >
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isPrivate ? "secondary" : "outline"}>
                              {user.isPrivate ? "Private" : "Public"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1" data-testid={`streak-current-${user.id}`}>
                              <Flame className="h-3 w-3 text-orange-500" />
                              <span>{user.currentStreak || 0} days</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1" data-testid={`streak-longest-${user.id}`}>
                              <Trophy className="h-3 w-3 text-yellow-500" />
                              <span>{user.longestStreak || 0} days</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.location.href = `/profile/${user.username}`}
                                title="View Profile"
                              >
                                <User className="h-4 w-4" />
                              </Button>
                              
                              {user.status === "active" ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setBanReason("");
                                    setUserDialogOpen(true);
                                  }}
                                  title="Ban User"
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleUnbanUser(user.id)}
                                  title="Unban User"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {user.role === "admin" ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveAdmin(user.id)}
                                  title="Remove Admin"
                                >
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleMakeAdmin(user.id)}
                                  title="Make Admin"
                                >
                                  <UserCog className="h-4 w-4" />
                                </Button>
                              )}
                              
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleResetPassword(user.id)}
                                title="Reset Password"
                              >
                                <Key className="h-4 w-4" />
                              </Button>
                              
                              {user.role !== "admin" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteUser(user.id, user.username)}
                                  title="Delete User"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {usersData?.pagination && (
                <div className="flex items-center justify-end space-x-2 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUserPage(Math.max(1, userPage - 1))}
                    disabled={userPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-sm">
                    Page {userPage} of {usersData.pagination.totalPages || 1}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUserPage(Math.min(usersData.pagination.totalPages, userPage + 1))}
                    disabled={userPage >= usersData.pagination.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Moderation</CardTitle>
              <CardDescription>
                Manage clips and other content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Game</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clipsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          Loading clips...
                        </TableCell>
                      </TableRow>
                    ) : clipsData?.clips?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          No clips found
                        </TableCell>
                      </TableRow>
                    ) : (
                      clipsData?.clips.map((clip: any) => (
                        <TableRow key={clip.id}>
                          <TableCell className="font-medium">{clip.title}</TableCell>
                          <TableCell>{clip.user.username}</TableCell>
                          <TableCell>{clip.game?.name || "No game"}</TableCell>
                          <TableCell>{new Date(clip.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>{clip.views}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.location.href = `/clips/${clip.id}`}
                                title="View Clip"
                              >
                                <Video className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClip(clip.id)}
                                title="Delete Clip"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {clipsData?.pagination && (
                <div className="flex items-center justify-end space-x-2 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setClipPage(Math.max(1, clipPage - 1))}
                    disabled={clipPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-sm">
                    Page {clipPage} of {clipsData.pagination.totalPages || 1}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setClipPage(Math.min(clipsData.pagination.totalPages, clipPage + 1))}
                    disabled={clipPage >= clipsData.pagination.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Filter Tab */}
        <TabsContent value="content-filter" className="space-y-4">
          <AdminContentFilter />
        </TabsContent>

        {/* Banner Management Tab */}
        <TabsContent value="banner" className="space-y-4">
          <BannerManagement />
        </TabsContent>

        {/* Badges Tab */}
        <TabsContent value="badges" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Badge Creation Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create New Badge
                </CardTitle>
                <CardDescription>
                  Design custom badges with images and text
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="badge-name" className="text-sm font-medium">
                      Badge Name
                    </label>
                    <Input
                      id="badge-name"
                      placeholder="Enter badge name"
                      value={newBadgeName}
                      onChange={(e) => setNewBadgeName(e.target.value)}
                      data-testid="input-badge-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="badge-description" className="text-sm font-medium">
                      Description
                    </label>
                    <Input
                      id="badge-description"
                      placeholder="Enter badge description"
                      value={newBadgeDescription}
                      onChange={(e) => setNewBadgeDescription(e.target.value)}
                      data-testid="input-badge-description"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="badge-text-color" className="text-sm font-medium">
                        Text Color
                      </label>
                      <div className="flex gap-2">
                        <Input
                          id="badge-text-color"
                          type="color"
                          value={newBadgeTextColor}
                          onChange={(e) => setNewBadgeTextColor(e.target.value)}
                          className="w-16 h-10 p-1 border-2"
                          data-testid="input-badge-text-color"
                        />
                        <Input
                          value={newBadgeTextColor}
                          onChange={(e) => setNewBadgeTextColor(e.target.value)}
                          placeholder="#FFFFFF"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="badge-bg-color" className="text-sm font-medium">
                        Background Color
                      </label>
                      <div className="flex gap-2">
                        <Input
                          id="badge-bg-color"
                          type="color"
                          value={newBadgeBackgroundColor}
                          onChange={(e) => setNewBadgeBackgroundColor(e.target.value)}
                          className="w-16 h-10 p-1 border-2"
                          data-testid="input-badge-bg-color"
                        />
                        <Input
                          value={newBadgeBackgroundColor}
                          onChange={(e) => setNewBadgeBackgroundColor(e.target.value)}
                          placeholder="#6B7280"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="badge-image" className="text-sm font-medium">
                      Badge Image (Optional)
                    </label>
                    <Input
                      id="badge-image"
                      type="file"
                      accept="image/*"
                      onChange={handleBadgeImageUpload}
                      data-testid="input-badge-image"
                    />
                    {newBadgeImageUrl && (
                      <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                        <img src={newBadgeImageUrl} alt="Preview" className="w-8 h-8 rounded" />
                        <span className="text-sm text-green-700">Image uploaded successfully</span>
                      </div>
                    )}
                  </div>

                  {/* Badge Preview */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Preview</label>
                    <div className="p-4 bg-gray-50 rounded border">
                      <div 
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium"
                        style={{
                          backgroundColor: newBadgeBackgroundColor,
                          color: newBadgeTextColor
                        }}
                      >
                        {newBadgeImageUrl && (
                          <img src={newBadgeImageUrl} alt="" className="w-4 h-4 rounded" />
                        )}
                        {newBadgeName || 'Badge Name'}
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleCreateBadge}
                    disabled={!newBadgeName.trim() || createBadgeLoading}
                    className="w-full"
                    data-testid="button-create-badge"
                  >
                    {createBadgeLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Badge
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Badge Management Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Manage Badges
                </CardTitle>
                <CardDescription>
                  Edit and delete existing badges
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {badgesLoading ? (
                    <div className="text-center py-4">Loading badges...</div>
                  ) : badgesData?.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No custom badges created yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {badgesData?.map((badge) => (
                        <div key={badge.id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex items-center gap-3">
                            <div 
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium"
                              style={{
                                backgroundColor: badge.backgroundColor,
                                color: badge.textColor
                              }}
                            >
                              {badge.imageUrl && (
                                <img src={badge.imageUrl} alt="" className="w-4 h-4 rounded" />
                              )}
                              {badge.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {badge.description}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingBadge(badge);
                                setEditBadgeDialogOpen(true);
                              }}
                              data-testid={`button-edit-badge-${badge.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {!badge.isSystemBadge && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteBadge(badge.id)}
                                data-testid={`button-delete-badge-${badge.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Badge Management
              </CardTitle>
              <CardDescription>
                Assign and manage user badges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Assign Badge Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Assign Badge</h3>
                  
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1 relative">
                        <Input
                          placeholder="Search users by username (type at least 2 characters)..."
                          value={badgeUserSearch}
                          onChange={(e) => setBadgeUserSearch(e.target.value)}
                        />
                        {/* Search Results Dropdown */}
                        {badgeUserSearch.length >= 2 && badgeUsersData?.users?.length > 0 && (
                          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {badgeUsersData.users.map((user: any) => (
                              <div
                                key={user.id}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                onClick={() => {
                                  setSelectedBadgeUser(user);
                                  setBadgeUserSearch(user.username);
                                }}
                              >
                                <div className="font-medium">{user.displayName}</div>
                                <div className="text-sm text-gray-500">@{user.username}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {badgeUserSearch.length >= 2 && badgeUsersLoading && (
                          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-2">
                            <div className="text-sm text-gray-500">Searching...</div>
                          </div>
                        )}
                        {badgeUserSearch.length >= 2 && !badgeUsersLoading && badgeUsersData?.users?.length === 0 && (
                          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-2">
                            <div className="text-sm text-gray-500">No users found</div>
                          </div>
                        )}
                      </div>
                      <Select value={selectedBadgeType} onValueChange={setSelectedBadgeType}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select badge type" />
                        </SelectTrigger>
                        <SelectContent>
                          {badgesLoading ? (
                            <div className="px-2 py-1 text-sm text-gray-500">Loading badges...</div>
                          ) : badgesData && badgesData.length > 0 ? (
                            badgesData.map((badge: BadgeType) => (
                              <SelectItem key={badge.id} value={badge.name}>
                                <div className="flex items-center gap-2">
                                  {getBadgeIcon(badge.name)}
                                  <span>{badge.name}</span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1 text-sm text-gray-500">No badges available</div>
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => {
                          if (selectedBadgeUser && selectedBadgeType) {
                            handleAssignBadge(selectedBadgeUser.id, selectedBadgeType);
                          } else {
                            toast({
                              title: "Missing Information",
                              description: "Please select both a user and badge type.",
                              variant: "gamefolioError",
                            });
                          }
                        }}
                        disabled={!selectedBadgeType || !selectedBadgeUser}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Assign Badge
                      </Button>
                    </div>
                    
                    {/* Selected User Display */}
                    {selectedBadgeUser && (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <User className="h-8 w-8 text-blue-600" />
                        <div className="flex-1">
                          <div className="font-medium">{selectedBadgeUser.displayName}</div>
                          <div className="text-sm text-gray-600">@{selectedBadgeUser.username}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBadgeUser(null);
                            setBadgeUserSearch("");
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Users List with Badges */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Users & Badges</h3>
                    <Button onClick={handleCleanupBadges} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Cleanup Expired
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Badges</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usersLoading ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4">
                              Loading...
                            </TableCell>
                          </TableRow>
                        ) : (
                          usersData?.users?.map((user: any) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{user.displayName}</div>
                                  <div className="text-sm text-muted-foreground">@{user.username}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                                  {user.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1 flex-wrap">
                                  {/* Display actual user badges */}
                                  {user.badges?.map((badge) => (
                                    <Badge key={badge.id} className={`${getBadgeColor(badge.badgeType)} text-white`}>
                                      {getBadgeIcon(badge.badgeType)}
                                      <span className="ml-1 capitalize">{badge.badgeType}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="ml-2 h-4 w-4 p-0 text-white hover:bg-red-500"
                                        onClick={() => handleRemoveBadge(user.id, badge.badgeType)}
                                        data-testid={`button-remove-badge-${badge.badgeType}-${user.id}`}
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                    </Badge>
                                  ))}
                                  {user.badges?.length === 0 && (
                                    <span className="text-sm text-muted-foreground">No badges</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedBadgeUser(user);
                                      setBadgeDialogOpen(true);
                                    }}
                                  >
                                    <Award className="h-4 w-4 mr-1" />
                                    Manage
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Badge Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Newcomer Badges</CardTitle>
                      <Star className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {getBadgeCount('newcomer')}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Automatically assigned
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Founder Badges</CardTitle>
                      <Crown className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {getBadgeCount('founder')}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Manually assigned
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Admin Badges</CardTitle>
                      <Shield className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {getBadgeCount('admin')}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        System assigned
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Level Management Tab */}
        <TabsContent value="levels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Level & XP Management
              </CardTitle>
              <CardDescription>
                Manage user levels and experience points
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Recalculate All Levels */}
              <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Recalculate All User Levels</h4>
                    <p className="text-sm text-muted-foreground">
                      This will update all user levels based on their current XP totals. 
                      Use this to ensure everyone is at the correct level.
                    </p>
                  </div>
                  <Button
                    onClick={async () => {
                      const confirmed = window.confirm(
                        "This will recalculate levels for all users based on their current XP. Continue?"
                      );
                      if (!confirmed) return;

                      try {
                        const response = await apiRequest("/api/admin/recalculate-levels", {
                          method: "POST",
                        }) as { updatedCount: number; totalUsers: number };

                        toast({
                          title: "Levels recalculated",
                          description: `Updated ${response.updatedCount} of ${response.totalUsers} users`,
                          variant: "gamefolioSuccess",
                        });

                        // Refresh users data
                        queryClient.invalidateQueries({ queryKey: ["/api/admin/users"], exact: false });
                      } catch (error: any) {
                        toast({
                          title: "Error",
                          description: error.message || "Failed to recalculate levels",
                          variant: "gamefolioError",
                        });
                      }
                    }}
                    data-testid="button-recalculate-levels"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recalculate All Levels
                  </Button>
                </div>
              </div>

              {/* Regenerate Reel Thumbnails */}
              <div className="border rounded-lg p-4 bg-purple-50 dark:bg-purple-950">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Regenerate Reel Thumbnails</h4>
                    <p className="text-sm text-muted-foreground">
                      Regenerate all reel thumbnails with correct 9:16 aspect ratio. 
                      This will fix thumbnails created before the aspect ratio fix.
                    </p>
                  </div>
                  <Button
                    onClick={async () => {
                      const confirmed = window.confirm(
                        "This will regenerate thumbnails for all reels with the correct 9:16 aspect ratio. This may take a while. Continue?"
                      );
                      if (!confirmed) return;

                      try {
                        toast({
                          title: "Processing...",
                          description: "Regenerating reel thumbnails. This may take a few minutes.",
                        });

                        const response = await apiRequest("/api/admin/regenerate-reel-thumbnails", {
                          method: "POST",
                        }) as { success: boolean; message: string };

                        toast({
                          title: "Success",
                          description: response.message || "Reel thumbnails regenerated successfully",
                          variant: "gamefolioSuccess",
                        });
                      } catch (error: any) {
                        toast({
                          title: "Error",
                          description: error.message || "Failed to regenerate reel thumbnails",
                          variant: "gamefolioError",
                        });
                      }
                    }}
                    data-testid="button-regenerate-reel-thumbnails"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Regenerate Reel Thumbnails
                  </Button>
                </div>
              </div>

              {/* User Search Section */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="levelUserSearch" className="text-sm font-medium">
                    Search User
                  </label>
                  <Input
                    id="levelUserSearch"
                    placeholder="Search by username..."
                    value={levelUserSearch}
                    onChange={(e) => setLevelUserSearch(e.target.value)}
                    data-testid="input-level-user-search"
                  />
                </div>

                {/* User Search Results */}
                {levelUserSearch.length >= 2 && (
                  <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                    <h4 className="font-medium mb-2">Search Results</h4>
                    {badgeUsersData?.users.filter(u => 
                      u.username.toLowerCase().includes(levelUserSearch.toLowerCase())
                    ).map(user => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                        onClick={() => {
                          setSelectedLevelUser(user);
                          setNewLevel(user.level?.toString() || "1");
                          setNewXP(user.totalXP?.toString() || "0");
                        }}
                      >
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-sm text-muted-foreground">
                            Level {user.level || 1} • {user.totalXP || 0} XP
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          Select
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected User Edit Form */}
              {selectedLevelUser && (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-lg">{selectedLevelUser.username}</h4>
                      <p className="text-sm text-muted-foreground">
                        Current: Level {selectedLevelUser.level || 1} • {selectedLevelUser.totalXP || 0} XP
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedLevelUser(null);
                        setNewLevel("");
                        setNewXP("");
                      }}
                    >
                      Clear
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="newLevel" className="text-sm font-medium">
                        New Level
                      </label>
                      <Input
                        id="newLevel"
                        type="number"
                        min="1"
                        placeholder="Enter level"
                        value={newLevel}
                        onChange={(e) => setNewLevel(e.target.value)}
                        data-testid="input-new-level"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="newXP" className="text-sm font-medium">
                        Total XP
                      </label>
                      <Input
                        id="newXP"
                        type="number"
                        min="0"
                        placeholder="Enter XP"
                        value={newXP}
                        onChange={(e) => setNewXP(e.target.value)}
                        data-testid="input-new-xp"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        try {
                          await apiRequest("PATCH", `/api/admin/users/${selectedLevelUser.id}/level`, {
                            level: parseInt(newLevel),
                            totalXP: parseInt(newXP),
                          });
                          toast({
                            title: "Success",
                            description: `Updated ${selectedLevelUser.username}'s level to ${newLevel} with ${newXP} XP`,
                          });
                          queryClient.invalidateQueries({ queryKey: ["/api/admin/users"], exact: false });
                          setSelectedLevelUser(null);
                          setNewLevel("");
                          setNewXP("");
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to update user level",
                            variant: "gamefolioError",
                          });
                        }
                      }}
                      disabled={!newLevel || !newXP}
                      data-testid="button-update-level"
                    >
                      Update Level & XP
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-xs text-muted-foreground">
                      <strong>Note:</strong> XP thresholds - Level 1: 0 XP, Level 2: 100 XP, Level 3: 500 XP, Level 4: 1000 XP, etc.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Streak Management Tab */}
        <TabsContent value="streaks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5" />
                Streak Management
              </CardTitle>
              <CardDescription>
                View and manage user login streaks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User Search Section */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="streakUserSearch" className="text-sm font-medium">
                    Search User
                  </label>
                  <Input
                    id="streakUserSearch"
                    placeholder="Search by username..."
                    value={streakUserSearch}
                    onChange={(e) => setStreakUserSearch(e.target.value)}
                    data-testid="input-streak-user-search"
                  />
                </div>

                {/* User Search Results */}
                {streakUserSearch.length >= 2 && (
                  <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                    <h4 className="font-medium mb-2">Search Results</h4>
                    {streakUsersData?.users.filter(u => 
                      u.username.toLowerCase().includes(streakUserSearch.toLowerCase())
                    ).map(user => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                        onClick={() => {
                          setSelectedStreakUser(user);
                          setNewCurrentStreak(user.currentStreak?.toString() || "0");
                          setNewLongestStreak(user.longestStreak?.toString() || "0");
                        }}
                        data-testid={`user-streak-result-${user.id}`}
                      >
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-sm text-muted-foreground">
                            Current: {user.currentStreak || 0} days • Longest: {user.longestStreak || 0} days
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          Select
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected User Edit Form */}
              {selectedStreakUser && (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-lg">{selectedStreakUser.username}</h4>
                      <p className="text-sm text-muted-foreground">
                        Current Streak: {selectedStreakUser.currentStreak || 0} days • Longest Streak: {selectedStreakUser.longestStreak || 0} days
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedStreakUser(null);
                        setNewCurrentStreak("");
                        setNewLongestStreak("");
                      }}
                    >
                      Clear
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="newCurrentStreak" className="text-sm font-medium">
                        Current Streak (days)
                      </label>
                      <Input
                        id="newCurrentStreak"
                        type="number"
                        min="0"
                        placeholder="Enter current streak"
                        value={newCurrentStreak}
                        onChange={(e) => setNewCurrentStreak(e.target.value)}
                        data-testid="input-new-current-streak"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="newLongestStreak" className="text-sm font-medium">
                        Longest Streak (days)
                      </label>
                      <Input
                        id="newLongestStreak"
                        type="number"
                        min="0"
                        placeholder="Enter longest streak"
                        value={newLongestStreak}
                        onChange={(e) => setNewLongestStreak(e.target.value)}
                        data-testid="input-new-longest-streak"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        try {
                          await apiRequest("PATCH", `/api/admin/users/${selectedStreakUser.id}/streak`, {
                            currentStreak: parseInt(newCurrentStreak),
                            longestStreak: parseInt(newLongestStreak),
                          });
                          toast({
                            title: "Success",
                            description: `Updated ${selectedStreakUser.username}'s streak to ${newCurrentStreak} days (longest: ${newLongestStreak})`,
                            variant: "gamefolioSuccess",
                          });
                          queryClient.invalidateQueries({ queryKey: ["/api/admin/users"], exact: false });
                          setSelectedStreakUser(null);
                          setNewCurrentStreak("");
                          setNewLongestStreak("");
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to update user streak",
                            variant: "gamefolioError",
                          });
                        }
                      }}
                      disabled={!newCurrentStreak || !newLongestStreak}
                      data-testid="button-update-streak"
                    >
                      <Flame className="h-4 w-4 mr-2" />
                      Update Streak
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-xs text-muted-foreground">
                      <strong>Note:</strong> Streak milestones - 5, 10, 15, 20, etc. (every 5 days) award scaled bonus XP. Users earn 10 XP daily for consecutive logins.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Points Tab */}
        <TabsContent value="points" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Points System Overview
              </CardTitle>
              <CardDescription>
                View how points are awarded and manage user points
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Upload className="h-4 w-4 text-blue-500" />
                      <h3 className="font-semibold">Uploads</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-500">5 points</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Per clip, reel, or screenshot uploaded
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <h3 className="font-semibold">Likes</h3>
                    </div>
                    <p className="text-2xl font-bold text-red-500">2 points</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Per like given to content
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageCircle className="h-4 w-4 text-green-500" />
                      <h3 className="font-semibold">Comments</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-500">5 points</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Per comment posted
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-orange-500">🔥</span>
                      <h3 className="font-semibold">Fire Reactions</h3>
                    </div>
                    <p className="text-2xl font-bold text-orange-500">3 points</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Per fire reaction given
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-purple-500" />
                      <h3 className="font-semibold">Views</h3>
                    </div>
                    <p className="text-2xl font-bold text-purple-500">1 point</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Per view on uploaded content (also awards 1 XP)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Historic Data Management
              </CardTitle>
              <CardDescription>
                Clean up and rebuild historic leaderboard data with correct timestamps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                  <p className="text-sm text-yellow-900 dark:text-yellow-100 mb-3">
                    <strong>Important:</strong> This will clean up incorrectly dated historic migration points and rebuild leaderboards using actual upload dates.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={async () => {
                        if (!confirm("This will delete historic migration points and rebuild leaderboards. Continue?")) return;
                        try {
                          const response = await apiRequest('/api/admin/clear-historic-points', {
                            method: 'POST'
                          });
                          toast({
                            title: "Success",
                            description: "Historic data cleaned and leaderboards rebuilt successfully",
                          });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to clean historic data",
                            variant: "gamefolioError",
                          });
                        }
                      }}
                      variant="outline"
                      data-testid="button-clean-historic-data"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clean & Rebuild
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!confirm("This will re-run the migration to backfill points with correct timestamps. Continue?")) return;
                        try {
                          const response = await apiRequest('/api/admin/recalculate-upload-points', {
                            method: 'POST'
                          });
                          toast({
                            title: "Success",
                            description: `Recalculated points for all historic uploads`,
                          });
                          queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"], exact: false });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to recalculate upload points",
                            variant: "gamefolioError",
                          });
                        }
                      }}
                      variant="default"
                      data-testid="button-recalculate-points"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Re-run Migration
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!confirm("This will recalculate all users' points and levels from their points history. Continue?")) return;
                        try {
                          const response = await apiRequest('/api/admin/recalculate-points-and-levels', {
                            method: 'POST'
                          });
                          const data = response as any;
                          toast({
                            title: "Success",
                            description: `Recalculated points and levels for ${data.usersUpdated || 'all'} users`,
                          });
                          queryClient.invalidateQueries({ queryKey: ["/api/users"], exact: false });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to recalculate points and levels",
                            variant: "gamefolioError",
                          });
                        }
                      }}
                      variant="secondary"
                      data-testid="button-recalculate-points"
                    >
                      <Trophy className="h-4 w-4 mr-2" />
                      Sync Points & Levels
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Point Management</CardTitle>
              <CardDescription>
                View point history and adjust points for any user
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter User ID"
                    type="number"
                    value={selectedPointsUserId || ""}
                    onChange={(e) => setSelectedPointsUserId(e.target.value ? parseInt(e.target.value) : null)}
                    data-testid="input-points-user-id"
                  />
                  <Button
                    onClick={async () => {
                      if (!selectedPointsUserId) return;
                      setIsLoadingPointsHistory(true);
                      try {
                        const response = await fetch(`/api/admin/users/${selectedPointsUserId}/points-history?limit=50`);
                        if (response.ok) {
                          const data = await response.json();
                          setPointsHistory(data);
                        }
                      } catch (error) {
                        console.error("Error fetching points history:", error);
                      } finally {
                        setIsLoadingPointsHistory(false);
                      }
                    }}
                    disabled={!selectedPointsUserId}
                    data-testid="button-load-points"
                  >
                    Load Points History
                  </Button>
                </div>

                {isLoadingPointsHistory && (
                  <div className="text-center py-4">Loading points history...</div>
                )}

                {pointsHistory && pointsHistory.length > 0 && (
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <h4 className="font-semibold mb-2">Point Adjustment</h4>
                      <div className="grid gap-2">
                        <Input
                          type="number"
                          placeholder="Points to add/subtract (use negative for subtract)"
                          value={pointsAdjustment || ""}
                          onChange={(e) => setPointsAdjustment(e.target.value ? parseInt(e.target.value) : null)}
                          data-testid="input-points-adjustment"
                        />
                        <Input
                          placeholder="Reason for adjustment"
                          value={pointsAdjustmentReason}
                          onChange={(e) => setPointsAdjustmentReason(e.target.value)}
                          data-testid="input-points-reason"
                        />
                        <Button
                          onClick={async () => {
                            if (!selectedPointsUserId || !pointsAdjustment || !pointsAdjustmentReason) {
                              toast({
                                title: "Missing information",
                                description: "Please enter points amount and reason",
                                variant: "gamefolioError",
                              });
                              return;
                            }

                            try {
                              await apiRequest(`/api/admin/users/${selectedPointsUserId}/adjust-points`, {
                                method: 'POST',
                                body: {
                                  points: pointsAdjustment,
                                  reason: pointsAdjustmentReason
                                }
                              });

                              toast({
                                title: "Points adjusted",
                                description: `Successfully ${pointsAdjustment > 0 ? 'added' : 'removed'} ${Math.abs(pointsAdjustment)} points`,
                                variant: "gamefolioSuccess",
                              });

                              // Reload points history
                              const response = await fetch(`/api/admin/users/${selectedPointsUserId}/points-history?limit=50`);
                              if (response.ok) {
                                const data = await response.json();
                                setPointsHistory(data);
                              }

                              setPointsAdjustment(null);
                              setPointsAdjustmentReason("");
                            } catch (error: any) {
                              toast({
                                title: "Error",
                                description: error.message || "Failed to adjust points",
                                variant: "gamefolioError",
                              });
                            }
                          }}
                          disabled={!pointsAdjustment || !pointsAdjustmentReason}
                          data-testid="button-adjust-points"
                        >
                          Adjust Points
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-lg">
                      <div className="p-4 border-b bg-muted/50">
                        <h4 className="font-semibold">Points History (Last 50 entries)</h4>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full">
                          <thead className="sticky top-0 bg-muted">
                            <tr className="border-b">
                              <th className="text-left p-2">Date</th>
                              <th className="text-left p-2">Action</th>
                              <th className="text-left p-2">Points</th>
                              <th className="text-left p-2">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pointsHistory.map((entry: any, index: number) => (
                              <tr key={index} className="border-b hover:bg-muted/50">
                                <td className="p-2 text-sm">
                                  {new Date(entry.createdAt).toLocaleDateString()} {new Date(entry.createdAt).toLocaleTimeString()}
                                </td>
                                <td className="p-2 text-sm">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    entry.action === 'upload' ? 'bg-blue-100 text-blue-700' :
                                    entry.action === 'like' ? 'bg-red-100 text-red-700' :
                                    entry.action === 'comment' ? 'bg-green-100 text-green-700' :
                                    entry.action === 'fire' ? 'bg-orange-100 text-orange-700' :
                                    entry.action === 'view' ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {entry.action}
                                  </span>
                                </td>
                                <td className="p-2 text-sm font-semibold">
                                  <span className={entry.points >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {entry.points >= 0 ? '+' : ''}{entry.points}
                                  </span>
                                </td>
                                <td className="p-2 text-sm text-muted-foreground">
                                  {entry.description}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {pointsHistory && pointsHistory.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No points history found for this user.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hero Slides Management Tab */}
        <TabsContent value="hero-text" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Type className="h-5 w-5" />
                    Hero Slides Management
                  </CardTitle>
                  <CardDescription>
                    Manage the rotating hero banner slides on the homepage. Each slide has its own image, text, and call-to-action button.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {heroSlidesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading slides...</div>
              ) : (
                <Tabs value={activeSlideTab} onValueChange={(tab) => {
                    if (tab.startsWith('slide-') && heroSlides) {
                      const slideId = parseInt(tab.replace('slide-', ''));
                      const slide = heroSlides.find((s: any) => s.id === slideId);
                      if (slide) {
                        openEditSlide(slide);
                        return;
                      }
                    }
                    if (tab === 'new-slide') {
                      resetSlideForm();
                    }
                    setActiveSlideTab(tab);
                  }}>
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto">
                    <TabsList className="flex-shrink-0">
                      <TabsTrigger value="overview" className="text-xs px-3">Overview</TabsTrigger>
                      {heroSlides && [...heroSlides].sort((a, b) => a.displayOrder - b.displayOrder).map((slide, idx) => (
                        <TabsTrigger key={slide.id} value={`slide-${slide.id}`} className="text-xs px-3">
                          Slide {idx + 1}
                        </TabsTrigger>
                      ))}
                      <TabsTrigger value="new-slide" className="text-xs px-3">
                        <Plus className="h-3 w-3 mr-1" /> Add Slide
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="overview" className="space-y-4">
                    <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                      <h4 className="text-sm font-medium flex items-center gap-2">Slide Rotation Speed</h4>
                      <p className="text-xs text-muted-foreground">How many seconds each slide is shown before moving to the next one.</p>
                      <div className="flex items-center gap-3">
                        <Select value={String(slideIntervalSeconds)} onValueChange={(val) => setSlideIntervalSeconds(parseInt(val))}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 seconds</SelectItem>
                            <SelectItem value="4">4 seconds</SelectItem>
                            <SelectItem value="5">5 seconds</SelectItem>
                            <SelectItem value="6">6 seconds (default)</SelectItem>
                            <SelectItem value="8">8 seconds</SelectItem>
                            <SelectItem value="10">10 seconds</SelectItem>
                            <SelectItem value="12">12 seconds</SelectItem>
                            <SelectItem value="15">15 seconds</SelectItem>
                            <SelectItem value="20">20 seconds</SelectItem>
                            <SelectItem value="30">30 seconds</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={handleSaveSlideInterval} disabled={slideIntervalSeconds === (heroSlideSettings?.intervalSeconds || 6)}>
                          Save
                        </Button>
                        {slideIntervalSeconds !== (heroSlideSettings?.intervalSeconds || 6) && (
                          <span className="text-xs text-orange-500">Unsaved change</span>
                        )}
                      </div>
                    </div>
                    {!heroSlides?.length ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Type className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No hero slides yet</p>
                        <p className="text-sm mt-1">The homepage will show the default banner until you add slides.</p>
                        <Button className="mt-4" onClick={handleAddNewSlide}>
                          <Plus className="h-4 w-4 mr-2" /> Create Your First Slide
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {[...heroSlides].sort((a, b) => a.displayOrder - b.displayOrder).map((slide, idx) => (
                          <div key={slide.id} className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${slide.isActive ? 'border-border' : 'border-border/50 opacity-60'}`} onClick={() => openEditSlide(slide)}>
                            <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleMoveSlide(slide, 'up')} disabled={idx === 0}>
                                <ChevronDown className="h-4 w-4 rotate-180" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleMoveSlide(slide, 'down')} disabled={idx === heroSlides.length - 1}>
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="w-36 h-16 rounded overflow-hidden bg-muted flex-shrink-0" style={{ aspectRatio: '16/7' }}>
                              {slide.imageUrl ? (
                                <img src={slide.signedImageUrl || slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground w-5">#{idx + 1}</span>
                                <h4 className="font-medium truncate">{slide.title}</h4>
                                {!slide.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                                <Badge variant="outline" className={`text-xs ${
                                  slide.visibility === 'everyone' ? 'border-green-500 text-green-600' :
                                  slide.visibility === 'logged_in' ? 'border-blue-500 text-blue-600' :
                                  slide.visibility === 'logged_out' ? 'border-orange-500 text-orange-600' :
                                  slide.visibility === 'new_users' ? 'border-cyan-500 text-cyan-600' :
                                  slide.visibility === 'pro_only' ? 'border-purple-500 text-purple-600' :
                                  slide.visibility === 'has_lootbox' ? 'border-yellow-500 text-yellow-600' : ''
                                }`}>
                                  {slide.visibility === 'everyone' ? 'Everyone' :
                                   slide.visibility === 'logged_in' ? 'Logged In' :
                                   slide.visibility === 'logged_out' ? 'Logged Out' :
                                   slide.visibility === 'new_users' ? 'New Users' :
                                   slide.visibility === 'pro_only' ? 'Pro Only' :
                                   slide.visibility === 'has_lootbox' ? 'Has Lootbox' : slide.visibility}
                                </Badge>
                              </div>
                              {slide.subtitle && <p className="text-sm text-muted-foreground truncate">{slide.subtitle}</p>}
                              {slide.buttonText && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Button: "{slide.buttonText}" &rarr; {slide.buttonLink || 'No link'}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                              <Switch checked={slide.isActive} onCheckedChange={() => handleToggleSlide(slide)} />
                              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteSlide(slide.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button variant="outline" className="w-full mt-2" onClick={handleAddNewSlide}>
                          <Plus className="h-4 w-4 mr-2" /> Add Another Slide
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  {heroSlides && heroSlides.map((slide) => (
                    <TabsContent key={slide.id} value={`slide-${slide.id}`} className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold">Edit: {slide.title}</h3>
                        <div className="flex items-center gap-2">
                          <Switch checked={slideIsActive} onCheckedChange={setSlideIsActive} />
                          <label className="text-sm">Active</label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Slide Image *</label>
                        {slideImageUrl ? (
                          <div className="relative w-full rounded-lg overflow-hidden bg-muted" style={{ aspectRatio: '16/7' }}>
                            <img src={slideDisplayImageUrl || slideImageUrl} alt="Slide preview" className="w-full h-full object-cover" />
                            <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => { setSlideImageUrl(""); setSlideDisplayImageUrl(""); }}>
                              <Trash2 className="h-3 w-3 mr-1" /> Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed rounded-lg p-6 text-center">
                            <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                            <p className="text-sm font-medium text-foreground mb-1">Choose an image for this slide</p>
                            <p className="text-xs text-muted-foreground mb-4">Recommended: 1920×820px or larger, landscape orientation. Max 10MB. JPG or PNG.</p>
                            <div className="flex gap-2 justify-center">
                              <label className="cursor-pointer">
                                <input type="file" accept="image/*" className="hidden" onChange={handleSlideImageUpload} disabled={slideUploading} />
                                <Button variant="outline" size="sm" disabled={slideUploading} asChild>
                                  <span>{slideUploading ? "Uploading..." : "Upload Image"}</span>
                                </Button>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      {slideBucketBrowser && (
                        <div className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">Select from Supabase Storage</h4>
                            <Button variant="ghost" size="sm" onClick={() => { setSlideBucketBrowser(false); setSlideBucketSearch(""); }}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Select value={slideBucketName} onValueChange={(val) => { setSlideBucketName(val); setSlideBucketSearch(""); fetchSlideBucketImages(val); }}>
                              <SelectTrigger className="w-[250px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(assetBucketList || []).map((b: any) => (
                                  <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" onClick={() => fetchSlideBucketImages(slideBucketName)} disabled={slideBucketLoading}>
                              <RefreshCw className={`h-4 w-4 ${slideBucketLoading ? 'animate-spin' : ''}`} />
                            </Button>
                          </div>
                          <Input
                            placeholder="Search images by name..."
                            value={slideBucketSearch}
                            onChange={(e) => setSlideBucketSearch(e.target.value)}
                            className="w-full"
                          />
                          {slideBucketLoading ? (
                            <div className="text-center py-4 text-sm text-muted-foreground">Loading images...</div>
                          ) : slideBucketImages.filter((img) => !slideBucketSearch || img.name.toLowerCase().includes(slideBucketSearch.toLowerCase())).length === 0 ? (
                            <div className="text-center py-4 text-sm text-muted-foreground">{slideBucketSearch ? "No images match your search" : "No images found in this bucket"}</div>
                          ) : (
                            <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto">
                              {slideBucketImages.filter((img) => !slideBucketSearch || img.name.toLowerCase().includes(slideBucketSearch.toLowerCase())).map((img) => (
                                <div
                                  key={img.id || img.name}
                                  className="rounded border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all group relative"
                                  style={{ aspectRatio: '16/7' }}
                                  onClick={() => { setSlideImageUrl(img.publicUrl); setSlideDisplayImageUrl(img.publicUrl); setSlideBucketBrowser(false); setSlideBucketSearch(""); }}
                                >
                                  <img src={img.publicUrl} alt={img.name} className="w-full h-full object-cover" />
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">{img.name}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Title *</label>
                          <Input placeholder="e.g., Build Your Gamefolio" value={slideTitle} onChange={(e) => setSlideTitle(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Subtitle</label>
                          <Input placeholder="e.g., With Your Best Gaming Clips" value={slideSubtitle} onChange={(e) => setSlideSubtitle(e.target.value)} />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Button Text</label>
                          <Input placeholder="e.g., Get Started" value={slideButtonText} onChange={(e) => setSlideButtonText(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Button Link</label>
                          <Input placeholder="e.g., /upload" value={slideButtonLink} onChange={(e) => setSlideButtonLink(e.target.value)} />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Shown To</label>
                          <Select value={slideVisibility} onValueChange={setSlideVisibility}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="everyone">Everyone</SelectItem>
                              <SelectItem value="logged_in">Logged In Users</SelectItem>
                              <SelectItem value="logged_out">Non-Logged In Users</SelectItem>
                              <SelectItem value="new_users">New Users Only</SelectItem>
                              <SelectItem value="pro_only">Pro Users Only</SelectItem>
                              <SelectItem value="has_lootbox">Users with Unopened Lootbox</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            {slideVisibility === 'new_users' && 'Shown to users who signed up within the last 7 days.'}
                            {slideVisibility === 'logged_out' && 'Shown to visitors who are not signed in.'}
                            {slideVisibility === 'logged_in' && 'Shown to all signed-in users.'}
                            {slideVisibility === 'everyone' && 'Shown to all visitors and users.'}
                            {slideVisibility === 'pro_only' && 'Shown to Pro subscribers only.'}
                            {slideVisibility === 'has_lootbox' && 'Shown to users who have an unopened daily lootbox.'}
                          </p>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4 bg-muted/50">
                        <h4 className="font-medium mb-2 text-sm flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Live Preview
                        </h4>
                        <p className="text-xs text-muted-foreground mb-3">This preview matches how the slide will appear on the homepage.</p>
                        <div className="relative w-full rounded-lg overflow-hidden bg-black border-b-2 border-primary" style={{ aspectRatio: '16/7', minHeight: '280px' }}>
                          {slideImageUrl ? (
                            <img src={slideDisplayImageUrl || slideImageUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/70">
                            <div className="flex flex-col items-start justify-center h-full max-w-[70%] p-6 md:p-8">
                              <h3 className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight drop-shadow-md">
                                {slideTitle || "Slide Title"}
                              </h3>
                              {(slideSubtitle || !slideTitle) && (
                                <h4 className="text-lg md:text-xl font-semibold text-primary mb-4 leading-tight drop-shadow-lg">
                                  {slideSubtitle || "Subtitle text"}
                                </h4>
                              )}
                              {(slideButtonText || !slideTitle) && (
                                <span className="mt-2 inline-block bg-primary text-primary-foreground text-sm px-4 py-2 rounded font-semibold">
                                  {slideButtonText || "Button Text"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <Button variant="destructive" size="sm" onClick={() => { handleDeleteSlide(slide.id); setActiveSlideTab("overview"); }}>
                          <Trash2 className="h-4 w-4 mr-1" /> Delete Slide
                        </Button>
                        <Button onClick={handleSaveSlide} disabled={!slideTitle.trim() || !slideImageUrl.trim()}>
                          Save Changes
                        </Button>
                      </div>
                    </TabsContent>
                  ))}

                  <TabsContent value="new-slide" className="space-y-4">
                    <h3 className="text-lg font-semibold">Add New Slide</h3>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Slide Image *</label>
                      {slideImageUrl ? (
                        <div className="relative w-full rounded-lg overflow-hidden bg-muted" style={{ aspectRatio: '16/7' }}>
                          <img src={slideDisplayImageUrl || slideImageUrl} alt="Slide preview" className="w-full h-full object-cover" />
                          <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={() => { setSlideImageUrl(""); setSlideDisplayImageUrl(""); }}>
                            <Trash2 className="h-3 w-3 mr-1" /> Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed rounded-lg p-6 text-center">
                          <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-sm font-medium text-foreground mb-1">Choose an image for this slide</p>
                          <p className="text-xs text-muted-foreground mb-4">Recommended: 1920×820px or larger, landscape orientation. Max 10MB. JPG or PNG.</p>
                          <div className="flex gap-2 justify-center">
                            <label className="cursor-pointer">
                              <input type="file" accept="image/*" className="hidden" onChange={handleSlideImageUpload} disabled={slideUploading} />
                              <Button variant="outline" size="sm" disabled={slideUploading} asChild>
                                <span>{slideUploading ? "Uploading..." : "Upload Image"}</span>
                              </Button>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {slideBucketBrowser && (
                      <div className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">Select from Supabase Storage</h4>
                          <Button variant="ghost" size="sm" onClick={() => { setSlideBucketBrowser(false); setSlideBucketSearch(""); }}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Select value={slideBucketName} onValueChange={(val) => { setSlideBucketName(val); setSlideBucketSearch(""); fetchSlideBucketImages(val); }}>
                            <SelectTrigger className="w-[250px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(assetBucketList || []).map((b: any) => (
                                <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="sm" onClick={() => fetchSlideBucketImages(slideBucketName)} disabled={slideBucketLoading}>
                            <RefreshCw className={`h-4 w-4 ${slideBucketLoading ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                        <Input
                          placeholder="Search images by name..."
                          value={slideBucketSearch}
                          onChange={(e) => setSlideBucketSearch(e.target.value)}
                          className="w-full"
                        />
                        {slideBucketLoading ? (
                          <div className="text-center py-4 text-sm text-muted-foreground">Loading images...</div>
                        ) : slideBucketImages.filter((img) => !slideBucketSearch || img.name.toLowerCase().includes(slideBucketSearch.toLowerCase())).length === 0 ? (
                          <div className="text-center py-4 text-sm text-muted-foreground">{slideBucketSearch ? "No images match your search" : "No images found in this bucket"}</div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto">
                            {slideBucketImages.filter((img) => !slideBucketSearch || img.name.toLowerCase().includes(slideBucketSearch.toLowerCase())).map((img) => (
                              <div
                                key={img.id || img.name}
                                className="rounded border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all group relative"
                                style={{ aspectRatio: '16/7' }}
                                onClick={() => { setSlideImageUrl(img.publicUrl); setSlideDisplayImageUrl(img.publicUrl); setSlideBucketBrowser(false); setSlideBucketSearch(""); }}
                              >
                                <img src={img.publicUrl} alt={img.name} className="w-full h-full object-cover" />
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">{img.name}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Title *</label>
                        <Input placeholder="e.g., Build Your Gamefolio" value={slideTitle} onChange={(e) => setSlideTitle(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Subtitle</label>
                        <Input placeholder="e.g., With Your Best Gaming Clips" value={slideSubtitle} onChange={(e) => setSlideSubtitle(e.target.value)} />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Button Text</label>
                        <Input placeholder="e.g., Get Started" value={slideButtonText} onChange={(e) => setSlideButtonText(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Button Link</label>
                        <Input placeholder="e.g., /upload" value={slideButtonLink} onChange={(e) => setSlideButtonLink(e.target.value)} />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Shown To</label>
                        <Select value={slideVisibility} onValueChange={setSlideVisibility}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="everyone">Everyone</SelectItem>
                            <SelectItem value="logged_in">Logged In Users</SelectItem>
                            <SelectItem value="logged_out">Non-Logged In Users</SelectItem>
                            <SelectItem value="new_users">New Users Only</SelectItem>
                            <SelectItem value="pro_only">Pro Users Only</SelectItem>
                            <SelectItem value="has_lootbox">Users with Unopened Lootbox</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {slideVisibility === 'new_users' && 'Shown to users who signed up within the last 7 days.'}
                          {slideVisibility === 'logged_out' && 'Shown to visitors who are not signed in.'}
                          {slideVisibility === 'logged_in' && 'Shown to all signed-in users.'}
                          {slideVisibility === 'everyone' && 'Shown to all visitors and users.'}
                          {slideVisibility === 'pro_only' && 'Shown to Pro subscribers only.'}
                          {slideVisibility === 'has_lootbox' && 'Shown to users who have an unopened daily lootbox.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <Switch checked={slideIsActive} onCheckedChange={setSlideIsActive} />
                        <label className="text-sm">Active</label>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-muted/50">
                      <h4 className="font-medium mb-2 text-sm flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Live Preview
                      </h4>
                      <p className="text-xs text-muted-foreground mb-3">This preview matches how the slide will appear on the homepage.</p>
                      <div className="relative w-full rounded-lg overflow-hidden bg-black border-b-2 border-primary" style={{ aspectRatio: '16/7', minHeight: '280px' }}>
                        {slideImageUrl ? (
                          <img src={slideDisplayImageUrl || slideImageUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/70">
                          <div className="flex flex-col items-start justify-center h-full max-w-[70%] p-6 md:p-8">
                            <h3 className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight drop-shadow-md">
                              {slideTitle || "Slide Title"}
                            </h3>
                            {(slideSubtitle || !slideTitle) && (
                              <h4 className="text-lg md:text-xl font-semibold text-primary mb-4 leading-tight drop-shadow-lg">
                                {slideSubtitle || "Subtitle text"}
                              </h4>
                            )}
                            {(slideButtonText || !slideTitle) && (
                              <span className="mt-2 inline-block bg-primary text-primary-foreground text-sm px-4 py-2 rounded font-semibold">
                                {slideButtonText || "Button Text"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSaveSlide} disabled={!slideTitle.trim() || !slideImageUrl.trim()}>
                        <Plus className="h-4 w-4 mr-1" /> Add Slide
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Asset Rewards Tab */}
        <TabsContent value="asset-rewards" className="space-y-4">
          {/* Bucket Browser Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Asset Browser
              </CardTitle>
              <CardDescription>
                Browse assets from Supabase storage buckets and assign them as rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4 items-center">
                  <div className="space-y-2 flex-1">
                    <Label>Select Bucket</Label>
                    <Select value={selectedBucket} onValueChange={(v) => { setSelectedBucket(v); setCurrentBucketFolder(""); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a bucket" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gamefolio-name-tags">gamefolio-name-tags (Name Tags)</SelectItem>
                        <SelectItem value="gamefolio-assets">gamefolio-assets (Borders, Backgrounds)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {currentBucketFolder && (
                    <Button variant="outline" size="sm" onClick={() => setCurrentBucketFolder("")}>
                      <ArrowLeft className="h-4 w-4 mr-1" /> Back to Root
                    </Button>
                  )}
                </div>
                
                {currentBucketFolder && (
                  <div className="text-sm text-muted-foreground">
                    Current folder: <span className="font-mono bg-muted px-2 py-1 rounded">{currentBucketFolder}</span>
                  </div>
                )}

                {bucketLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading bucket contents...</div>
                ) : (
                  <div className="space-y-4">
                    {/* Folders */}
                    {bucketData?.folders && bucketData.folders.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Folders</h4>
                        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                          {bucketData.folders.map((folder) => (
                            <button
                              key={folder}
                              onClick={() => setCurrentBucketFolder(currentBucketFolder ? `${currentBucketFolder}/${folder}` : folder)}
                              className="flex flex-col items-center p-2 rounded border hover:bg-muted transition-colors"
                            >
                              <FolderOpen className="h-8 w-8 text-yellow-500" />
                              <span className="text-xs truncate w-full text-center mt-1">{folder}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Files */}
                    {bucketData?.files && bucketData.files.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Assets ({bucketData.files.length})</h4>
                        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-64 overflow-y-auto">
                          {bucketData.files.map((file) => (
                            <button
                              key={file.id}
                              onClick={() => selectBucketFileAsReward(file)}
                              className="flex flex-col items-center p-2 rounded border hover:bg-primary/10 hover:border-primary transition-colors group"
                            >
                              <img 
                                src={file.publicUrl} 
                                alt={file.name}
                                className="w-12 h-12 object-contain rounded"
                                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                              />
                              <span className="text-xs truncate w-full text-center mt-1">{file.name}</span>
                              <span className="text-xs text-primary opacity-0 group-hover:opacity-100">Select</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {bucketData?.files?.length === 0 && bucketData?.folders?.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">No files or folders in this location</div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Asset Rewards Management</CardTitle>
              <CardDescription>
                Create and manage reward items with availability settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Create new reward form */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h3 className="font-medium mb-4">Create New Reward</h3>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="reward-name">Reward Name</Label>
                      <Input
                        id="reward-name"
                        placeholder="e.g., Golden Sword"
                        value={newRewardName}
                        onChange={(e) => setNewRewardName(e.target.value)}
                        data-testid="input-reward-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reward-image">Reward Image</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="reward-image"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleRewardImageUpload(file);
                            }
                          }}
                          disabled={uploadingImage}
                          data-testid="input-reward-image"
                          className="cursor-pointer"
                        />
                        {uploadingImage && <span className="text-sm text-muted-foreground">Uploading...</span>}
                      </div>
                      {newRewardImageUrl && (
                        <div className="mt-2">
                          <img 
                            src={newRewardImageUrl} 
                            alt="Preview" 
                            className="w-16 h-16 object-cover rounded border"
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reward-rarity">Rarity (sets drop chance)</Label>
                      <Select
                        value={newRewardRarity}
                        onValueChange={(value: "common" | "rare" | "epic" | "legendary") => setNewRewardRarity(value)}
                      >
                        <SelectTrigger data-testid="select-reward-rarity">
                          <SelectValue placeholder="Select rarity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="common">
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                              Common (60%)
                            </span>
                          </SelectItem>
                          <SelectItem value="rare">
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                              Rare (25%)
                            </span>
                          </SelectItem>
                          <SelectItem value="epic">
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                              Epic (12%)
                            </span>
                          </SelectItem>
                          <SelectItem value="legendary">
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                              Legendary (3%)
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reward-asset-type">Asset Type (where it's used)</Label>
                      <Select
                        value={newRewardAssetType}
                        onValueChange={(value: AssetType) => setNewRewardAssetType(value)}
                      >
                        <SelectTrigger data-testid="select-reward-asset-type">
                          <SelectValue placeholder="Select asset type" />
                        </SelectTrigger>
                        <SelectContent>
                          {assetTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {assetTypeDisplayNames[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-4 mt-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Availability</Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={newRewardAvailableInLootbox}
                            onCheckedChange={setNewRewardAvailableInLootbox}
                            id="new-reward-lootbox"
                          />
                          <Label htmlFor="new-reward-lootbox" className="text-sm cursor-pointer">
                            <Gift className="h-4 w-4 inline mr-1" /> Available in Lootbox
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={newRewardAvailableInStore}
                            onCheckedChange={setNewRewardAvailableInStore}
                            id="new-reward-store"
                          />
                          <Label htmlFor="new-reward-store" className="text-sm cursor-pointer">
                            <ShoppingBag className="h-4 w-4 inline mr-1" /> Available in Store
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={newRewardProOnly}
                            onCheckedChange={setNewRewardProOnly}
                            id="new-reward-pro"
                          />
                          <Label htmlFor="new-reward-pro" className="text-sm cursor-pointer">
                            <Crown className="h-4 w-4 inline mr-1" /> Pro Subscribers Only
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={newRewardFreeItem}
                            onCheckedChange={setNewRewardFreeItem}
                            id="new-reward-free"
                          />
                          <Label htmlFor="new-reward-free" className="text-sm cursor-pointer">
                            <Users className="h-4 w-4 inline mr-1" /> Free Item (All Users)
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={newRewardRedeemable}
                            onCheckedChange={setNewRewardRedeemable}
                            id="new-reward-redeemable"
                          />
                          <Label htmlFor="new-reward-redeemable" className="text-sm cursor-pointer">
                            <Ticket className="h-4 w-4 inline mr-1" /> Redeemable Item
                          </Label>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Primary Category</Label>
                      <Select value={newRewardCategory} onValueChange={setNewRewardCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pro_user">
                            <span className="flex items-center gap-2">
                              <Crown className="h-4 w-4 text-purple-500" /> Pro User Exclusive
                            </span>
                          </SelectItem>
                          <SelectItem value="lootbox">
                            <span className="flex items-center gap-2">
                              <Gift className="h-4 w-4 text-yellow-500" /> Loot Box Reward
                            </span>
                          </SelectItem>
                          <SelectItem value="free_item">
                            <span className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-green-500" /> Free Item (All Users)
                            </span>
                          </SelectItem>
                          <SelectItem value="store_item">
                            <span className="flex items-center gap-2">
                              <ShoppingBag className="h-4 w-4 text-blue-500" /> Store/Buyable Item
                            </span>
                          </SelectItem>
                          <SelectItem value="redeemable">
                            <span className="flex items-center gap-2">
                              <Ticket className="h-4 w-4 text-orange-500" /> Redeemable Item
                            </span>
                          </SelectItem>
                          <SelectItem value="other">
                            <span className="flex items-center gap-2">
                              <HelpCircle className="h-4 w-4 text-gray-500" /> Other (TBD)
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newRewardAvailableInStore && (
                      <div className="space-y-2">
                        <Label htmlFor="reward-store-price">Store Price (GF Tokens)</Label>
                        <Input
                          id="reward-store-price"
                          type="number"
                          placeholder="e.g., 500"
                          value={newRewardStorePrice}
                          onChange={(e) => setNewRewardStorePrice(e.target.value)}
                          min="1"
                        />
                      </div>
                    )}
                    <div className="flex items-end col-span-2 justify-end">
                      <Button
                        onClick={async () => {
                          if (!newRewardName.trim() || !newRewardImageUrl) {
                            toast({
                              title: "Missing fields",
                              description: "Please provide a name and upload an image",
                              variant: "gamefolioError",
                            });
                            return;
                          }
                          if (newRewardAvailableInStore && !newRewardStorePrice) {
                            toast({
                              title: "Missing price",
                              description: "Please provide a store price for store items",
                              variant: "gamefolioError",
                            });
                            return;
                          }
                          setCreateRewardLoading(true);
                          try {
                            await apiRequest('POST', '/api/admin/asset-rewards', {
                              name: newRewardName.trim(),
                              imageUrl: newRewardImageUrl,
                              rarity: newRewardRarity,
                              assetType: newRewardAssetType,
                              unlockChance: rarityChanceMap[newRewardRarity],
                              availableInLootbox: newRewardAvailableInLootbox,
                              availableInStore: newRewardAvailableInStore,
                              proOnly: newRewardProOnly,
                              freeItem: newRewardFreeItem,
                              redeemable: newRewardRedeemable,
                              rewardCategory: newRewardCategory,
                              storePrice: newRewardAvailableInStore ? parseInt(newRewardStorePrice) : null,
                              sourceBucket: selectedBucket,
                              sourcePath: bucketData?.currentFolder || null,
                            });
                            toast({
                              title: "Reward created",
                              description: "New reward has been added successfully.",
                              variant: "gamefolioSuccess",
                            });
                            setNewRewardName("");
                            setNewRewardImageUrl("");
                            setNewRewardImageFile(null);
                            setNewRewardRarity("common");
                            setNewRewardAssetType("other");
                            setNewRewardAvailableInLootbox(true);
                            setNewRewardAvailableInStore(false);
                            setNewRewardProOnly(false);
                            setNewRewardFreeItem(false);
                            setNewRewardRedeemable(false);
                            setNewRewardCategory("other");
                            setNewRewardStorePrice("");
                            const fileInput = document.getElementById('reward-image') as HTMLInputElement;
                            if (fileInput) fileInput.value = '';
                            refetchRewards();
                          } catch (error: any) {
                            toast({
                              title: "Error",
                              description: error.message || "Failed to create reward",
                              variant: "gamefolioError",
                            });
                          } finally {
                            setCreateRewardLoading(false);
                          }
                        }}
                        disabled={createRewardLoading || uploadingImage || !newRewardName.trim() || !newRewardImageUrl}
                        data-testid="button-create-reward"
                        className="h-10"
                      >
                        {createRewardLoading ? "Creating..." : <><Plus className="h-4 w-4 mr-2" /> Add Reward</>}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Rewards list */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Image</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Asset Type</TableHead>
                        <TableHead>Rarity</TableHead>
                        <TableHead>Availability</TableHead>
                        <TableHead>Times Rewarded</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rewardsLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center">
                            Loading rewards...
                          </TableCell>
                        </TableRow>
                      ) : !assetRewardsData || assetRewardsData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground">
                            No rewards created yet. Create your first reward above.
                          </TableCell>
                        </TableRow>
                      ) : (
                        assetRewardsData.map((reward: AssetReward) => (
                          <TableRow key={reward.id} data-testid={`row-reward-${reward.id}`}>
                            <TableCell>
                              <img
                                src={reward.imageUrl}
                                alt={reward.name}
                                className="w-12 h-12 object-cover rounded"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/48?text=?";
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{reward.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {assetTypeDisplayNames[reward.assetType] || reward.assetType || 'Other'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={
                                  reward.rarity === 'legendary' ? 'bg-yellow-500 text-black' :
                                  reward.rarity === 'epic' ? 'bg-purple-500' :
                                  reward.rarity === 'rare' ? 'bg-blue-500' :
                                  'bg-gray-400'
                                }
                              >
                                {reward.rarity ? reward.rarity.charAt(0).toUpperCase() + reward.rarity.slice(1) : 'Common'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {reward.availableInLootbox && (
                                  <Badge variant="outline" className="text-xs">
                                    <Gift className="h-3 w-3 mr-1" /> Lootbox
                                  </Badge>
                                )}
                                {reward.availableInStore && (
                                  <Badge variant="outline" className="text-xs">
                                    <Store className="h-3 w-3 mr-1" /> Store {reward.storePrice ? `(${reward.storePrice})` : ''}
                                  </Badge>
                                )}
                                {reward.proOnly && (
                                  <Badge className="bg-amber-500 text-xs">
                                    <Crown className="h-3 w-3 mr-1" /> Pro
                                  </Badge>
                                )}
                                {!reward.availableInLootbox && !reward.availableInStore && !reward.proOnly && (
                                  <span className="text-muted-foreground text-xs">None set</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="cursor-pointer" onClick={async () => {
                                try {
                                  const response = await apiRequest('GET', `/api/admin/asset-rewards/${reward.id}`);
                                  const data = await response.json();
                                  setSelectedReward(data);
                                  setRewardDialogOpen(true);
                                } catch (error) {
                                  console.error("Failed to fetch reward details:", error);
                                }
                              }}>
                                {reward.timesRewarded} users
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={reward.isActive ? "default" : "secondary"}>
                                {reward.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingReward(reward);
                                  setEditRewardDialogOpen(true);
                                }}
                                data-testid={`button-edit-reward-${reward.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  await apiRequest('PATCH', `/api/admin/asset-rewards/${reward.id}`, {
                                    isActive: !reward.isActive,
                                  });
                                  refetchRewards();
                                }}
                                data-testid={`button-toggle-reward-${reward.id}`}
                              >
                                {reward.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={async () => {
                                  if (confirm(`Are you sure you want to delete "${reward.name}"?`)) {
                                    await apiRequest('DELETE', `/api/admin/asset-rewards/${reward.id}`);
                                    toast({
                                      title: "Reward deleted",
                                      description: "The reward has been deleted.",
                                    });
                                    refetchRewards();
                                  }
                                }}
                                data-testid={`button-delete-reward-${reward.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reward Details Dialog */}
          <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Reward Details: {selectedReward?.name}</DialogTitle>
                <DialogDescription>
                  View who has received this reward
                </DialogDescription>
              </DialogHeader>
              {selectedReward && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={selectedReward.imageUrl}
                      alt={selectedReward.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div>
                      <p><strong>Rarity:</strong> <Badge className={
                        selectedReward.rarity === 'legendary' ? 'bg-yellow-500 text-black' :
                        selectedReward.rarity === 'epic' ? 'bg-purple-500' :
                        selectedReward.rarity === 'rare' ? 'bg-blue-500' :
                        'bg-gray-400'
                      }>{selectedReward.rarity ? selectedReward.rarity.charAt(0).toUpperCase() + selectedReward.rarity.slice(1) : 'Common'}</Badge></p>
                      <p><strong>Unlock Chance:</strong> {selectedReward.unlockChance}%</p>
                      <p><strong>Times Rewarded:</strong> {selectedReward.timesRewarded}</p>
                      <p><strong>Status:</strong> {selectedReward.isActive ? "Active" : "Inactive"}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Users who received this reward:</h4>
                    {selectedReward.claims && selectedReward.claims.length > 0 ? (
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {selectedReward.claims.map((claim) => (
                            <div key={claim.id} className="flex items-center gap-3 p-2 border rounded">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                {claim.user.avatarUrl ? (
                                  <img src={claim.user.avatarUrl} alt={claim.user.username} className="w-full h-full object-cover" />
                                ) : (
                                  <User className="h-4 w-4" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{claim.user.displayName}</p>
                                <p className="text-sm text-muted-foreground">@{claim.user.username}</p>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {new Date(claim.claimedAt).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-muted-foreground">No users have received this reward yet.</p>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit Reward Dialog */}
          <Dialog open={editRewardDialogOpen} onOpenChange={setEditRewardDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Reward</DialogTitle>
                <DialogDescription>
                  Update reward details
                </DialogDescription>
              </DialogHeader>
              {editingReward && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-reward-name">Name</Label>
                    <Input
                      id="edit-reward-name"
                      value={editingReward.name}
                      onChange={(e) => setEditingReward({ ...editingReward, name: e.target.value })}
                      data-testid="input-edit-reward-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-reward-image">Reward Image</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="edit-reward-image"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleEditRewardImageUpload(file);
                          }
                        }}
                        disabled={editUploadingImage}
                        data-testid="input-edit-reward-image"
                        className="cursor-pointer"
                      />
                      {editUploadingImage && <span className="text-sm text-muted-foreground">Uploading...</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">Upload a new image to replace the current one</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-reward-rarity">Rarity (sets drop chance)</Label>
                    <Select
                      value={editingReward.rarity || "common"}
                      onValueChange={(value: string) => setEditingReward({ 
                        ...editingReward, 
                        rarity: value,
                        unlockChance: rarityChanceMap[value] 
                      })}
                    >
                      <SelectTrigger data-testid="select-edit-reward-rarity">
                        <SelectValue placeholder="Select rarity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="common">
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                            Common (60%)
                          </span>
                        </SelectItem>
                        <SelectItem value="rare">
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                            Rare (25%)
                          </span>
                        </SelectItem>
                        <SelectItem value="epic">
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                            Epic (12%)
                          </span>
                        </SelectItem>
                        <SelectItem value="legendary">
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                            Legendary (3%)
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-reward-asset-type">Asset Type (where it's used)</Label>
                    <Select
                      value={editingReward.assetType || "other"}
                      onValueChange={(value: string) => setEditingReward({ 
                        ...editingReward, 
                        assetType: value 
                      })}
                    >
                      <SelectTrigger data-testid="select-edit-reward-asset-type">
                        <SelectValue placeholder="Select asset type" />
                      </SelectTrigger>
                      <SelectContent>
                        {assetTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {assetTypeDisplayNames[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="border-t pt-4 space-y-3">
                    <Label className="font-medium">Availability Settings</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editingReward.availableInLootbox ?? true}
                          onCheckedChange={(checked) => setEditingReward({ 
                            ...editingReward, 
                            availableInLootbox: checked 
                          })}
                          id="edit-reward-lootbox"
                        />
                        <Label htmlFor="edit-reward-lootbox" className="text-sm cursor-pointer">
                          <Gift className="h-4 w-4 inline mr-1" /> Available in Lootbox
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editingReward.availableInStore ?? false}
                          onCheckedChange={(checked) => setEditingReward({ 
                            ...editingReward, 
                            availableInStore: checked,
                            storePrice: checked ? (editingReward.storePrice ?? null) : null
                          })}
                          id="edit-reward-store"
                        />
                        <Label htmlFor="edit-reward-store" className="text-sm cursor-pointer">
                          <ShoppingBag className="h-4 w-4 inline mr-1" /> Available in Store
                        </Label>
                      </div>
                      {editingReward.availableInStore && (
                        <div className="pl-8">
                          <Input
                            type="number"
                            placeholder="Store price (GF tokens)"
                            value={editingReward.storePrice || ""}
                            onChange={(e) => setEditingReward({ 
                              ...editingReward, 
                              storePrice: e.target.value ? parseInt(e.target.value) : null 
                            })}
                            min="1"
                            className="max-w-[200px]"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editingReward.proOnly ?? false}
                          onCheckedChange={(checked) => setEditingReward({ 
                            ...editingReward, 
                            proOnly: checked 
                          })}
                          id="edit-reward-pro"
                        />
                        <Label htmlFor="edit-reward-pro" className="text-sm cursor-pointer">
                          <Crown className="h-4 w-4 inline mr-1" /> Pro Subscribers Only
                        </Label>
                      </div>
                    </div>
                  </div>
                  
                  {editingReward.imageUrl && (
                    <div className="flex justify-center">
                      <img
                        src={editingReward.imageUrl}
                        alt="Preview"
                        className="w-24 h-24 object-cover rounded border"
                      />
                    </div>
                  )}
                  <Button
                    className="w-full"
                    onClick={async () => {
                      try {
                        const rarity = editingReward.rarity || "common";
                        if (editingReward.availableInStore && !editingReward.storePrice) {
                          toast({
                            title: "Missing price",
                            description: "Please provide a store price for store items",
                            variant: "gamefolioError",
                          });
                          return;
                        }
                        await apiRequest('PATCH', `/api/admin/asset-rewards/${editingReward.id}`, {
                          name: editingReward.name,
                          imageUrl: editingReward.imageUrl,
                          rarity: rarity,
                          assetType: editingReward.assetType || "other",
                          unlockChance: rarityChanceMap[rarity],
                          availableInLootbox: editingReward.availableInLootbox,
                          availableInStore: editingReward.availableInStore,
                          proOnly: editingReward.proOnly,
                          storePrice: editingReward.availableInStore ? editingReward.storePrice : null,
                        });
                        toast({
                          title: "Reward updated",
                          description: "The reward has been updated successfully.",
                          variant: "gamefolioSuccess",
                        });
                        setEditRewardDialogOpen(false);
                        setEditingReward(null);
                        refetchRewards();
                      } catch (error: any) {
                        toast({
                          title: "Error",
                          description: error.message || "Failed to update reward",
                          variant: "gamefolioError",
                        });
                      }
                    }}
                    data-testid="button-save-reward"
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Lootbox Tab */}
        <TabsContent value="lootbox" className="space-y-4">
          <LootboxManagement />
        </TabsContent>

        {/* Store Management Tab */}
        <TabsContent value="store-management" className="space-y-4">
          <StoreManagement />
        </TabsContent>

        {/* Pro Subscribers Tab */}
        <TabsContent value="pro-subscribers" className="space-y-4">
          <ProSubscribersManagement />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Settings</CardTitle>
              <CardDescription>
                Configure admin panel settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">System Information</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Current system status and information
                  </p>
                  
                  <div className="grid gap-2">
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Admin User</span>
                      <span>{user.username}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Environment</span>
                      <span>Production</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Version</span>
                      <span>1.1.0</span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button
                    onClick={() => {
                      toast({
                        title: "Settings saved",
                        description: "Your settings have been saved successfully.",
                      });
                    }}
                  >
                    Save Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Asset Management
                </h3>
                <p className="text-sm text-muted-foreground">
                  Browse and manage assets from all storage buckets. Assign assets to Lootbox rewards or Store items.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <Select value={assetsDropdownBucket} onValueChange={setAssetsDropdownBucket}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder={assetBucketsLoading ? "Loading buckets..." : "Select a bucket..."} />
              </SelectTrigger>
              <SelectContent>
                {(assetBucketList || []).map((bucket) => (
                  <SelectItem key={bucket.name} value={bucket.name}>{bucket.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAssetsGo} disabled={!assetsDropdownBucket}>
              Go
            </Button>
            {assetsActiveBucket && (
              <>
                {assetsBucketFolder && (
                  <Button variant="outline" size="sm" onClick={() => setAssetsBucketFolder("")}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Root
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => { refetchActiveBucket(); refetchAssignments(); }} disabled={assetsActiveBucketLoading}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${assetsActiveBucketLoading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
              </>
            )}
          </div>

          {assetsActiveBucket && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search assets by name..."
                value={assetsSearchQuery}
                onChange={(e) => setAssetsSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {assetsBucketFolder && (
            <div className="text-sm text-muted-foreground mb-3">
              Current folder: <span className="font-mono bg-muted px-2 py-1 rounded">{assetsBucketFolder}</span>
            </div>
          )}

          {!assetsActiveBucket ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Select a bucket and click <strong>Go</strong> to load assets</p>
            </div>
          ) : assetsActiveBucketLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading assets...</div>
          ) : (
            <div className="space-y-4">
              {assetsActiveBucketData?.folders && assetsActiveBucketData.folders.filter(f => !assetsSearchQuery || f.toLowerCase().includes(assetsSearchQuery.toLowerCase())).length > 0 && (
                <div>
                  <h4 className="text-xs font-medium mb-2 text-muted-foreground">Folders</h4>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {assetsActiveBucketData.folders.filter(f => !assetsSearchQuery || f.toLowerCase().includes(assetsSearchQuery.toLowerCase())).map((folder) => (
                      <button
                        key={folder}
                        onClick={() => setAssetsBucketFolder(prev => prev ? `${prev}/${folder}` : folder)}
                        className="flex flex-col items-center p-2 rounded border hover:bg-muted transition-colors"
                      >
                        <FolderOpen className="h-6 w-6 text-yellow-500" />
                        <span className="text-xs truncate w-full text-center mt-1">{folder}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {assetsActiveBucketData?.files && (() => {
                const filteredFiles = assetsActiveBucketData.files.filter(f => !assetsSearchQuery || f.name.toLowerCase().includes(assetsSearchQuery.toLowerCase()));
                return filteredFiles.length > 0 ? (
                <div>
                  <h4 className="text-xs font-medium mb-2 text-muted-foreground">Assets ({filteredFiles.length}{assetsSearchQuery ? ` of ${assetsActiveBucketData.files.length}` : ''})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredFiles.map((file) => {
                      const assignment = getAssignment(file.publicUrl);
                      return (
                        <div
                          key={file.id}
                          className={`relative rounded-lg border p-3 transition-colors ${
                            assignment ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <img 
                              src={file.publicUrl} 
                              alt={file.name}
                              className="w-14 h-14 object-contain rounded border bg-muted/30"
                              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>

                          {assignment ? (
                            <div className="space-y-1.5 mb-2">
                              <div className="flex flex-wrap gap-1">
                                {assignment.availableInLootbox && (
                                  <span className="inline-flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full">
                                    <Gift className="h-3 w-3" /> Lootbox ({assignment.unlockChance ?? 'N/A'}%)
                                  </span>
                                )}
                                {assignment.availableInStore && (
                                  <span className="inline-flex items-center gap-1 text-xs bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded-full">
                                    <ShoppingBag className="h-3 w-3" /> Store {assignment.storePrice ? `(${assignment.storePrice} GF)` : ''}
                                  </span>
                                )}
                                {assignment.proOnly && (
                                  <span className="inline-flex items-center gap-1 text-xs bg-purple-500/20 text-purple-500 px-2 py-0.5 rounded-full">
                                    <Crown className="h-3 w-3" /> Pro
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <span className={`w-2 h-2 rounded-full ${
                                  assignment.rarity === 'legendary' ? 'bg-yellow-500' :
                                  assignment.rarity === 'epic' ? 'bg-purple-500' :
                                  assignment.rarity === 'rare' ? 'bg-blue-500' : 'bg-gray-400'
                                }`}></span>
                                {assignment.rarity} · {assignment.type.replace('_', ' ')} · {assignment.name}
                              </div>
                            </div>
                          ) : (
                            <div className="mb-2">
                              <span className="text-xs text-muted-foreground italic">Not assigned</span>
                            </div>
                          )}

                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant={assignment ? "outline" : "default"}
                              className="flex-1 h-7 text-xs"
                              onClick={() => openAssignDialog(file, assetsActiveBucket)}
                            >
                              {assignment ? 'Edit Assignment' : 'Assign'}
                            </Button>
                            {assignment && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs px-2"
                                onClick={() => handleAssetUnassign(file.publicUrl)}
                              >
                                Unassign
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : assetsSearchQuery ? (
                <div className="text-center py-8 text-muted-foreground">
                  No assets matching "{assetsSearchQuery}"
                </div>
              ) : null;
              })()}

              {assetsActiveBucketData?.files?.length === 0 && assetsActiveBucketData?.folders?.length === 0 && !assetsSearchQuery && (
                <div className="text-center py-8 text-muted-foreground">No files or folders in this location</div>
              )}
            </div>
          )}

          <Dialog open={assetsAssignDialogOpen} onOpenChange={setAssetsAssignDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Assign Asset</DialogTitle>
                <DialogDescription>
                  Configure how this asset should be made available to users.
                </DialogDescription>
              </DialogHeader>
              
              {assetsSelectedFile && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <img 
                      src={assetsSelectedFile.publicUrl} 
                      alt={assetsSelectedFile.name}
                      className="w-16 h-16 object-contain rounded border"
                    />
                    <div>
                      <p className="font-medium">{assetsSelectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{assetsSelectedBucketName}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input
                      value={assetsAssignName}
                      onChange={(e) => setAssetsAssignName(e.target.value)}
                      placeholder="Asset display name"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Availability</Label>
                    <div className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">Available in Lootbox</span>
                        </div>
                        <Switch checked={assetsInLootbox} onCheckedChange={setAssetsInLootbox} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">Available in Store</span>
                        </div>
                        <Switch checked={assetsInStore} onCheckedChange={setAssetsInStore} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-purple-500" />
                          <span className="text-sm">Pro Users Only</span>
                        </div>
                        <Switch checked={assetsProOnly} onCheckedChange={setAssetsProOnly} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Asset Type</Label>
                    <Select value={assetsAssetType} onValueChange={setAssetsAssetType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="avatar_border">Avatar Border</SelectItem>
                        <SelectItem value="profile_banner">Profile Picture Border</SelectItem>
                        <SelectItem value="profile_background">Profile Background</SelectItem>
                        <SelectItem value="badge">Badge</SelectItem>
                        <SelectItem value="emoji">Emoji</SelectItem>
                        <SelectItem value="sound_effect">Sound Effect</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Rarity</Label>
                    <Select value={assetsRarity} onValueChange={(v) => {
                      setAssetsRarity(v);
                      const chanceMap: Record<string, number> = { common: 60, rare: 25, epic: 12, legendary: 3 };
                      setAssetsUnlockChance(chanceMap[v] || 10);
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="common">
                          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gray-400"></span> Common</span>
                        </SelectItem>
                        <SelectItem value="rare">
                          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Rare</span>
                        </SelectItem>
                        <SelectItem value="epic">
                          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-500"></span> Epic</span>
                        </SelectItem>
                        <SelectItem value="legendary">
                          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> Legendary</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {assetsInLootbox && (
                    <div className="space-y-2">
                      <Label>Lootbox Win Probability: {assetsUnlockChance}%</Label>
                      <input
                        type="range"
                        min={1}
                        max={100}
                        value={assetsUnlockChance}
                        onChange={(e) => setAssetsUnlockChance(parseInt(e.target.value))}
                        className="w-full accent-primary"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1% (Very Rare)</span>
                        <span>50%</span>
                        <span>100% (Guaranteed)</span>
                      </div>
                    </div>
                  )}

                  {assetsInStore && (
                    <div className="space-y-2">
                      <Label>Store Price (GF Tokens)</Label>
                      <Input
                        type="number"
                        value={assetsStorePrice}
                        onChange={(e) => setAssetsStorePrice(e.target.value)}
                        placeholder="e.g., 150"
                      />
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setAssetsAssignDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAssetAssign} disabled={assetsAssigning}>
                  {assetsAssigning ? 'Assigning...' : 'Save Assignment'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

      {/* Ban User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Enter a reason for banning this user. This will be visible to the user when they attempt to log in.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="reason" className="text-sm font-medium">Reason</label>
              <Input
                id="reason"
                placeholder="Violated community guidelines..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedUser && handleBanUser(selectedUser.id)}
            >
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Badge Assignment Dialog */}
      <Dialog open={badgeDialogOpen} onOpenChange={setBadgeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User Badge</DialogTitle>
            <DialogDescription>
              {selectedBadgeUser ? `Manage badges for ${selectedBadgeUser.username}` : 'Assign badge to user'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {selectedBadgeUser ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <User className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{selectedBadgeUser.displayName}</div>
                    <div className="text-sm text-muted-foreground">@{selectedBadgeUser.username}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Badge Type</label>
                  <Select value={selectedBadgeType} onValueChange={setSelectedBadgeType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select badge type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newcomer">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4" />
                          Newcomer
                        </div>
                      </SelectItem>
                      <SelectItem value="founder">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4" />
                          Founder
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Admin
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Badges</label>
                  <div className="flex gap-2">
                    {selectedBadgeUser.role === 'admin' && (
                      <Badge className={`${getBadgeColor('admin')} text-white`}>
                        {getBadgeIcon('admin')}
                        <span className="ml-1">Admin</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-4 w-4 p-0 text-white hover:bg-red-500"
                          onClick={() => handleRemoveBadge(selectedBadgeUser.id, 'admin')}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label htmlFor="userSearch" className="text-sm font-medium">Search User</label>
                <Input
                  id="userSearch"
                  placeholder="Type username..."
                  value={badgeUserSearch}
                  onChange={(e) => setBadgeUserSearch(e.target.value)}
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setBadgeDialogOpen(false);
              setSelectedBadgeUser(null);
              setSelectedBadgeType("");
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedBadgeUser && selectedBadgeType) {
                  handleAssignBadge(selectedBadgeUser.id, selectedBadgeType);
                }
              }}
              disabled={!selectedBadgeUser || !selectedBadgeType}
            >
              Assign Badge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;