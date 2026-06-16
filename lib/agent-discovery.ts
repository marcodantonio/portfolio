const SITE_URL = "https://marcodantonio.it";

function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export const agentDiscoveryLinks = {
  apiCatalog: "/.well-known/api-catalog",
  serviceDoc: "/docs/api",
  securityTxt: "/security.txt",
  robotsTxt: "/robots.txt",
  sitemap: "/sitemap.xml",
  personAI: "/api/personai",
  cvIt: "/cv/it",
  cvEn: "/cv/en",
} as const;

export const homepageLinkHeader =
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/json", </docs/api>; rel="service-doc"; type="text/html"';

export const agentCatalog = {
  name: "Marco D'Antonio portfolio",
  description: "Public portfolio, CV, and agent-facing resources for Marco D'Antonio.",
  homepage: absoluteUrl("/"),
  languages: [absoluteUrl("/"), absoluteUrl("/en")],
  contact: "me@marcodantonio.it",
  links: {
    apiCatalog: absoluteUrl(agentDiscoveryLinks.apiCatalog),
    serviceDoc: absoluteUrl(agentDiscoveryLinks.serviceDoc),
    robotsTxt: absoluteUrl(agentDiscoveryLinks.robotsTxt),
    securityTxt: absoluteUrl(agentDiscoveryLinks.securityTxt),
    sitemap: absoluteUrl(agentDiscoveryLinks.sitemap),
  },
  endpoints: [
    {
      method: "POST",
      path: absoluteUrl(agentDiscoveryLinks.personAI),
      description: "Recruiter-facing chat endpoint powered by Cloudflare Workers AI.",
    },
    {
      method: "GET",
      path: absoluteUrl(agentDiscoveryLinks.cvIt),
      description: "Italian CV PDF download.",
    },
    {
      method: "GET",
      path: absoluteUrl(agentDiscoveryLinks.cvEn),
      description: "English CV PDF download.",
    },
  ],
  discovery: [
    {
      rel: "api-catalog",
      href: absoluteUrl(agentDiscoveryLinks.apiCatalog),
      type: "application/json",
    },
    {
      rel: "service-doc",
      href: absoluteUrl(agentDiscoveryLinks.serviceDoc),
      type: "text/html",
    },
  ],
  webmcp: [
    {
      name: "scroll_to_section",
      description: "Scroll the page to one of the main sections: about, education, skills, projects, experience, or contact.",
    },
    {
      name: "focus_contact_form",
      description: "Jump to the contact section and focus the email field.",
    },
    {
      name: "download_cv",
      description: "Open the localized CV PDF for the current locale or a chosen locale.",
    },
    {
      name: "copy_email",
      description: "Copy Marco's public email address to the clipboard.",
    },
  ],
} as const;
