# Data Stories — AI-powered SEO blog generator

A Nuxt 4 / Vue 3 / TypeScript assessment solution for turning company CSV datasets into SEO-friendly, server-rendered industry articles. Built to demonstrate robust data processing, usable interfaces, automated AI writing and template reuse without a heavyweight backend.

> **Official dataset available:** `examples/OFFICIAL_fintech_companies_seed.csv` is the complete official **100-company CSV** supplied by the user. It is a **CSV upload fixture, not a hardcoded article**. Generate the page by uploading it through `/upload`; the application's parsing, statistics and rendering remain generic for any supported CSV schema. The partial 27-row source and the fictional demonstration CSVs remain clearly separated.

## Requirements and acceptance checklist

- [x] Nuxt.js + responsive blog and upload UI
- [x] Dynamic server-rendered article routes with titles, descriptions, OG tags, canonical URLs, article JSON-LD and sitemap
- [x] Complete ranking table for each uploaded dataset (up to 2,000 rows)
- [x] Deterministic fundraising totals, average, median, extremes, top-ten percentage
- [x] CSV validation, preview, column auto-detection and manual mapping
- [x] Google Gemini and local Ollama backends; validated structured AI copy
- [x] Server-side saving; generated pages survive refresh on persistent Node host
- [x] Unit tests for CSV parsing and numerical analysis
- [x] Include the 27 authentic rows provided by the user as a CSV fixture for testing the real upload pipeline
- [x] Include the complete official 100-row Beauhurst CSV as an upload fixture and add source-data regression tests
- [ ] Run npm install / tests / typecheck / production build (environment network unavailable)
- [ ] Deploy live and verify external URL (needs hosting credentials)

## Requirements

- Node.js 22+
- npm
- Gemini API key (free-tier availability subject to provider conditions) **or** locally running Ollama with a pulled model
- Persistent writable filesystem for generated articles

## Start locally

```bash
npm install
cp .env.example .env
# Edit .env and add your own NUXT_GEMINI_API_KEY
npm run dev
```

Visit `http://localhost:3000`, select **Create an article**, and upload `examples/OFFICIAL_fintech_companies_seed.csv`. Enter `Fintech`, set currency to `GBP` if all source amounts are pounds, verify column mapping, and generate the article. Import `examples/DEMO_ONLY_healthtech.csv` to demonstrate that the same system works with a new industry. These demo files are fictional and are provided only for development.

For Ollama:

```bash
ollama pull llama3.2
ollama serve
```

Set `NUXT_AI_PROVIDER=ollama` and `NUXT_OLLAMA_MODEL=llama3.2`. Ollama must run on localhost on the same host as the Nuxt server. Optionally set `NUXT_AI_PROVIDER=template` to develop the upload/publishing flow offline; **this mode is deterministic template copy, not AI-generated copy**, and should not be used as evidence of AI functionality.

## Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run preview
```

Verify SSR: after publishing, use `curl -s http://localhost:3000/blog/YOUR_SLUG` and check that the HTML contains the heading and entire ranking table (not just a client-side loading shell). Open the page directly and reload it. Do not call the solution tested until the commands actually complete successfully.

## Application structure

- `app/pages/index.vue`: article index and empty-state CTA.
- `app/pages/upload.vue`: CSV selection, preview, mapping and generation form.
- `app/pages/blog/[slug].vue`: reusable SSR article template and ranking table.
- `server/api/inspect.post.ts`: upload preview and suggested column mappings.
- `server/api/generate.post.ts`: validation → normalization → stats → AI → persistence.
- `server/api/blogs/`: article retrieval/index.
- `server/utils/dataset.ts`: deterministic parsing and data analysis.
- `server/utils/content.ts`: Gemini/Ollama integrations, strict structured-output validation.
- `server/utils/storage.ts`: JSON persistence.
- `shared/domain.ts`: Zod schemas and TypeScript types.
- `tests/dataset.test.ts`: essential parsing/math tests.

## Important design decisions

**Statistics never come from AI.** Ranking and numeric summaries are calculated in TypeScript; Gemini/Ollama only describes verified facts. The LLM sees aggregate statistics and the top 20 entries, never the whole dataset. Its response is validated with Zod. Failed model calls do not create an article.

**Flexible column mapping.** CSV headers may vary across industries. The upload flow proposes matches and lets a user manually select the mandatory company-name and fundraising columns; optional columns can be omitted.

**Plain-text model output.** Article paragraphs are rendered as escaped Vue text, never arbitrary model-produced HTML. API keys remain server-side.

**Persistence trade-off.** Each generated article is a JSON document on the server filesystem; this is deliberately lightweight and suited to a single persistent Node.js host. It is **not reliable for ephemeral/serverless hosts**. Use a persistent volume or replace `server/utils/storage.ts` with an appropriate database adapter when deploying to serverless. Do not deploy as a purely static site. Article URLs include random IDs to avoid conflicts.

**Currency requirement.** All financial amounts in an uploaded file must be expressed in one currency, selected by the user. The program does not perform FX conversion. Records with missing or invalid mandatory data are rejected with row-specific errors rather than silently changed. Source rank is retained as optional metadata; ranking is recalculated by fundraising because that is the assessment's requested ordering.

**Scope limitations.** No auth or publicly exposed quota management is included; the generate endpoint should remain limited to a trusted assessment environment or protected before public exposure. Storage is intentionally not a multi-node transactional database. Gemini free-tier rate limits and model availability can change. No assertion is made that the code is error-free without a successful local build/test run.

## Suggested live interview demo (3–5 minutes)

1. Open the home page, then an existing fintech article generated from the **real** Beauhurst CSV.
2. Show the article title, metadata in View Source, summary stats and all 100 rows.
3. Navigate to the upload interface and select a second-industry CSV.
4. Confirm automatically proposed column mapping, correct it if needed, enter the new industry, generate.
5. Open the new route, compare its title, data and stats, then refresh.
6. Show the same `app/pages/blog/[slug].vue` template and `server/utils/dataset.ts` implementation.
7. Explain trade-offs: numeric truth calculated by TypeScript, AI responsible only for narrative, persistent JSON chosen for assessment simplicity.

## Supplied data and completeness

The complete official 100-company CSV is now at `examples/OFFICIAL_fintech_companies_seed.csv`. Original rows 1–27 were also preserved in `examples/BEAUHURST_USER_PROVIDED_FIRST_27.csv` (including columns not used by the current statistics engine). The application does not publish any preloaded article: upload this CSV through the same interface used for every other industry. It should display **27**, never **100**. Upload `examples/OFFICIAL_fintech_companies_seed.csv` to generate the full 100-company article; the code does not cap the ranking at 27. Neither CSV file is pre-generated into a blog.

## Independent senior code review (2026-10-28)

- Source of truth: **CSV upload**. The previously bundled pre-generated JSON article has been removed. A reviewer can upload `examples/BEAUHURST_USER_PROVIDED_FIRST_27.csv` and use the exact same workflow as any other CSV.
- The complete official CSV has now been supplied and bundled; generation of the actual article through the upload flow still requires a configured AI provider and a running Nuxt app.
- Parsing and financial statistics are deterministic; AI only writes narrative based on derived statistics.
- The mapper uses company name and fundraising as required fields; source Region/Description/Website/Rank/Stage/Employees/Industries are mapped and preserved in article JSON. Stage and Employees are shown in the table; Industries is retained in data for subsequent analysis and used as model context where applicable.
- Limitations needing further verification: dependency installation, type-check, lint, tests, production SSR and real Gemini/Ollama execution have **not** been executed successfully in this authoring environment. Runtime success is not certified.
- Security: upload size is currently checked after multipart parsing; an upstream request-body limit and rate limiting are needed before exposing the generation endpoint publicly.
- Persistence is local JSON suitable only for a single writable persistent Node host; no serverless deployment claim should be made.


## Assessment compliance review and fixes — 28 October 2026

| PDF criterion | Status | Evidence / remaining action |
|---|---|---|
| Nuxt required | Implemented, not runtime verified | `nuxt.config.ts`, `app/pages` |
| SSR blog content and dynamic metadata | Implemented, not runtime verified | `app/pages/blog/[slug].vue`, `useFetch`, `useSeoMeta`, canonical, JSON-LD |
| All 100 original fintech companies | **Full CSV now supplied; page generation unverified** | `examples/OFFICIAL_fintech_companies_seed.csv` contains 100 records; upload it to create the article |
| Dataset statistics | Implemented, not runtime verified | `server/utils/dataset.ts` deterministic calculations |
| CSV upload & industry-independent processing | Implemented, not runtime verified | `/api/inspect`, `/api/generate`, UI column mapping |
| Genuine LLM copy | Implemented, external API unverified | Gemini and Ollama, structured content schema; `template` mode is explicitly not AI |
| New page without rebuilding | Implemented, not runtime verified | persisted JSON + dynamic `[slug].vue` |
| README, GitHub, live demo | README present; GitHub/demo pending user environment | Cannot publish to the user's GitHub or perform their interview from this source package |

The revised mapper preserves `Stage`, `Employees`, and `Industries` as optional typed fields; it rejects duplicate column assignments. The ranking UI displays stage and employee range when present. Model prompting uses the actual dataset summary and verified records and does not substitute a hardcoded fintech article.

**Unverified quality gates:** `npm install`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, live LLM generation, and HTTP-level SSR test. `npm install` failed in the creation environment with `EAI_AGAIN` (npm registry DNS unavailable). The ZIP is deliverable source, not a certified successful build.


## Official complete CSV verification (supplied subsequently)

The official `fintech_companies_seed.csv` has now been copied **unchanged** into `examples/OFFICIAL_fintech_companies_seed.csv`. Independent Python CSV checks (not Nuxt runtime tests) found:

- Exactly **100** data records and nine expected columns.
- Source ranks are unique, contiguous from **1 through 100**, and amounts descend monotonically.
- **No duplicate company names** and **no missing fundraising figures**.
- Total fundraising **£622,301,270**; mean **£6,223,012.70**; median **£4,146,786**.
- **78** companies list **London** as their region; **3** employee entries are `N/A`.
- Top ten account for approximately **33.00%** of the listed total.
- Added two Vitest cases to check parsing and deterministic stats from the real CSV. They are not claimed to have passed until `npm run test` has executed successfully.

To validate end-to-end, upload `examples/OFFICIAL_fintech_companies_seed.csv` using the site's `/upload` route, select `Fintech` and `GBP`, then confirm 100 rows in the new article. The CSV is never imported into application runtime code; it is accessed only when explicitly uploaded.


## October 2026 engineering-review fixes

- The source CSV is the only authority for company records; no company entries are hardcoded into the application.
- When a complete, unique source `Rank` column is mapped, source ordering and rank labels are preserved. Otherwise ranking is derived deterministically from fundraising.
- Financial totals are summed in integer pence/cents (after validation to two decimal places).
- AI requests retry up to twice only for temporary transport/server/rate-limit failures; permanent input, schema and credential errors are not retried.
- Model-generated article money claims are checked against the provided source numbers. **This is a limited guard, not a guarantee of semantic factual accuracy.** A human should review generated prose before public publication.
- Upload endpoints inspect declared Content-Length before multipart parsing; deploy behind a reverse proxy with a hard request-body cap, as clients can omit Content-Length.
- The interface distinguishes generation from opening the completed article.
- Automated tests include source rank, duplicate/incomplete ranks and decimal sums.

**Verification limitation:** The runtime environment used to assemble this archive could not reach npm (`EAI_AGAIN`); therefore dependency installation, linting, unit tests, production build and browser/AI integration must be executed locally before submission. JSON persistence is for a persistent single-node environment, not an ephemeral serverless host.
