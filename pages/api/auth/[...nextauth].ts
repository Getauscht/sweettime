/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth, { NextAuthOptions } from "next-auth"
import type { Adapter } from "next-auth/adapters"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import DiscordProvider from "next-auth/providers/discord"
import EmailProvider from "next-auth/providers/email"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { verifyPassword } from "@/lib/auth/password"
import { verifyTOTP } from '@/lib/auth/totp'
import { decryptSecret } from '@/lib/crypto'
import { TOTP_REQUIRED } from '@/lib/auth/constants'
import { sendVerificationEmail } from '@/lib/auth/email'

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma) as Adapter,
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                totpToken: { label: "TOTP Token", type: "text", optional: true },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email e senha são obrigatórios")
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    include: { role: true },
                })

                if (!user || !user.password) {
                    throw new Error("Credenciais inválidas")
                }

                // Check if user must change password - block credential login
                if (user.mustChangePassword) {
                    throw new Error("Sua conta requer troca de senha. Use o botão 'Recuperar senha legada' para receber um link por email.")
                }

                const isValidPassword = await verifyPassword(
                    credentials.password,
                    user.password
                )

                if (!isValidPassword) {
                    throw new Error("Credenciais inválidas")
                }

                // Verificar TOTP se estiver habilitado
                if (user.totpEnabled) {

                    // Only support encrypted TOTP secrets (totpSecretEncrypted)
                    let secretPlain: string | null = null
                    if (user.totpSecretEncrypted) {
                        try {
                            secretPlain = decryptSecret(user.totpSecretEncrypted)
                        } catch {
                            // ignore decrypt errors
                        }
                    }

                    if (!secretPlain) {
                        // No usable TOTP secret available for this account
                        throw new Error(TOTP_REQUIRED)
                    }

                    if (!credentials.totpToken) {
                        throw new Error(TOTP_REQUIRED)
                    }

                    const isValidTOTP = verifyTOTP(credentials.totpToken, secretPlain)
                    if (!isValidTOTP) {
                        throw new Error('Código TOTP inválido')
                    }
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    emailVerified: user.emailVerified,
                }
            },
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID || "",
            clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
        }),
        // Email (magic link) sign-in
        EmailProvider({
            server: {
                host: process.env.EMAIL_SERVER_HOST,
                port: Number(process.env.EMAIL_SERVER_PORT) || undefined,
                auth: {
                    user: process.env.EMAIL_SERVER_USER,
                    pass: process.env.EMAIL_SERVER_PASSWORD,
                },
            },
            from: process.env.EMAIL_FROM || undefined,
            // Use our custom mail helper which expects (email, token)
            async sendVerificationRequest({ identifier, url }) {
                try {
                    // NextAuth passes a full URL which contains the token as a query param named "token"
                    const token = (() => {
                        try {
                            const u = new URL(url)
                            return u.searchParams.get('token') || url
                        } catch {
                            return url
                        }
                    })()

                    await sendVerificationEmail(identifier, token)
                } catch (err) {
                    // Let NextAuth handle/log the error; rethrow for visibility
                    throw err
                }
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/auth/login",
        error: "/auth/error",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.emailVerified = user.emailVerified
                
                // Fetch user's mustChangePassword status
                const dbUser = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: { mustChangePassword: true },
                })
                
                token.mustChangePassword = dbUser?.mustChangePassword || false
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string
                session.user.emailVerified = token.emailVerified as Date | null
                    ; (session.user as any).mustChangePassword = token.mustChangePassword || false
            }
            return session
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)