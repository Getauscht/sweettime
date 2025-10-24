import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            emailVerified: Date | null
            role?: {
                id: string
                name: string
            }
        } & DefaultSession["user"]
    }

    interface User extends DefaultUser {
        emailVerified: Date | null
        role?: {
            id: string
            name: string
        }
    }
}

declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        id: string
        emailVerified: Date | null
        role?: {
            id: string
            name: string
        }
    }
}
