export interface PasswordRequirements {
  length: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
}

export const validatePassword = (password: string): PasswordRequirements => {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };
};

export const isPasswordValid = (requirements: PasswordRequirements): boolean => {
  return requirements.length && requirements.uppercase && requirements.number && requirements.special;
};

export const getPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  const requirements = validatePassword(password);
  const metRequirements = Object.values(requirements).filter(Boolean).length;
  
  if (metRequirements < 2) return 'weak';
  if (metRequirements < 4) return 'medium';
  return 'strong';
};