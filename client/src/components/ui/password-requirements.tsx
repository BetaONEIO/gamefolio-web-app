import { PasswordRequirements } from "@/lib/password-validation";

interface PasswordRequirementsDisplayProps {
  requirements: PasswordRequirements;
  accentColor?: string;
}

export function PasswordRequirementsDisplay({ requirements, accentColor = "#10b981" }: PasswordRequirementsDisplayProps) {
  const getCheckIcon = (met: boolean) => met ? '✓' : '○';
  const getColor = (met: boolean) => met ? accentColor : 'rgb(107 114 128)'; // text-muted-foreground

  return (
    <div className="space-y-1 text-xs mt-2">
      <div className="flex items-center gap-2">
        <span style={{ color: getColor(requirements.length) }}>
          {getCheckIcon(requirements.length)}
        </span>
        <span style={{ color: getColor(requirements.length) }}>
          At least 8 characters
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <span style={{ color: getColor(requirements.uppercase) }}>
          {getCheckIcon(requirements.uppercase)}
        </span>
        <span style={{ color: getColor(requirements.uppercase) }}>
          One uppercase letter
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <span style={{ color: getColor(requirements.number) }}>
          {getCheckIcon(requirements.number)}
        </span>
        <span style={{ color: getColor(requirements.number) }}>
          One number
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <span style={{ color: getColor(requirements.special) }}>
          {getCheckIcon(requirements.special)}
        </span>
        <span style={{ color: getColor(requirements.special) }}>
          One special character (!@#$%^&*)
        </span>
      </div>
    </div>
  );
}