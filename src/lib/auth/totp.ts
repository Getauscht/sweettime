import { authenticator } from 'otplib'
import QRCode from 'qrcode'

authenticator.options = {
    window: 1,
}

export function generateTOTPSecret(): string {
    return authenticator.generateSecret()
}

export function verifyTOTP(token: string, secret: string): boolean {
    try {
        return authenticator.verify({ token, secret })
    } catch (error) {
        console.error('Error verifying TOTP:', error)
        return false
    }
}

export async function generateQRCode(email: string, secret: string): Promise<string> {
    const otpauth = authenticator.keyuri(email, 'Sweet Time Scan', secret)
    return QRCode.toDataURL(otpauth)
}
