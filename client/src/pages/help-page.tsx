import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, HelpCircle, Upload, Users, Settings, MessageSquare, Search, Zap, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

export default function HelpPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || "",
    category: "",
    subject: "",
    message: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.subject || !formData.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "gamefolioError",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/support", formData);

      if (response.ok) {
        toast({
          title: "Support Request Sent",
          description: "We've received your message and will get back to you soon!",
        });
        setFormData({
          username: user?.username || "",
          category: "",
          subject: "",
          message: ""
        });
      } else {
        throw new Error("Failed to send support request");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send your support request. Please try again.",
        variant: "gamefolioError",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-primary mb-2">Help & Support</h1>
          <p className="text-muted-foreground">Everything you need to know about using Gamefolio</p>
        </div>

        {/* User Guides Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">How to Use Gamefolio</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Getting Started
                </CardTitle>
                <CardDescription>
                  Set up your profile and start sharing your gaming moments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium mb-1">1. Complete Your Profile</p>
                  <p className="text-muted-foreground">Add your gaming bio, profile picture, and connect your gaming accounts</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-1">2. Verify Your Email</p>
                  <p className="text-muted-foreground">Check your inbox and verify your email to unlock all features</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-1">3. Follow Gamers</p>
                  <p className="text-muted-foreground">Discover and follow other gamers to build your gaming network</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Uploading Content
                </CardTitle>
                <CardDescription>
                  Share your best gaming clips, screenshots, and reels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium mb-1">Gaming Clips</p>
                  <p className="text-muted-foreground">Upload MP4, MOV, or AVI files up to 100MB. Perfect for epic moments!</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-1">Screenshots</p>
                  <p className="text-muted-foreground">Share JPG, PNG, or GIF images. Great for showcasing achievements</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-1">Reels</p>
                  <p className="text-muted-foreground">Short-form vertical videos optimized for mobile viewing</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Profile Customization
                </CardTitle>
                <CardDescription>
                  Personalize your gaming profile with themes and banners
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium mb-1">Custom Themes</p>
                  <p className="text-muted-foreground">Choose accent colors and create your unique gaming aesthetic</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-1">Banner Images</p>
                  <p className="text-muted-foreground">Upload banner images to showcase your gaming style</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-1">Gaming Connections</p>
                  <p className="text-muted-foreground">Link your Steam, Xbox, PlayStation, and other gaming accounts</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Social Features
                </CardTitle>
                <CardDescription>
                  Connect, chat, and engage with the gaming community
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium mb-1">Messaging</p>
                  <p className="text-muted-foreground">Send direct messages to other verified gamers</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-1">Reactions & Likes</p>
                  <p className="text-muted-foreground">React to and like content from your gaming community</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-1">Comments</p>
                  <p className="text-muted-foreground">Leave comments and engage in discussions about gaming content</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" />
                  Discovery
                </CardTitle>
                <CardDescription>
                  Find new content, games, and gamers to follow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium mb-1">Explore Feed</p>
                  <p className="text-muted-foreground">Discover trending clips and screenshots from the community</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-1">Game Pages</p>
                  <p className="text-muted-foreground">Browse content organized by specific games you love</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-1">Hashtags</p>
                  <p className="text-muted-foreground">Use hashtags to categorize and find specific content</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Pro Tips
                </CardTitle>
                <CardDescription>
                  Advanced features and tips for power users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium mb-1">Leaderboards</p>
                  <p className="text-muted-foreground">Compete with other gamers and climb the community rankings</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-1">Content Sharing</p>
                  <p className="text-muted-foreground">Share your clips outside Gamefolio with custom share links</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-1">Quality Settings</p>
                  <p className="text-muted-foreground">Upload high-quality content for the best viewing experience</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Support Form Section */}
        <div className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                Contact Support
              </CardTitle>
              <CardDescription>
                Need help with something specific? Send us a message and we'll get back to you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      readOnly
                      placeholder="Your Gamefolio username"
                      data-testid="input-username"
                      className="bg-muted/50 cursor-default"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Support Category *</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData({...formData, category: value})}
                    >
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tech Support">Tech Support</SelectItem>
                        <SelectItem value="Business Enquiry">Business Enquiry</SelectItem>
                        <SelectItem value="Partnership Enquiry">Partnership Enquiry</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    placeholder="Brief description of your issue or inquiry"
                    data-testid="input-subject"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="Please describe your issue in detail or provide more information about your inquiry..."
                    rows={5}
                    data-testid="textarea-message"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full md:w-auto"
                  data-testid="button-submit-support"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-current animate-spin mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Support Request
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Quick Links</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/contact">Contact Info</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/terms">Terms of Service</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/privacy">Privacy Policy</Link>
            </Button>
            <Button variant="outline" asChild>
              <a href="mailto:support@gamefolio.com">Direct Email</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}