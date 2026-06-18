import fs from "node:fs";

const checks = [
  ["components/system/spotlight-section.tsx", 'variant?: "default" | "chapter"'],
  ["components/system/spotlight-section.tsx", "data-chapter-variant"],
  ["components/site-content.tsx", 'variant="chapter"'],
  ["components/intro.tsx", "hero-stage"],
  ["components/about.tsx", "chapter-dossier"],
  ["components/education.tsx", "education-radar-stage"],
  ["components/skills.tsx", "skills-machine"],
  ["components/projects-rail.tsx", "projects-cinematic"],
  ["components/experience.tsx", "experience-theatre"],
  ["components/contact.tsx", "contact-command"],
  ["app/design-system.css", ".chapter-section"],
  ["app/design-system.css", ".projects-cinematic"],
];

let failed = false;

for (const [file, needle] of checks) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(needle)) {
    console.error(`Missing ${needle} in ${file}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Cinematic chapter hooks verified (${checks.length} checks).`);
