import React, { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import AdminContentFilter from "./AdminContentFilter";
import { UserWithBadges, BannerSettings, Badge as BadgeType } from "@shared/schema";
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

// Banner Management Component
function BannerManagement() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch current banner settings
  const { data: bannerSettings, isLoading: isLoadingBanner, refetch: refetchBanner } = useQuery<BannerSettings>({
    queryKey: ['/api/admin/banner-settings'],
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

  // Access check is now handled by AdminProtectedRoute

  // Fetch admin stats
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch users with pagination
  const { data: usersData, isLoading: usersLoading } = useQuery<UsersData>({
    queryKey: ["/api/admin/users", { page: userPage, search: userSearch }],
    placeholderData: keepPreviousData,
  });

  // Fetch users for badge assignment search
  const { data: badgeUsersData, isLoading: badgeUsersLoading } = useQuery<UsersData>({
    queryKey: ["/api/admin/users", { page: 1, search: badgeUserSearch, limit: 10 }],
    enabled: badgeUserSearch.length >= 2,
    placeholderData: keepPreviousData,
  });

  // Fetch clips with pagination
  const { data: clipsData, isLoading: clipsLoading } = useQuery<ClipsData>({
    queryKey: ["/api/admin/clips", { page: clipPage }],
    placeholderData: keepPreviousData,
  });

  // Fetch current hero text settings
  const { data: currentHeroText, isLoading: heroTextLoading } = useQuery<HeroTextData>({
    queryKey: ["/api/hero-text/experienced"],
  });

  // Badge management queries
  const { data: badgesData, isLoading: badgesLoading, refetch: refetchBadges } = useQuery<BadgeType[]>({
    queryKey: ["/api/admin/badges"],
  });

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
        <TabsList className="grid w-full grid-cols-11">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="content-filter">Content Filter</TabsTrigger>
          <TabsTrigger value="banner">Banner</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="levels">Levels</TabsTrigger>
          <TabsTrigger value="streaks">Streaks</TabsTrigger>
          <TabsTrigger value="points">Points</TabsTrigger>
          <TabsTrigger value="hero-text">Hero Text</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
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
                    {badgeUsersData?.users.filter(u => 
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
                      <strong>Note:</strong> Streak milestones - 3, 7, 14, 30, 60, 90, 180, and 365 days award bonus points.
                      Users now earn streak increments every time they use the application, regardless of gaps.
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

        {/* Hero Text Tab */}
        <TabsContent value="hero-text" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Hero Text Management
              </CardTitle>
              <CardDescription>
                Customize the hero text displayed to different user groups on the homepage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {heroTextLoading ? (
                <div className="text-center py-4">Loading current settings...</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="heroTitle" className="text-sm font-medium">
                        Hero Title
                      </label>
                      <Input
                        id="heroTitle"
                        placeholder="Enter hero title"
                        value={heroTextTitle}
                        onChange={(e) => setHeroTextTitle(e.target.value)}
                        data-testid="input-hero-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="heroSubtitle" className="text-sm font-medium">
                        Hero Subtitle
                      </label>
                      <Input
                        id="heroSubtitle"
                        placeholder="Enter hero subtitle"
                        value={heroTextSubtitle}
                        onChange={(e) => setHeroTextSubtitle(e.target.value)}
                        data-testid="input-hero-subtitle"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="heroButtonText" className="text-sm font-medium">
                        Button Text (Optional)
                      </label>
                      <Input
                        id="heroButtonText"
                        placeholder="e.g., Get Started"
                        value={heroButtonText}
                        onChange={(e) => setHeroButtonText(e.target.value)}
                        data-testid="input-hero-button-text"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="heroButtonUrl" className="text-sm font-medium">
                        Button URL (Optional)
                      </label>
                      <Input
                        id="heroButtonUrl"
                        placeholder="e.g., /explore or https://example.com"
                        value={heroButtonUrl}
                        onChange={(e) => setHeroButtonUrl(e.target.value)}
                        data-testid="input-hero-button-url"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="heroTargetAudience" className="text-sm font-medium">
                      Target Audience
                    </label>
                    <select
                      id="heroTargetAudience"
                      value={heroTargetAudience}
                      onChange={(e) => setHeroTargetAudience(e.target.value)}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      data-testid="select-hero-target-audience"
                    >
                      <option value="new_users">New Users (No content uploaded)</option>
                      <option value="existing_users">Existing Users (Authenticated)</option>
                      <option value="experienced_users">Experienced Users (With content)</option>
                      <option value="all_users">All Users</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Choose which users will see this hero text on the homepage
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <h4 className="font-medium mb-2">Preview</h4>
                    <div className="space-y-3">
                      <div className="text-lg font-semibold">
                        {heroTextTitle || "Enter title above"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {heroTextSubtitle || "Enter subtitle above"}
                      </div>
                      {heroButtonText && (
                        <Button variant="default" size="sm" disabled>
                          {heroButtonText}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      onClick={handleUpdateHeroText}
                      disabled={!heroTextTitle.trim() || !heroTextSubtitle.trim()}
                      data-testid="button-update-hero-text"
                    >
                      Update Hero Text
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Current Settings</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>Current Title:</strong> {currentHeroText?.title || "Not set"}</p>
                      <p><strong>Current Subtitle:</strong> {currentHeroText?.subtitle || "Not set"}</p>
                      <p><strong>Button Text:</strong> {currentHeroText?.buttonText || "Not set"}</p>
                      <p><strong>Button URL:</strong> {currentHeroText?.buttonUrl || "Not set"}</p>
                      <p><strong>Target Audience:</strong> {
                        currentHeroText?.targetAudience === 'new_users' ? 'New Users' :
                        currentHeroText?.targetAudience === 'existing_users' ? 'Existing Users' :
                        currentHeroText?.targetAudience === 'experienced_users' ? 'Experienced Users' :
                        currentHeroText?.targetAudience === 'all_users' ? 'All Users' :
                        'Experienced Users'
                      }</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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