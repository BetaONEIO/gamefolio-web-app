import emailjs from '@emailjs/browser';

// EmailJS configuration
const EMAILJS_SERVICE_ID = 'service_flqrdur';
const EMAILJS_USER_ID = 'y5CsgEYhZQtOpVrPF';
const VERIFICATION_TEMPLATE_ID = 'template_kx85b0y';
const PASSWORD_RESET_TEMPLATE_ID = 'gamefolioResetPassword';

/**
 * Initialize EmailJS with the user ID
 */
export const initEmailJS = () => {
  if (EMAILJS_USER_ID) {
    emailjs.init(EMAILJS_USER_ID);
  }
};

/**
 * Send an email verification link to the user
 * @param email - The user's email address
 * @param name - The user's display name
 * @param token - The verification token
 * @returns A promise that resolves to true if the email was sent successfully
 */
export const sendVerificationEmail = async (
  email: string,
  name: string,
  token: string
): Promise<boolean> => {
  try {
    // Build the verification URL with the token
    const verificationUrl = `${window.location.origin}/verify-email?token=${token}`;
    
    // Prepare the template parameters
    const templateParams = {
      to_email: email,
      to_name: name,
      verification_link: verificationUrl,
    };
    
    // Send the email
    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      VERIFICATION_TEMPLATE_ID,
      templateParams,
      EMAILJS_USER_ID
    );
    
    return result.status === 200;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
};

/**
 * Send a password reset link to the user
 * @param email - The user's email address
 * @param name - The user's display name
 * @param token - The reset token
 * @returns A promise that resolves to true if the email was sent successfully
 */
export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  token: string
): Promise<boolean> => {
  try {
    // Build the reset URL with the token
    const resetUrl = `${window.location.origin}/reset-password?token=${token}`;
    
    // Prepare the template parameters
    const templateParams = {
      to_email: email,
      to_name: name,
      reset_link: resetUrl,
    };
    
    // Send the email
    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      PASSWORD_RESET_TEMPLATE_ID,
      templateParams,
      EMAILJS_USER_ID
    );
    
    return result.status === 200;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};