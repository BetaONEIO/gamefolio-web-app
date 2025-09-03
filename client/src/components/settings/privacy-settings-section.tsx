
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Lock, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export function PrivacySettingsSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update privacy preferences mutation
  const updatePrivacyMutation = useMutation({
    mutationFn: async (isPrivate: boolean) => {
      const response = await fetch("/api/users/privacy-preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ isPrivate }),
      });
      if (!response.ok) throw new Error("Failed to update privacy settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        description: "Privacy settings updated successfully",
        variant: "gamefolioSuccess",
      });
    },
    onError: () => {
      toast({
        description: "Failed to update privacy settings",
        variant: "destructive",
      });
    },
  });

  const handlePrivacyToggle = (isPrivate: boolean) => {
    updatePrivacyMutation.mutate(isPrivate);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {user?.isPrivate ? (
            <Lock className="h-5 w-5" />
          ) : (
            <Globe className="h-5 w-5" />
          )}
          Privacy Settings
        </CardTitle>
        <CardDescription>
          Control who can see your profile and content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="private-profile" className="text-base">
              Private Profile
            </Label>
            <div className="text-sm text-muted-foreground">
              When enabled, only approved followers can see your clips, screenshots, and other content
            </div>
          </div>
          <Switch
            id="private-profile"
            checked={user?.isPrivate || false}
            onCheckedChange={handlePrivacyToggle}
            disabled={updatePrivacyMutation.isPending}
          />
        </div>

        {user?.isPrivate && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4" />
              <span className="font-medium">Private Profile Active</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your profile is private. New followers will need to send a follow request, and you can approve or decline them in the Follow Requests section.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
