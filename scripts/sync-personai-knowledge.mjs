import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFParse } from "pdf-parse";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const fallbackPdfPath = path.join(rootDir, "public", "MarcoDAntonioCV.pdf");
const cvSourceUrl = "https://raw.githubusercontent.com/marcodantonio/curriculum/main/dist/single-column/cv-en.pdf";
const outputPath = path.join(rootDir, "content", "generated-cv.ts");

function normalizeText(text) {
  return text
    .replace(/Cell:\s*\+?[0-9 ][0-9 ]+\s*/gi, "Cell: [redacted] ")
    .replace(/\+39\s*\d(?:[\s.-]*\d){8,}/g, "[phone redacted]")
    .replace(/Highly motivated[\s\S]*?adapting to new technologies\.\s*/i, "")
    .replace(/Implementation of\s*scalable and web-optimized solutions\.\s*/i, "")
    .replace(/application that leverages AI to enhance and power the model/gi, "application connected to the trained model")
    .replace(/My passion for networks[\s\S]*?research and development\./i, "I maintain a homelab for network, systems, and infrastructure experiments.")
    .replace(/SKILLS:\s*Excellent communication[\s\S]*?creative thinking\.\s*/i, "")
    .replace(/I authorize the processing[\s\S]*$/i, "")
    .replace(/\n--\s*\d+\s+of\s+\d+\s*--\s*$/i, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function main() {
  let data;

  try {
    const response = await fetch(cvSourceUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Remote CV fetch failed with ${response.status} ${response.statusText}`);
    }
    data = Buffer.from(await response.arrayBuffer());
    console.log("Fetched CV PDF from remote curriculum repo.");
  } catch (error) {
    console.warn(`Remote CV fetch failed, falling back to local PDF: ${error instanceof Error ? error.message : String(error)}`);
    data = await readFile(fallbackPdfPath);
  }

  const parser = new PDFParse({ data });

  try {
    const result = await parser.getText();
    const normalizedText = normalizeText(result.text || "");
    const fileContents = `export const generatedCvText = ${JSON.stringify(
      normalizedText
    )};\n`;

    await writeFile(outputPath, fileContents, "utf8");

    console.log(`Generated ${path.relative(rootDir, outputPath)} from CV PDF source.`);
  } finally {
    await parser.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
