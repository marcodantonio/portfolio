import fs from "node:fs";

const checks = [
  ["components/system/spotlight-section.tsx", 'variant?: "default" | "story"'],
  ["components/system/spotlight-section.tsx", "story-section"],
  ["components/site-content.tsx", 'className="story-flow"'],
  ["components/site-content.tsx", 'variant="story"'],
  ["components/about.tsx", "profile-dossier"],
  ["components/education.tsx", "education-radar-stage"],
  ["components/skills.tsx", "skills-machine"],
  ["components/projects-rail.tsx", "projects-cinematic"],
  ["components/experience.tsx", "experience-theatre"],
  ["components/contact.tsx", "contact-command"],
  ["components/intro.tsx", "aria-label=\"Marco D'Antonio\""],
  ["components/projects-rail.tsx", "project-proof"],
  ["content/i18n.ts", "proofLabels"],
  ["app/design-system.css", ".story-flow"],
  ["app/design-system.css", ".story-section"],
  ["app/design-system.css", ".projects-cinematic"],
];

const absentChecks = [
  ["components/site-content.tsx", "CinematicDirector"],
  ["components/site-content.tsx", "SectionGhostNumber"],
  ["components/site-content.tsx", "<Divider"],
  ["components/system/spotlight-section.tsx", 'variant === "chapter"'],
  ["components/system/spotlight-section.tsx", "data-chapter-variant"],
  ["app/design-system.css", ".chapter-section"],
  ["components/about.tsx", "chapter-dossier"],
  ["app/design-system.css", "chapter-dossier"],
  ["components/about.tsx", "eyebrow="],
  ["components/education.tsx", "eyebrow="],
  ["components/skills.tsx", "eyebrow="],
  ["components/projects-rail.tsx", "eyebrow="],
  ["components/experience.tsx", "eyebrow="],
  ["content/i18n.ts", "// 01"],
  ["content/i18n.ts", "// 02"],
  ["content/i18n.ts", "// 03"],
  ["content/i18n.ts", "// 04"],
  ["content/i18n.ts", "// 05"],
  ["content/i18n.ts", "// 06"],
  ["content/i18n.ts", "Software che resta utile"],
  ["content/i18n.ts", "Metodo costruito sul campo"],
  ["content/i18n.ts", "Stack applicato"],
  ["content/i18n.ts", "Casi reali"],
  ["content/i18n.ts", "Dal prototipo alla produzione"],
  ["content/i18n.ts", "Costruiamo"],
  ["content/i18n.ts", "Software that stays useful"],
  ["content/i18n.ts", "Method built in the field"],
  ["content/i18n.ts", "Applied stack"],
  ["content/i18n.ts", "Real cases"],
  ["content/i18n.ts", "From prototype to production"],
  ["content/i18n.ts", "Build something"],
  ["content/generated-cv.ts", "Highly motivated"],
  ["content/generated-cv.ts", "dynamic work environment"],
  ["content/generated-cv.ts", "high-quality results"],
  ["content/generated-cv.ts", "My passion"],
  ["content/generated-cv.ts", "personal playground"],
  ["content/generated-cv.ts", "Excellent communication"],
  ["content/generated-cv.ts", "creative thinking"],
  ["content/generated-cv.ts", "I authorize the processing"],
  ["content/generated-cv.ts", "scalable and web-optimized"],
  ["content/generated-cv.ts", "leverages AI to enhance"],
  ["content/i18n.ts", "scalable solutions"],
  ["lib/data.ts", "scalable solutions"],
  ["content/personai-knowledge.ts", "scalable solutions"],
];

const absentFiles = [
  "components/cinematic-director.tsx",
  "components/section-ghost-number.tsx",
];

let failed = false;

for (const [file, needle] of checks) {
  if (!fs.existsSync(file)) {
    console.error(`Missing file ${file}`);
    failed = true;
    continue;
  }
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(needle)) {
    console.error(`Missing ${needle} in ${file}`);
    failed = true;
  }
}

for (const [file, needle] of absentChecks) {
  const text = fs.readFileSync(file, "utf8");
  if (text.includes(needle)) {
    console.error(`Unexpected ${needle} in ${file}`);
    failed = true;
  }
}

for (const file of absentFiles) {
  if (fs.existsSync(file)) {
    console.error(`Unexpected file ${file}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Narrative flow verified (${checks.length + absentChecks.length} checks).`);
