import type { NextConfig } from "next";

// FIX (CFG-01): added output: 'standalone' so the Dockerfile's
// `COPY --from=builder /app/.next/standalone ./` works.
// FIX (CFG-05): removed typescript.ignoreBuildErrors (was hiding 10+ TS errors).
// FIX (CFG-14): poweredByHeader: false (don't leak "X-Powered-By: Next.js").
// FIX (SEC-06): added security headers (CSP, X-Frame-Options, HSTS, etc.).
const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // FIX: set turbopack.root so Next.js doesn't get confused by the parent
  // bun.lock. Without this, dev server crashes on first request because it
  // resolves the workspace root to /home/z/my-project instead of this dir.
  turbopack: {
    root: __dirname,
  },
  // FIX (CFG-05): do NOT ignore build errors. The repo had 10+ TS errors that
  // were silently shipping to production. They must be fixed, not hidden.
  typescript: {
    ignoreBuildErrors: false,
  },
  // NOTE: the `eslint` block was removed because the NextConfig type in this
  // Next.js version doesn't recognize it, causing a TS build error on Netlify.
  // ESLint is still enforced by the CI workflow (.github/workflows/ci.yml).
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client"],
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  // FIX (SEC-06): security headers applied to all routes.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          // CSP is intentionally permissive for dev (Next.js needs inline eval);
          // tighten for production with nonces once a build pipeline exists.
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
