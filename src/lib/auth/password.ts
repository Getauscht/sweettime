import bcrypt from 'bcryptjs'

export const PASSWORD_SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(PASSWORD_SALT_ROUNDS)
    return bcrypt.hash(password, salt)
}

export async function verifyPassword(
    password: string,
    hashedPassword: string
): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
}
