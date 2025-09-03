import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold text-primary mb-2">Terms and Conditions</h1>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-invert max-w-none">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using Gamefolio ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. 
            If you do not agree to abide by the above, please do not use this service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Gamefolio is a social gaming platform that allows users to:
          </p>
          <ul>
            <li>Upload and share gaming clips, screenshots, and reels</li>
            <li>Create and customize gaming profiles</li>
            <li>Follow other gamers and discover content</li>
            <li>Connect gaming accounts and showcase achievements</li>
            <li>Participate in the gaming community</li>
          </ul>

          <h2>3. User Accounts</h2>
          <p>
            To access certain features of the Service, you must register for an account. When you register, you agree to:
          </p>
          <ul>
            <li>Provide accurate, current, and complete information</li>
            <li>Maintain the security of your password and identification</li>
            <li>Accept responsibility for all activities under your account</li>
            <li>Notify us immediately of unauthorized use of your account</li>
          </ul>

          <h2>4. Content Guidelines</h2>
          <p>
            Users are responsible for the content they upload. You agree not to upload content that:
          </p>
          <ul>
            <li>Is illegal, harmful, or offensive</li>
            <li>Violates intellectual property rights</li>
            <li>Contains malware or harmful code</li>
            <li>Promotes harassment or discrimination</li>
            <li>Is sexually explicit or inappropriate</li>
            <li>Violates any applicable laws or regulations</li>
          </ul>

          <h2>5. Intellectual Property</h2>
          <p>
            You retain ownership of content you upload, but grant Gamefolio a non-exclusive, worldwide, royalty-free license to use, 
            display, and distribute your content on the platform. The Gamefolio platform, including its design, features, and code, 
            is protected by copyright and other intellectual property laws.
          </p>

          <h2>6. Privacy and Data Protection</h2>
          <p>
            Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, 
            to understand our practices.
          </p>

          <h2>7. Community Standards</h2>
          <p>
            Gamefolio is committed to maintaining a positive gaming community. Users must:
          </p>
          <ul>
            <li>Treat other users with respect</li>
            <li>Follow community guidelines</li>
            <li>Report inappropriate behavior</li>
            <li>Engage in constructive interactions</li>
          </ul>

          <h2>8. Termination</h2>
          <p>
            We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, 
            for any reason whatsoever, including without limitation if you breach the Terms.
          </p>

          <h2>9. Disclaimer of Warranties</h2>
          <p>
            The Service is provided on an "AS IS" and "AS AVAILABLE" basis. Gamefolio makes no representations or warranties 
            of any kind, express or implied, as to the operation of the Service or the information included on the Service.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>
            Gamefolio will not be liable for any damages of any kind arising from the use of the Service, including but not limited to 
            direct, indirect, incidental, punitive, and consequential damages.
          </p>

          <h2>11. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. 
            Your continued use of the Service after changes constitutes acceptance of the new terms.
          </p>

          <h2>12. Contact Information</h2>
          <p>
            If you have any questions about these Terms and Conditions, please contact us at:
          </p>
          <ul>
            <li>Email: legal@gamefolio.com</li>
            <li>Website: www.gamefolio.com</li>
          </ul>

          <h2>13. Governing Law</h2>
          <p>
            These Terms shall be interpreted and governed by the laws of the jurisdiction in which Gamefolio operates, 
            without regard to its conflict of law provisions.
          </p>
        </div>

        <div className="mt-12 p-6 bg-card rounded-lg border">
          <h3 className="text-lg font-semibold mb-2">Questions?</h3>
          <p className="text-muted-foreground mb-4">
            If you have any questions about these terms, please don't hesitate to reach out to our team.
          </p>
          <Link href="/contact">
            <Button variant="outline">Contact Support</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}