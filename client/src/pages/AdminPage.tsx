import React, { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import AdminContentFilter from "./AdminContentFilter";
import { UserWithBadges } from "@shared/schema";

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

  // Access check is now handled by AdminProtectedRoute

  // Fetch admin stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch users with pagination
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users", { page: userPage, search: userSearch }],
    placeholderData: keepPreviousData,
  });

  // Fetch users for badge assignment search
  const { data: badgeUsersData, isLoading: badgeUsersLoading } = useQuery({
    queryKey: ["/api/admin/users", { page: 1, search: badgeUserSearch, limit: 10 }],
    enabled: badgeUserSearch.length >= 2,
    placeholderData: keepPreviousData,
  });

  // Fetch clips with pagination
  const { data: clipsData, isLoading: clipsLoading } = useQuery({
    queryKey: ["/api/admin/clips", { page: clipPage }],
    placeholderData: keepPreviousData,
  });

  // Fetch current hero text settings
  const { data: currentHeroText, isLoading: heroTextLoading } = useQuery({
    queryKey: ["/api/hero-text/experienced"],
  });

  // Update form fields when data loads
  React.useEffect(() => {
    if (currentHeroText) {
      setHeroTextTitle(currentHeroText.title || "");
      setHeroTextSubtitle(currentHeroText.subtitle || "");
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
        variant: "destructive",
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
        variant: "destructive",
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
        variant: "destructive",
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
        variant: "destructive",
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
        variant: "destructive",
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
          variant: "destructive",
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
          variant: "destructive",
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
        variant: "destructive",
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
        variant: "destructive",
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
        variant: "destructive",
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
        variant: "destructive",
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="content-filter">Content Filter</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
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
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          Loading users...
                        </TableCell>
                      </TableRow>
                    ) : usersData?.users?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
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

        {/* Badges Tab */}
        <TabsContent value="badges" className="space-y-4">
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
                      <Button
                        onClick={() => {
                          if (selectedBadgeUser && selectedBadgeType) {
                            handleAssignBadge(selectedBadgeUser.id, selectedBadgeType);
                          } else {
                            toast({
                              title: "Missing Information",
                              description: "Please select both a user and badge type.",
                              variant: "destructive",
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

        {/* Hero Text Tab */}
        <TabsContent value="hero-text" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Hero Text Management
              </CardTitle>
              <CardDescription>
                Customize the hero text displayed to experienced users who have uploaded content
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
                  
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <h4 className="font-medium mb-2">Preview</h4>
                    <div className="space-y-1">
                      <div className="text-lg font-semibold">
                        {heroTextTitle || "Enter title above"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {heroTextSubtitle || "Enter subtitle above"}
                      </div>
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
                      <p className="text-xs mt-2">
                        <strong>Note:</strong> This text will be shown to users who have uploaded content.
                        New users will see the default text.
                      </p>
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
                      <span>1.0.0</span>
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