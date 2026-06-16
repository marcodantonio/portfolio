# personAI

## Product intent

personAI is a chat widget in the hero section. It answers questions about Marco for recruiters, collaborators, and visitors — not a technical AI demo.

The user-facing promise: ask anything about Marco's experience, skills, projects, or availability.

## UX rules

- Speak in third person about Marco ("Marco has...", "He worked on...")
- Never address the user as "Marco"
- Keep the tone factual and concise
- No technical AI jargon in UI copy
- Prefer example chips over system claims

## Technical implementation

- **Widget**: `components/hero-mini-chat.tsx` — embedded in the hero section
- **API route**: `app/api/personai/route.ts` — validates input, calls `answerPersonAIQuestion`
- **Runtime logic**: `lib/personai.ts` — RAG retrieval + prompt + Workers AI call
- **CF binding helper**: `lib/cloudflare.ts` — `getCloudflareContext()` for AI binding
- **Knowledge corpus**: `content/knowledge/base.ts`, `content/knowledge/generated-cv.ts`

## RAG architecture (no vectors)

1. Knowledge documents compiled at build-time from `lib/data.ts` + `content/knowledge/`
2. Documents chunked (780 chars, 120 overlap)
3. Keyword-based scoring: token overlap between question and chunks
4. Top-4 chunks selected as context
5. Prompt built with `messages` format (system + user) + `response_format: { type: "json_schema" }`
6. Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct`) returns `{ "answer": "..." }`
7. JSON parsed with fallback to raw text

## Language

Language is passed explicitly from the UI (`lang: "it" | "en"`) to the API, then injected into the system message as `"You MUST respond in Italian/English"`. Uses `messages` format for reliable instruction-following.

## Knowledge sources

- `content/knowledge/base.ts` — placeholder for additional documents
- `content/knowledge/generated-cv.ts` — CV text (update when CV changes)
- `portfolioDocuments` in `lib/personai.ts` — built at runtime from `lib/data.ts` (projects, skills, experiences, profile)

## Update flow

When content changes (CV, projects, bio):

1. Update `lib/data.ts` or `content/knowledge/generated-cv.ts`
2. Run: `npm run lint && npm run build`
3. redeploy: `npm run deploy`

## Model

Fixed: `@cf/meta/llama-3.1-8b-instruct`

The model is intentionally pinned to keep answers stable across deploys.
