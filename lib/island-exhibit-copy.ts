import type { dictionary, Lang } from "@/content/i18n";
import { siteProfile, socialLinks } from "@/content/site";
import { getCvDownloadPath } from "@/lib/cv";
import { projectsData, skillsData } from "@/lib/data";
import type { PortfolioIslandId } from "@/lib/island-map";

export type ExhibitAction = { label: string; href?: string; kind?: "chat" };
export type ExhibitText = {
  title: string;
  eyebrow: string;
  body: string[];
  footer: string;
  actions?: ExhibitAction[];
};
export type ExhibitCopy = Record<string, ExhibitText>;

/** Concise object labels only; long-form cases and biographies belong to semantic HTML. */
export function buildExhibitCopy(t: typeof dictionary.it, lang: Lang): ExhibitCopy {
  const copy: ExhibitCopy = {};
  const add = (island: PortfolioIslandId, index: number, total: number, item: Omit<ExhibitText, "eyebrow">) => {
    copy[`${island}-${index}`] = {
      ...item,
      eyebrow: `${t.game.islands[island].name} / ${String(index + 1).padStart(2, "0")}—${String(total).padStart(2, "0")}`,
    };
  };

  add("about", 0, 1, {
    title: t.archipelago.notebook.title,
    body: [siteProfile.name],
    footer: t.hero.badge,
    actions: [{ label: t.hero.ctaCV, href: getCvDownloadPath(lang) }],
  });

  skillsData.forEach((group, index) => add("skills", index, skillsData.length, {
    title: t.journey.skillNodes[index],
    body: [t.journey.skillDescriptions[index]],
    // A short object caption; all technologies remain in the reader.
    footer: group.skills.slice(0, 4).join(" · "),
  }));

  projectsData.forEach((project, index) => add("projects", index, projectsData.length, {
    title: t.journey.projectNodes[index],
    body: [t.projects.items[index].proof.output],
    footer: project.tags.slice(0, 4).join(" · "),
  }));

  (["bsc", "thesis", "msc"] as const).forEach((key, index) => add("education", index, 3, {
    title: t.journey.educationNodes[index],
    body: [t.game.exhibits.education[index]],
    footer: key === "msc" ? t.education.ongoing : t.education.done,
  }));

  [...t.experience.items].reverse().forEach((item, index) => add("experience", index, 2, {
    title: t.journey.experienceNodes[1 - index],
    body: [t.game.exhibits.experience[index]],
    footer: `${item.date} · ${item.location}`,
  }));

  add("tesla", 0, 2, {
    title: t.archipelago.tesla.model,
    body: [t.archipelago.tesla.year],
    footer: t.archipelago.tesla.vehicle,
  });
  add("tesla", 1, 2, {
    title: t.archipelago.tesla.demo,
    body: [t.archipelago.tesla.demoDescription],
    footer: t.game.islands.tesla.subtitle,
  });
  [t.archipelago.dance.athlete, t.archipelago.dance.teacher].forEach((title, index) => add("dance", index, 2, {
    title,
    body: [t.archipelago.dance.disciplines],
    footer: t.game.islands.dance.subtitle,
  }));

  add("contact", 0, 2, {
    title: siteProfile.email,
    body: [t.game.exhibits.contact],
    footer: t.journey.profile.location,
    actions: [
      { label: t.contact.email, href: `mailto:${siteProfile.email}` },
      { label: t.hero.ctaCV, href: getCvDownloadPath(lang) },
    ],
  });
  add("contact", 1, 2, {
    title: t.journey.ai.label,
    body: [t.journey.aiPrompt],
    footer: t.journey.ai.status,
    actions: [
      { label: t.journey.ai.open, kind: "chat" },
      ...socialLinks.map(({ label, href }) => ({ label, href })),
    ],
  });
  return copy;
}
