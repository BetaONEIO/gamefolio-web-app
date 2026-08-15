import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChildSafetyPage() {
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
          <h1 className="text-4xl font-bold text-primary mb-2">Gamefolio Child Safety Standards</h1>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-invert max-w-none">
          <h2>Our Commitment</h2>
          <p>
            Gamefolio has a zero-tolerance policy toward Child Sexual Abuse and Exploitation
            (CSAE) in any form. Gamefolio strictly prohibits the upload, sharing, solicitation,
            promotion, or facilitation of any content or behavior that sexualizes, exploits, or
            endangers minors, on our platform or in connection with our services, regardless of
            whether the content is real, simulated, or computer-generated.
          </p>

          <h2>Age Requirements</h2>
          <p>
            Gamefolio requires all users to be at least 13 years old to create an account. Age is
            collected and verified at registration, and accounts found to belong to users under
            this minimum age are removed.
          </p>

          <h2>Prohibited Content and Behavior</h2>
          <p>Gamefolio strictly prohibits any content or activity on the platform that:</p>
          <ul>
            <li>Depicts, describes, or promotes the sexual abuse or exploitation of minors</li>
            <li>Sexualizes minors in any form, including drawn, animated, or AI-generated imagery</li>
            <li>Solicits sexual content, imagery, or conversations involving minors</li>
            <li>Facilitates or promotes contact with minors for sexual purposes (grooming)</li>
            <li>Advocates for, normalizes, or encourages child sexual abuse in any way</li>
          </ul>

          <h2>Detection and Enforcement</h2>
          <p>
            All content uploaded to Gamefolio passes through automated content filtering before
            publication. Any account or content found to violate this policy is removed
            immediately, the associated account is permanently banned, and — where required by
            law — reported to the National Center for Missing &amp; Exploited Children (NCMEC)
            and/or relevant law enforcement authorities.
          </p>

          <h2>Reporting</h2>
          <p>
            Every piece of content and every user profile on Gamefolio can be reported directly
            in the app. If you encounter content or behavior that you believe violates this
            policy, please use the in-app "Report" option, or contact us directly using the
            details below. Reports involving child safety are treated as our highest priority.
          </p>

          <h2>Child Safety Point of Contact</h2>
          <p>
            Gamefolio's designated point of contact for child safety concerns can be reached at:{" "}
            <a href="mailto:hello@gamefolio.com">hello@gamefolio.com</a>
          </p>

          <h2>Related Policies</h2>
          <p>
            This policy supplements Gamefolio's{" "}
            <Link href="/terms">Terms and Conditions</Link>, which prohibit sexually explicit,
            illegal, and other objectionable content on the platform.
          </p>
        </div>
      </div>
    </div>
  );
}
