# Vega

Experimento en fase beta: lecturas astrológicas generadas con IA a partir de datos de nacimiento introducidos por el propio usuario (Segmento A, lectura individual) o de una segunda persona (Segmento B, sinastría/compatibilidad).

## Stack principal

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + DaisyUI v5
- Supabase (Postgres, vía `supabase-js`)
- OpenAI (Responses API) para la generación de las interpretaciones
- Railway (`vega-api`) para el cálculo de la evidencia astrológica
- PostHog (EU/Frankfurt) para analítica de producto
- Resend para email transaccional
- Stripe (andamiaje de pagos; en esta fase no hay cobros reales — ver `app/tos/page.tsx`)

## Desarrollo

```bash
npm install
npm run dev
```

## Comandos

```bash
npm run typecheck   # tsc --noEmit
npm run test         # vitest run
npm run e2e          # playwright test
npm run build        # next build + generación de sitemap (next-sitemap)
```

## Variables de entorno

Copia `.env.example` a `.env.local` y rellena los valores (nunca commitees secretos reales). Entre las más relevantes:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`, `RESEND_FROM_NO_REPLY`, `RESEND_FROM_ADMIN`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- `VEGA_API_BASE_URL`, `SONDA19_INTERNAL_EVIDENCE_TOKEN`
- `EXPERIMENT_SESSION_SECRET`
- **`SITE_URL`** — obligatoria para `npm run build` en producción (metadata/SEO y sitemap). Sin ella, el build falla explícitamente; no hay ningún dominio por defecto.

Ver `.env.example` para el listado completo y comentado.

## Estado del experimento

`EXPERIMENT_ACCEPTING_REAL_TRAFFIC` (`libs/experiment/constants.ts`) permanece en `false` mientras no se complete la puesta en marcha legal/operativa (ver `documentacion/VEGA_Checklist_Puesta_Marcha_Legal_Post_Sociedad_v1.md`). Hasta entonces, el experimento solo acepta tráfico de prueba (`?test=1`).

## Documentación

Ver `documentacion/` para las guías técnicas y el historial de decisiones de arquitectura/privacidad del experimento.
