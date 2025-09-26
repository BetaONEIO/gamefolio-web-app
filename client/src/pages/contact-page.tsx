import { Link } from "wouter";
import { ArrowLeft, Mail, MessageCircle, Shield, Upload, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

export default function ContactPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Technical Support Form State
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles: File[] = [];
    const previews: string[] = [];

    files.forEach((file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image file. Please upload only image files.`,
          variant: "destructive",
        });
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 10MB. Please choose a smaller file.`,
          variant: "destructive",
        });
        return;
      }

      validFiles.push(file);
      previews.push(URL.createObjectURL(file));
    });

    setAttachments(prev => [...prev, ...validFiles]);
    setAttachmentPreviews(prev => [...prev, ...previews]);
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    URL.revokeObjectURL(attachmentPreviews[index]);
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setAttachmentPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Upload attachments mutation
  const uploadAttachmentsMutation = useMutation({
    mutationFn: async (files: File[]): Promise<string[]> => {
      if (files.length === 0) return [];

      const formData = new FormData();
      files.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await fetch('/api/support/upload-attachments', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload attachments');
      }

      const result = await response.json();
      return result.attachmentUrls;
    },
  });

  // Submit support form mutation
  const submitSupportMutation = useMutation({
    mutationFn: async (data: {
      username?: string;
      email?: string;
      subject: string;
      message: string;
      attachmentUrls?: string[];
    }) => {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          category: 'Tech Support',
          subject: data.subject,
          message: data.message,
          attachmentUrls: data.attachmentUrls || [],
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit support request');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Support request submitted",
        description: "Thank you! We'll get back to you as soon as possible.",
        variant: "default",
      });
      // Reset form
      setSubject("");
      setDescription("");
      setAttachments([]);
      attachmentPreviews.forEach(url => URL.revokeObjectURL(url));
      setAttachmentPreviews([]);
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to submit",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim()) {
      toast({
        title: "Subject required",
        description: "Please enter a subject for your support request.",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      toast({
        title: "Description required",
        description: "Please provide a detailed description of your issue (at least 10 characters).",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // First upload attachments if any
      let attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        attachmentUrls = await uploadAttachmentsMutation.mutateAsync(attachments);
      }

      // Then submit the support request
      await submitSupportMutation.mutateAsync({
        username: user?.username,
        email: user?.email || undefined,
        subject: subject.trim(),
        message: description.trim(),
        attachmentUrls,
      });
    } catch (error) {
      console.error('Support submission error:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold text-primary mb-2">Contact Us</h1>
          <p className="text-muted-foreground">Get in touch with the Gamefolio team</p>
        </div>

        {/* Technical Support Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              Technical Support
            </CardTitle>
            <CardDescription>
              Having issues with the app? Submit a detailed bug report and we'll help you resolve it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username and Email (prepopulated) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={user?.username || ""}
                    placeholder="Not logged in"
                    disabled
                    className="bg-muted"
                    data-testid="input-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    placeholder="Not provided"
                    disabled
                    className="bg-muted"
                    data-testid="input-email"
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">
                  Subject <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of the issue"
                  required
                  data-testid="input-subject"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please provide detailed information about the issue you're experiencing. Include steps to reproduce the problem if possible."
                  className="min-h-32"
                  required
                  data-testid="textarea-description"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 10 characters
                </p>
              </div>

              {/* Screenshot Upload */}
              <div className="space-y-2">
                <Label htmlFor="screenshots">Screenshots (Optional)</Label>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="screenshots"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('screenshots')?.click()}
                      disabled={attachments.length >= 5}
                      data-testid="button-upload-screenshots"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Add Screenshots
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Maximum 5 files, 10MB each. Supports JPEG, PNG, GIF
                    </p>
                  </div>

                  {/* Attachment Previews */}
                  {attachments.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {attachmentPreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full h-20 object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeAttachment(index)}
                            data-testid={`button-remove-screenshot-${index}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <p className="text-xs text-center mt-1 truncate">
                            {attachments[index].name}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={isSubmitting || !subject.trim() || !description.trim()}
                className="w-full md:w-auto"
                data-testid="button-submit-support"
              >
                {isSubmitting ? "Submitting..." : "Submit Support Request"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                General Support
              </CardTitle>
              <CardDescription>
                Questions about your account, features, or general help
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Email:</p>
                <p className="font-medium">support@gamefolio.com</p>
                <p className="text-sm text-muted-foreground mt-4">Response time: 24-48 hours</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Privacy & Legal
              </CardTitle>
              <CardDescription>
                Privacy concerns, data requests, and legal matters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Email:</p>
                <p className="font-medium">privacy@gamefolio.com</p>
                <p className="text-sm text-muted-foreground">Legal:</p>
                <p className="font-medium">legal@gamefolio.com</p>
                <p className="text-sm text-muted-foreground mt-4">Response time: 3-5 business days</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Business Inquiries
              </CardTitle>
              <CardDescription>
                Partnerships, press, and business opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Email:</p>
                <p className="font-medium">business@gamefolio.com</p>
                <p className="text-sm text-muted-foreground">Press:</p>
                <p className="font-medium">press@gamefolio.com</p>
                <p className="text-sm text-muted-foreground mt-4">Response time: 1-2 business days</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>
                Common questions and quick answers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">How do I delete my account?</h3>
                <p className="text-muted-foreground">
                  You can delete your account from Settings → Account → Delete Account. 
                  This action is permanent and cannot be undone.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">What file formats do you support?</h3>
                <p className="text-muted-foreground">
                  We support MP4, MOV, and AVI for videos, and JPG, PNG, and GIF for images. 
                  Videos are automatically optimized for the best viewing experience.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">How do I report inappropriate content?</h3>
                <p className="text-muted-foreground">
                  Click the "..." menu on any post and select "Report". We review all reports 
                  within 24 hours and take appropriate action.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Can I change my username?</h3>
                <p className="text-muted-foreground">
                  Yes, you can change your username once every 30 days from Settings → Profile. 
                  Your profile URL will automatically update.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Still need help?</h2>
          <p className="text-muted-foreground mb-6">
            Our team is here to help you get the most out of Gamefolio.
          </p>
          <div className="space-x-4">
            <Button asChild>
              <a href="mailto:support@gamefolio.com">Email Support</a>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/terms">View Terms</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/privacy">Privacy Policy</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}