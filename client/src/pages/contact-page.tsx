import { Link } from "wouter";
import { ArrowLeft, Mail, MessageCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ContactPage() {
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