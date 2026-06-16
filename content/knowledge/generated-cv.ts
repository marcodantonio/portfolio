import { generatedCvText } from "@/content/generated-cv";
import type { KnowledgeDocument } from "./types";

export const generatedCvDocument: KnowledgeDocument = {
  id: "generated-cv",
  title: "Generated CV",
  origin: "generated",
  tags: ["cv", "bio"],
  content: generatedCvText,
};

export default generatedCvDocument;
