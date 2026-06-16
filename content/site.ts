import { heroFacts, experiencesData, projectsData, skillsData } from "@/lib/data";

export const siteProfile = {
  name: "Marco D'Antonio",
  location: heroFacts[0].value,
  headline: "Software developer",
  subheadline: "AI, infrastructure, product-minded",
  availability: "Open to opportunities",
  email: "me@marcodantonio.it",
};

// Public site key for Cloudflare Turnstile. This is safe to ship to the client.
export const turnstileSiteKey = "0x4AAAAAAAHDJccxT4ArHOdv";

export const socialLinks = [
  { href: "https://linkedin.com/in/marcodantonio00", label: "LinkedIn" },
  { href: "https://github.com/marcodantonio", label: "GitHub" },
];

export const experienceEntries = experiencesData;
export const projects = projectsData;

export const skillGroups = skillsData.map((g) => ({
  title: g.category,
  description: "",
  items: g.skills.map((s) => s),
}));

const siteData = {
  siteProfile,
  socialLinks,
  experienceEntries,
  projects,
  skillGroups,
};

export default siteData;
