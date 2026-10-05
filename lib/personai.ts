import {
  experienceEntries,
  projects,
  siteProfile,
  skillGroups,
  socialLinks,
} from "@/content/site";
import { baseKnowledgeDocuments } from "@/content/knowledge/base";
import type { KnowledgeDocument } from "@/content/knowledge/types";
import { generatedCvDocument } from "@/content/knowledge/generated-cv";
import {
  getCloudflareRuntimeEnv,
  readWorkersAIResponse,
  type WorkersAIResult,
} from "@/lib/cloudflare";

type KnowledgeChunk = {
  id: string;
  title: string;
  text: string;
  score: number;
};

type PersonAIAnswer = {
  answer: string;
  provider: "workers-ai";
  model: string;
  sources: string[];
};

// The non-fast Llama 3.1 8B endpoint was retired by Workers AI on 2026-05-30.
// This active variant preserves the existing messages + JSON Mode contract.
const DEFAULT_WORKERS_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const DEFAULT_WORKERS_AI_MAX_TOKENS = 700;
const DEFAULT_WORKERS_AI_TEMPERATURE = 0.2;

const portfolioDocuments: KnowledgeDocument[] = [
  {
    id: "portfolio-profile",
    title: "Portfolio Profile",
    origin: "portfolio",
    tags: ["profile", "contact", "availability"],
    content: [
      `${siteProfile.name} is based in ${siteProfile.location}.`,
      `Headline: ${siteProfile.headline}`,
      `Subheadline: ${siteProfile.subheadline}`,
      `Availability: ${siteProfile.availability}`,
      `Contact email: ${siteProfile.email}`,
      ...socialLinks.map((link) => `${link.label}: ${link.href}`),
    ].join("\n"),
  },
  {
    id: "portfolio-projects",
    title: "Portfolio Projects",
    origin: "portfolio",
    tags: ["projects", "ai", "web"],
    content: projects
      .map((project) => `${project.title}
Summary: ${project.description}
Role: ${project.role}
Output: ${project.output}
Stack: ${project.tags?.join(", ") ?? ""}`)
      .join("\n\n"),
  },
  {
    id: "portfolio-experience",
    title: "Portfolio Experience",
    origin: "portfolio",
    tags: ["experience", "education", "internship"],
    content: experienceEntries
      .map((entry) => `${entry.title} | ${entry.location} | ${entry.date}
${entry.description}`)
      .join("\n\n"),
  },
  {
    id: "portfolio-skills",
    title: "Portfolio Skills",
    origin: "portfolio",
    tags: ["skills", "stack", "technologies"],
    content: skillGroups
      .map(
        (group) =>
          `${group.title}\n${group.description}\nSkills: ${group.items.join(", ")}`
      )
      .join("\n\n"),
  },
];

const knowledgeDocuments = [
  ...baseKnowledgeDocuments,
  ...portfolioDocuments,
  generatedCvDocument,
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueTokens(value: string) {
  return Array.from(new Set(normalizeText(value).split(" ").filter((token) => token.length > 2)));
}

function createChunks(document: KnowledgeDocument) {
  const chunkSize = 780;
  const overlap = 120;
  const chunks: KnowledgeChunk[] = [];

  for (let start = 0; start < document.content.length; start += chunkSize - overlap) {
    const text = document.content.slice(start, start + chunkSize).trim();

    if (!text) {
      continue;
    }

    chunks.push({
      id: `${document.id}-${start}`,
      title: document.title,
      text,
      score: 0,
    });
  }

  return chunks;
}

function getRelevantChunks(question: string) {
  const questionTokens = uniqueTokens(question);

  return knowledgeDocuments
    .flatMap(createChunks)
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(questionTokens, chunk),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);
}

function scoreChunk(questionTokens: string[], chunk: KnowledgeChunk) {
  const normalizedChunk = normalizeText(chunk.text);
  let score = 0;

  for (const token of questionTokens) {
    if (normalizedChunk.includes(token)) {
      score += token.length > 6 ? 3 : 2;
    }
  }

  if (normalizeText(chunk.title).includes(questionTokens[0] ?? "")) {
    score += 1;
  }

  return score;
}

// The structured shape we expect from the model.
type PersonAIResponse = { answer: string };

const LANG_LABEL: Record<string, string> = {
  it: "Italian",
  en: "English",
};

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function buildMessages(question: string, chunks: KnowledgeChunk[], lang: string): ChatMessage[] {
  const context = chunks
    .map((chunk, i) => `[${i + 1}] ${chunk.title}\n${chunk.text}`)
    .join("\n\n");

  const language = LANG_LABEL[lang] ?? "Italian";

  const system = [
    "You are Marco.AI, a digital assistant on Marco D'Antonio's portfolio website.",
    "You are speaking with recruiters, collaborators, and visitors who want to learn about Marco.",
    "",
    "Rules (follow strictly):",
    "- Always refer to Marco in the third person ('Marco has...', 'He worked on...').",
    "- Never address the user as 'Marco'. Never speak as if you are Marco.",
    "- Only use facts from the context below. Do not invent anything.",
    "- If the context is insufficient, say so briefly.",
    "- Use concrete facts: roles, dates, stack, outputs, and constraints.",
    "- Avoid motivational, promotional, or generic resume wording.",
    "- Never provide phone numbers. Use the public email address when contact is relevant.",
    "- Keep answers concise and easy to scan. Use bullet points for multiple items.",
    "- Do not mention being an AI, model, or assistant.",
    `- You MUST respond in ${language}. This is mandatory.`,
    "",
    "Output format: respond with a JSON object matching this schema exactly:",
    '{ "answer": "<your response here>" }',
    "",
    "Context about Marco:",
    context,
  ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: question },
  ];
}

function parseStructuredResponse(raw: string): string {
  // 1. Standard JSON parse — expected path with json_schema structured output.
  try {
    const parsed = JSON.parse(raw) as Partial<PersonAIResponse>;
    if (typeof parsed.answer === "string" && parsed.answer.trim()) {
      return parsed.answer.trim();
    }
  } catch { /* fall through */ }

  // 2. Truncated JSON — max_tokens cut the response mid-string.
  //    Extract everything after "answer": " and unescape JSON sequences.
  const truncated = raw.match(/"answer"\s*:\s*"([\s\S]+)/);
  if (truncated) {
    let text = truncated[1];
    text = text.replace(/"\s*\}?\s*$/, "")
               .replace(/\\n/g, "\n")
               .replace(/\\t/g, "\t")
               .replace(/\\"/g, '"')
               .replace(/\\\\/g, "\\");
    if (text.trim()) return text.trim();
  }

  // 3. Last resort: raw text (e.g. plain-text response without JSON wrapper).
  return raw.trim();
}

export function getPersonAIKnowledgeSources() {
  return knowledgeDocuments.map((document) => ({
    id: document.id,
    title: document.title,
    origin: document.origin,
  }));
}

export async function answerPersonAIQuestion(question: string, lang = "it"): Promise<PersonAIAnswer> {
  const chunks = getRelevantChunks(question);
  const sources = Array.from(new Set(chunks.map((chunk) => chunk.title)));
  const { AI } = await getCloudflareRuntimeEnv();

  if (!AI) {
    throw new Error(
      "Cloudflare AI binding not available. " +
      "Use `npm run preview` to test personAI locally with full CF Workers bindings."
    );
  }

  const model = DEFAULT_WORKERS_AI_MODEL;
  const messages = buildMessages(question, chunks, lang);

  // Cloudflare Workers AI uses "json_schema" (not "json_object") for structured output.
  const result = (await AI.run(model, {
    messages,
    max_tokens: DEFAULT_WORKERS_AI_MAX_TOKENS,
    temperature: DEFAULT_WORKERS_AI_TEMPERATURE,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "PersonAIResponse",
        schema: {
          type: "object",
          properties: {
            answer: { type: "string", description: "The response to the user's question about Marco." },
          },
          required: ["answer"],
          additionalProperties: false,
        },
      },
    },
  })) as WorkersAIResult | string;

  const answer = parseStructuredResponse(readWorkersAIResponse(result));

  return {
    answer,
    provider: "workers-ai",
    model,
    sources,
  };
}
