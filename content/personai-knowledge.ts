import { generatedCvText } from "./generated-cv";

export type KnowledgeEntry = {
  id: string;
  title: string;
  source: "CV" | "Portfolio";
  content: string;
  tags: string[];
  weight?: number;
};

export const personaiStarterQuestions = [
  "What does Marco do at Netsons?",
  "What did Marco build during the Aptar internship?",
  "Which projects best represent his AI profile?",
  "Would Marco be a better fit for AI work or full-stack product work?",
  "What is his current technical stack?",
  "What kind of engineering environment fits him best?",
  "Quali aspetti del suo profilo potrebbero colpire un recruiter tecnico?",
] as const;

function buildCvExcerptKnowledge(text: string): KnowledgeEntry[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let currentChunk = "";

  for (const line of lines) {
    const nextChunk = currentChunk ? `${currentChunk}\n${line}` : line;

    if (nextChunk.length > 520 && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = line;
      continue;
    }

    currentChunk = nextChunk;
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks.map((content, index) => ({
    id: `cv-excerpt-${index + 1}`,
    title: `CV excerpt ${index + 1}`,
    source: "CV" as const,
    content,
    tags: ["cv", "resume", "excerpt", "source text"],
    weight: 0.42,
  }));
}

export const personaiKnowledge: KnowledgeEntry[] = [
  {
    id: "profile",
    title: "Profile summary",
    source: "CV",
    content:
      "The updated CV describes Marco D'Antonio as a software developer based in Pescara who works across web systems, applied AI, and infrastructure. The profile emphasizes pragmatic delivery, CI/CD automation, containerized environments, and hands-on product work.",
    tags: ["profile", "summary", "software developer", "teamwork", "infrastructure"],
    weight: 1,
  },
  {
    id: "education",
    title: "Education",
    source: "CV",
    content:
      "The updated CV lists a Bachelor's Degree in Computer Science at the University of L'Aquila, completed in March 2025. It references AI and Machine Learning, Web Technology, Web Engineering, Advanced Web Development, Java, Python, algorithms and data structures. The thesis focuses on computer vision and mixed reality for product prototyping with Apple Vision Pro.",
    tags: ["education", "university", "degree", "machine learning", "ai", "web", "apple vision pro"],
    weight: 0.84,
  },
  {
    id: "netsons",
    title: "Netsons role",
    source: "CV",
    content:
      "At Netsons, Marco works as a Software Developer on new web features and services. The CV says he collaborates with the systems team on infrastructure optimization, scalable solutions, CI/CD automation, and containerized delivery. The stack listed includes PHP, JavaScript, HTML5, CSS, MySQL, Web RESTful Services, CI/CD, and Docker.",
    tags: ["netsons", "software developer", "ci/cd", "docker", "php", "mysql", "web"],
    weight: 1.12,
  },
  {
    id: "aptar",
    title: "Aptar internship",
    source: "CV",
    content:
      "During the Aptar internship in 2023-2024, Marco built a proof of concept in a duo. The updated CV says he accelerated dataset construction with Python tooling for Blender, trained a YOLO-based model, and delivered a web, native mobile, and Apple Vision Pro application that works online and offline. The stack listed includes Python, Angular, Ionic, CI/CD, Docker, and Swift.",
    tags: ["aptar", "internship", "ai", "machine learning", "product", "vision pro", "unity", "blender", "yolo", "swift"],
    weight: 1.12,
  },
  {
    id: "project-computer-vision",
    title: "Computer Vision AI project",
    source: "Portfolio",
    content:
      "The portfolio describes a custom-trained object detection pipeline connected to a web experience where new scans can help strengthen the model over time. It highlights Python, YOLOv8, object detection, Blender, and AI.",
    tags: ["project", "computer vision", "machine learning", "product", "yolo", "blender", "python", "ai"],
    weight: 1.08,
  },
  {
    id: "project-ecommerce",
    title: "Clothing e-commerce project",
    source: "CV",
    content:
      "The updated CV describes a clothing e-commerce system focused on an intuitive shopping experience, search filters, advanced order management, shipping workflows, reviews, ratings, and an administration panel backed by MySQL. The stack listed is JavaScript, HTML5, CSS, PHP, and Bootstrap.",
    tags: ["project", "ecommerce", "frontend", "full stack", "javascript", "php", "mysql", "ui"],
    weight: 0.95,
  },
  {
    id: "project-university",
    title: "University classroom management system",
    source: "CV",
    content:
      "Marco developed a web platform for integrated management of university events and classroom usage. The updated CV mentions classroom booking, event tracking, a custom admin panel for teachers and technicians, OpenAPI documentation, and MySQL-backed services using JavaScript, HTML5, CSS, and RESTful services.",
    tags: ["project", "university", "frontend", "full stack", "management", "openapi", "rest", "mysql"],
    weight: 0.97,
  },
  {
    id: "project-recommendation",
    title: "Recommendation AI project",
    source: "CV",
    content:
      "The updated CV describes an AI system that analyzes datasets together with static and dynamic user preferences to provide personalized recommendations across categories such as activities or recipes. It emphasizes modular design and reuse for other projects.",
    tags: ["project", "recommendation", "machine learning", "ai", "dataset", "product"],
    weight: 1.08,
  },
  {
    id: "fit-ai-product",
    title: "AI product fit",
    source: "Portfolio",
    content:
      "Across the local CV and portfolio, the clearest differentiator in Marco's profile is applied AI shipped inside usable products. The strongest evidence is the Aptar internship, where computer vision work, HoloLens AR, and a PWA were combined in one proof of concept, plus additional projects in object detection and recommendation systems.",
    tags: ["fit", "ai", "product", "computer vision", "machine learning", "internship"],
    weight: 1.12,
  },
  {
    id: "fit-web-product",
    title: "Web and full-stack fit",
    source: "Portfolio",
    content:
      "The local material also shows solid web and full-stack experience through e-commerce, university management, Netsons, and modern stacks such as PHP, JavaScript, HTML, CSS, MySQL, Angular, Ionic, Docker, and CI/CD. This makes Marco credible for product-oriented web teams, while AI and infrastructure remain strong differentiators.",
    tags: ["fit", "frontend", "full stack", "web", "product", "ionic", "php"],
    weight: 1.06,
  },
  {
    id: "fit-environment",
    title: "Team and environment fit",
    source: "Portfolio",
    content:
      "The local material suggests Marco is best used in pragmatic product teams where prototyping, applied AI, and implementation all matter. The profile combines hands-on experimentation, shipped web interfaces, and collaborative delivery in dynamic technical environments.",
    tags: ["fit", "team", "environment", "product", "ai", "collaboration"],
    weight: 1.08,
  },
  {
    id: "homelab",
    title: "Homelab and infrastructure experience",
    source: "CV",
    content:
      "The local CV says Marco runs a homelab and has extensive experience with Linux terminals, Git, Docker containers, Proxmox virtual machines, services, and CI/CD pipelines through GitHub Actions. It mentions servers with more than 50 services, including NAS systems enhanced by AI, home automation, reverse proxies, websites, and game servers.",
    tags: ["homelab", "linux", "docker", "proxmox", "cicd", "github actions", "infrastructure"],
    weight: 0.9,
  },
  {
    id: "skills",
    title: "Skills and stack",
    source: "Portfolio",
    content:
      "Across the updated CV and portfolio, the main stack includes PHP, JavaScript, Python, Java, Swift, HTML5, CSS, MySQL, REST APIs, CI/CD, Docker, Linux, Proxmox, ZFS, VLANs, VPNs, routing, Angular, Ionic, Blender, Git, OpenAPI, Apple Vision Pro prototyping, YOLO, computer vision, machine learning, and secure infrastructure basics.",
    tags: ["skills", "stack", "frontend", "full stack", "python", "docker", "swift", "ai", "infra"],
    weight: 1,
  },
  {
    id: "languages-contact",
    title: "Languages and public contact",
    source: "CV",
    content:
      "The updated CV lists Italian as native and English at B2 level. Public contact points already present in the site are email me@marcodantonio.it, GitHub github.com/marcodantonio, LinkedIn linkedin.com/in/marcodantonio00, and the website marcodantonio.it.",
    tags: ["languages", "english", "italian", "email", "github", "linkedin", "contact"],
    weight: 0.2,
  },
  ...buildCvExcerptKnowledge(generatedCvText),
];
