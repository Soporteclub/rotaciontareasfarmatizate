// Backend Layer - Business logic, domain, and data access
// This directory contains all server-side code that is NOT a Next.js API route.
//
// Structure:
//   domain/         → Pure business entities, types, and the Fairness Engine algorithm
//   application/    → Use-case services and validation schemas
//   infrastructure/ → Database repositories (Prisma), external service adapters
//
// The backend is framework-independent (no React, no Next.js imports).
// API routes in src/app/api/ are thin controllers that delegate to these services.
