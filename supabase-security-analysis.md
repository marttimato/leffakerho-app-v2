# Supabase Data API Change Analysis

This document evaluates the impact of the upcoming Supabase policy update regarding default table exposure in the `public` schema.

## Executive Summary

**Impact Assessment: NO IMPACT**

Our application is **completely unaffected** by this policy change. No code updates, schema migrations, or permission changes are required to maintain full functionality.

---

## Detailed Analysis

### 1. Are we affected by this change?
**No.** 
The Supabase policy change restricts automatic exposure of tables in the `public` schema through the **Data API** (which includes PostgREST, GraphQL, and the client-side `@supabase/supabase-js` SDK). 

Our application does not use these services. Instead, it connects directly to the underlying PostgreSQL database via standard TCP/IP using the Node.js standard `pg` client library (`Pool`) and a direct PostgreSQL connection string.

### 2. Do any current or planned features rely on automatic exposure?
**No.** 
All current features (movie management, statistics calculation, recommendations carousel, member turn tracking, and TMDB metadata synchronization) are built on top of server-side Next.js API routes (`pages/api/*`). These endpoints connect directly to the database backend. Client-side code only speaks to Next.js API routes, never to the Supabase REST/GraphQL APIs.

### 3. Are migrations already applying the required `GRANT` statements?
**Not required.** 
Our database connections are authenticated via the standard Postgres superuser role (`postgres`). The superuser possesses full database privileges and bypasses standard client-side role grants (`anon` or `authenticated` roles used by the Data API). Thus, no `GRANT` statements are necessary.

### 4. If we create new tables after October 30, 2026, would functionality break?
**No.** 
Any new tables created by future migrations or automatically (e.g., via `setup-db.js`) will continue to be queried directly using raw SQL under the Postgres superuser owner.

### 5. Risk Assessment across features
- **Movie management**: **Zero Risk** (uses direct SQL)
- **Statistics**: **Zero Risk** (calculated entirely in-app and via direct SQL)
- **Leffakaruselli**: **Zero Risk** (recommendation engine runs server-side on Next.js querying direct SQL)
- **Member/turn tracking**: **Zero Risk** (uses direct SQL)
- **TMDB synchronization**: **Zero Risk** (background/on-demand calls executed server-side)

---

## Conclusion

The application is already compliant. The database connection method (direct TCP via standard Postgres pool) is independent of the REST/GraphQL endpoints impacted by this change.
