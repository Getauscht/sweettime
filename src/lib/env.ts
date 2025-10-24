import { z } from 'zod';

/**
 * Runtime validated environment variables.
 *
 * Extend this schema with any required env vars for the project.
 * Keep this file in strict TS mode and avoid `any`.
 */
const envSchema = z
    .object({
        NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
        PORT: z
            .preprocess((val) => {
                if (typeof val === 'string' && val !== '') return Number(val);
                return val;
            }, z.number().int().positive().default(3000)),
        DATABASE_URL: z.string().min(1),
        NEXTAUTH_SECRET: z.string().min(1).optional(), // in prod you might require a longer secret
        NEXT_PUBLIC_BASE_URL: z.string().url().optional(),
    })
    .passthrough(); // allow other env vars to exist without failing

export const validateEnv = () => {
    envSchema.parse(process.env);
}

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);

export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';