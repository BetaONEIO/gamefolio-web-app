import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
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
          <h1 className="text-4xl font-bold text-primary mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-invert max-w-none">
          <h2>1. Introduction</h2>
          <p>
            Welcome to Gamefolio. We respect your privacy and are committed to protecting your personal data. 
            This privacy policy explains how we collect, use, and safeguard your information when you use our gaming social platform.
          </p>

          <h2>2. Information We Collect</h2>
          
          <h3>2.1 Personal Information</h3>
          <p>When you create an account, we collect:</p>
          <ul>
            <li>Username and display name</li>
            <li>Email address</li>
            <li>Password (encrypted)</li>
            <li>Profile information (bio, gaming preferences)</li>
            <li>Profile pictures and banners</li>
          </ul>

          <h3>2.2 Content Information</h3>
          <p>When you use our platform, we collect:</p>
          <ul>
            <li>Gaming clips, screenshots, and reels you upload</li>
            <li>Comments, likes, and reactions</li>
            <li>Gaming achievements and statistics</li>
            <li>Social interactions (follows, messages)</li>
          </ul>

          <h3>2.3 Technical Information</h3>
          <p>We automatically collect:</p>
          <ul>
            <li>IP address and device information</li>
            <li>Browser type and version</li>
            <li>Usage patterns and preferences</li>
            <li>Performance and error logs</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and maintain our gaming platform</li>
            <li>Personalize your gaming experience</li>
            <li>Enable social features and community interactions</li>
            <li>Send important account and service notifications</li>
            <li>Improve our platform and develop new features</li>
            <li>Ensure platform security and prevent abuse</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2>4. Information Sharing</h2>
          <p>We may share your information in the following circumstances:</p>
          
          <h3>4.1 Public Content</h3>
          <p>
            Content you choose to make public (gaming clips, profile information, comments) 
            will be visible to other users and may be shared across the platform.
          </p>

          <h3>4.2 Service Providers</h3>
          <p>
            We work with trusted service providers who help us operate our platform, 
            including cloud hosting, email services, and analytics providers.
          </p>

          <h3>4.3 Legal Requirements</h3>
          <p>
            We may disclose information if required by law, legal process, or to protect 
            the rights, property, or safety of Gamefolio, our users, or others.
          </p>

          <h2>5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal data, including:
          </p>
          <ul>
            <li>Encryption of sensitive data in transit and at rest</li>
            <li>Regular security audits and monitoring</li>
            <li>Access controls and authentication measures</li>
            <li>Secure data storage and backup procedures</li>
          </ul>

          <h2>6. Your Rights and Choices</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access and review your personal data</li>
            <li>Update or correct your information</li>
            <li>Delete your account and associated data</li>
            <li>Control your privacy settings</li>
            <li>Opt out of non-essential communications</li>
            <li>Request data portability</li>
          </ul>

          <h2>7. Cookies and Tracking</h2>
          <p>
            We use cookies and similar technologies to enhance your experience, including:
          </p>
          <ul>
            <li>Essential cookies for platform functionality</li>
            <li>Analytics cookies to understand usage patterns</li>
            <li>Preference cookies to remember your settings</li>
          </ul>
          <p>
            You can control cookie settings through your browser preferences.
          </p>

          <h2>8. Third-Party Services</h2>
          <p>
            Our platform integrates with third-party gaming services (Steam, PlayStation, Xbox, etc.). 
            When you connect these accounts, we may receive information according to their privacy policies 
            and the permissions you grant.
          </p>

          <h2>9. International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than your own. 
            We ensure appropriate safeguards are in place to protect your data during such transfers.
          </p>

          <h2>10. Children's Privacy</h2>
          <p>
            Gamefolio is not intended for children under 13. We do not knowingly collect personal information 
            from children under 13. If we become aware of such collection, we will delete the information immediately.
          </p>

          <h2>11. Data Retention</h2>
          <p>
            We retain your personal data only as long as necessary to provide our services and fulfill legal obligations. 
            When you delete your account, we will delete or anonymize your personal data, except where retention is required by law.
          </p>

          <h2>12. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any material changes 
            by email or through our platform. Your continued use of Gamefolio after changes constitutes acceptance.
          </p>

          <h2>13. Contact Us</h2>
          <p>
            If you have questions about this privacy policy or our data practices, please contact us at:
          </p>
          <ul>
            <li>Email: privacy@gamefolio.com</li>
            <li>Website: www.gamefolio.com</li>
            <li>Address: [Your Company Address]</li>
          </ul>

          <h2>14. Regional Compliance</h2>
          
          <h3>14.1 GDPR (European Union)</h3>
          <p>
            If you are in the EU, you have additional rights under the General Data Protection Regulation, 
            including the right to lodge a complaint with a supervisory authority.
          </p>

          <h3>14.2 CCPA (California)</h3>
          <p>
            California residents have rights under the California Consumer Privacy Act, including the right to 
            know what personal information is collected and the right to delete personal information.
          </p>
        </div>

        <div className="mt-12 p-6 bg-card rounded-lg border">
          <h3 className="text-lg font-semibold mb-2">Privacy Questions?</h3>
          <p className="text-muted-foreground mb-4">
            We're committed to transparency about our data practices. If you have any questions about how we handle your data, 
            please reach out to our privacy team.
          </p>
          <Link href="/contact">
            <Button variant="outline">Contact Privacy Team</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}