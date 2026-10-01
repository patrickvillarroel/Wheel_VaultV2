import { SignJWT } from 'jose';

/**
 * Fabrica tokens para los tests, firmados con el mismo secreto HS256 que usa el
 * entorno de pruebas (ver vitest.config.ts).
 *
 * Permite construir tokens deliberadamente invalidos — caducados, de otro
 * proyecto, con otra audiencia, firmados con otra clave — para comprobar que
 * `requireAuth` los rechaza por el motivo correcto.
 */

const TEST_SECRET = 'secreto-de-pruebas-con-longitud-suficiente-para-hs256';
const ISSUER = 'https://test-project.supabase.co/auth/v1';

export const TEST_USER_ID = '11111111-1111-4111-8111-111111111111';

interface TokenOptions {
  /** `null` emite un token SIN claim `sub`, es decir sin identificar usuario. */
  sub?: string | null;
  email?: string;
  issuer?: string;
  audience?: string;
  expiresIn?: string;
  /** Firmar con otra clave, para simular un token falsificado. */
  secret?: string;
}

export async function signTestToken(options: TokenOptions = {}): Promise<string> {
  const builder = new SignJWT({ email: options.email ?? 'coleccionista@example.test' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(options.issuer ?? ISSUER)
    .setAudience(options.audience ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? '1h');

  const subject = options.sub === undefined ? TEST_USER_ID : options.sub;
  if (subject !== null) {
    builder.setSubject(subject);
  }

  return builder.sign(new TextEncoder().encode(options.secret ?? TEST_SECRET));
}

/** Token ya caducado: se emite y expira en el pasado. */
export async function signExpiredToken(): Promise<string> {
  return new SignJWT({ email: 'coleccionista@example.test' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience('authenticated')
    .setSubject(TEST_USER_ID)
    .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
    .sign(new TextEncoder().encode(TEST_SECRET));
}
