import { authenticator } from 'otplib';
import QRCode from 'qrcode';

const APP_NAME = 'Gamefolio';

export class TwoFactorService {
  static generateSecret(): string {
    return authenticator.generateSecret();
  }

  static generateKeyUri(email: string, secret: string): string {
    return authenticator.keyuri(email, APP_NAME, secret);
  }

  static async generateQRCode(keyUri: string): Promise<string> {
    return QRCode.toDataURL(keyUri);
  }

  static verifyToken(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch (error) {
      return false;
    }
  }

  static async setupTwoFactor(email: string): Promise<{ secret: string; qrCode: string; keyUri: string }> {
    const secret = this.generateSecret();
    const keyUri = this.generateKeyUri(email, secret);
    const qrCode = await this.generateQRCode(keyUri);
    
    return { secret, qrCode, keyUri };
  }
}
