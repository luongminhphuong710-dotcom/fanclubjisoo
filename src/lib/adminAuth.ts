import crypto from "node:crypto";

const COOKIE_NAME = "jisoo_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function adminEmail() {
  return process.env.ADMIN_EMAIL ?? (process.env.NODE_ENV === "production" ? "" : "admin@jisoo.local");
}

function adminPassword() {
  return process.env.ADMIN_PASSWORD ?? (process.env.NODE_ENV === "production" ? "" : "Mia@2026!");
}

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? adminPassword() ?? "local-admin-secret";
}

function sign(value: string) {
  return crypto.createHmac("sha256", sessionSecret()).update(value).digest("hex");
}

function parseCookies(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  return new Map(
    cookie
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [key, ...rest] = item.split("=");
        return [key, decodeURIComponent(rest.join("="))] as const;
      })
  );
}

export function getAdminCredentials() {
  return {
    email: adminEmail(),
    configured: Boolean(adminEmail() && adminPassword())
  };
}

export function verifyAdminCredentials(email: string, password: string) {
  const expectedEmail = adminEmail();
  const expectedPassword = adminPassword();

  return Boolean(
    expectedEmail &&
      expectedPassword &&
      email.trim().toLowerCase() === expectedEmail.toLowerCase() &&
      password === expectedPassword
  );
}

export function createAdminCookie() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${adminEmail()}|${expiresAt}`;
  const token = `${payload}|${sign(payload)}`;

  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearAdminCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function isAdminRequest(request: Request) {
  const token = parseCookies(request).get(COOKIE_NAME);
  if (!token) {
    return false;
  }

  const [email, expiresText, signature] = token.split("|");
  const expiresAt = Number(expiresText);
  const payload = `${email}|${expiresText}`;

  if (!email || !expiresAt || !signature || expiresAt < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expectedSignature = sign(payload);
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  return email === adminEmail() && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
