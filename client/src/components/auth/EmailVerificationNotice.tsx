import { Mail, CheckCircle2, Clock, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface EmailVerificationNoticeProps {
  email: string;
  displayName: string;
  onClose: () => void;
}

export function EmailVerificationNotice({ email, displayName, onClose }: EmailVerificationNoticeProps) {
  return (
    <Card className="w-full border-primary/20 bg-primary/5">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-xl font-bold text-foreground">
          Welcome to Gamefolio, {displayName}!
        </CardTitle>
        <CardDescription className="text-base">
          Your account has been created successfully. Please check your email to verify your account.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="bg-navy-800/50 rounded-lg p-4 border border-white/10">
          <div className="flex items-center space-x-3 mb-3">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <p className="font-medium text-foreground">Account Created</p>
          </div>
          <p className="text-sm text-muted-foreground ml-8">
            Your Gamefolio account has been successfully created with username: <span className="font-mono text-primary">{displayName}</span>
          </p>
        </div>
        
        <div className="bg-navy-800/50 rounded-lg p-4 border border-white/10">
          <div className="flex items-center space-x-3 mb-3">
            <Clock className="w-5 h-5 text-yellow-400" />
            <p className="font-medium text-foreground">Email Verification Required</p>
          </div>
          <p className="text-sm text-muted-foreground ml-8">
            We've sent a verification email to <span className="font-mono text-primary">{email}</span>. 
            Please click the link in the email to verify your account.
          </p>
        </div>
        
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-amber-500/20 rounded-full flex items-center justify-center mt-0.5">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            </div>
            <div>
              <p className="font-medium text-amber-400 mb-1">Important:</p>
              <p className="text-sm text-amber-300">
                You'll need to verify your email before you can upload clips, screenshots, or interact with content on Gamefolio.
              </p>
            </div>
          </div>
        </div>
        
        <div className="text-center text-sm text-muted-foreground">
          <p>Didn't receive the email? Check your spam folder or contact support.</p>
          <p className="mt-2">The verification link will expire in 24 hours.</p>
        </div>
      </CardContent>
    </Card>
  );
}