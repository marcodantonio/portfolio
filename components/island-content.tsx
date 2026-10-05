"use client";

import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { ArrowDownToLine, ArrowUpRight, BookOpen, Check, ChevronDown, FileText, Mail, MessageCircle } from "lucide-react";
import KineticHeading from "@/components/kinetic-heading";
import SpotlightSection from "@/components/system/spotlight-section";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language-context";
import { siteProfile, socialLinks } from "@/content/site";
import { projectsData, skillsData } from "@/lib/data";
import { getCvDownloadPath } from "@/lib/cv";
import type { PortfolioIslandId } from "@/lib/island-map";

const EDUCATION_KEYS = ["bsc", "thesis", "msc"] as const;
const WRAP_COLORS = ["#eee9df", "#7644bd", "#207b9b", "#3c4248"] as const;
// Connections refer to actual project stacks, not invented proficiency scores.
const SKILL_PROJECTS: readonly (readonly number[])[] = [[1, 2, 4], [2, 4], [0, 3], [3], []];

function Container({ children }: { children: ReactNode }) {
  return <div className="island-content__container">{children}</div>;
}

function Tags({ items }: { items: readonly string[] }) {
  return <ul className="island-content__tags">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

function AreaLink({ id, index = 0, children }: { id: PortfolioIslandId; index?: number; children: ReactNode }) {
  return <a href={`#${id}`} onClick={(event) => {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent("island:open", { detail: { id, index } }));
  }}>{children}<ArrowUpRight size={15} aria-hidden="true" /></a>;
}

/** A normal anchor still works without JS; enhancement also unfolds its document. */
function openDocument(event: MouseEvent<HTMLAnchorElement>, id: string) {
  const document = window.document.getElementById(id);
  if (!(document instanceof HTMLDetailsElement)) return;
  event.preventDefault();
  document.open = true;
  document.scrollIntoView({ behavior: "instant", block: "nearest" });
  document.querySelector("summary")?.focus({ preventScroll: true });
}

function Profile() {
  const { lang, t } = useLanguage();
  const copy = t.archipelago.notebook;
  return <div className="island-notebook">
    <aside className="island-notebook__cover">
      <p className="island-content__meta"><BookOpen size={16} aria-hidden="true" />{copy.title}</p>
      <img className="island-content__portrait" src="/portrait.jpg" alt={t.journey.profile.portraitAlt} width={160} height={160} loading="lazy" />
      <h3>{siteProfile.name}</h3><p>{t.hero.badge}</p><p className="island-content__meta">{t.journey.profile.location}</p>
      <Button asChild variant="outline"><a href={getCvDownloadPath(lang)} download>{t.hero.ctaCV}<ArrowDownToLine size={16} aria-hidden="true" /></a></Button>
    </aside>
    <div className="island-notebook__pages">{[copy.introduction, copy.approach, copy.personal].map((paragraphs, index) => <details className="island-notebook__page" key={index} open={index === 0}>
      <summary><span className="island-content__number">0{index + 1}</span><h3>{copy.pages[index]}</h3><ChevronDown size={18} aria-hidden="true" /></summary>
      {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      {index === 1 && <nav className="island-content__related" aria-label={copy.related}><AreaLink id="projects">{t.nav.projects}</AreaLink><AreaLink id="experience">{t.nav.experience}</AreaLink><AreaLink id="education">{t.nav.education}</AreaLink></nav>}
      {index === 2 && <nav className="island-content__related" aria-label={copy.related}><AreaLink id="tesla">{t.game.islands.tesla.name}</AreaLink><AreaLink id="dance">{t.game.islands.dance.name}</AreaLink></nav>}
    </details>)}</div>
  </div>;
}

function Education({ selectedIndex }: { selectedIndex: number }) {
  const { t } = useLanguage();
  const copy = t.archipelago.archive;
  const [filter, setFilter] = useState<"all" | "done" | "ongoing">("all");
  return <div className="island-archive" data-selected-index={selectedIndex}>
    <div className="island-archive__toolbar"><p>{copy.title}</p><div className="island-content__filters" role="group" aria-label={copy.filter}>{(["all", "done", "ongoing"] as const).map((value) => <Button type="button" variant={filter === value ? "secondary" : "ghost"} aria-pressed={filter === value} key={value} onClick={() => setFilter(value)}>{value === "all" ? copy.all : t.education[value]}</Button>)}</div></div>
    <div className="island-archive__documents">{EDUCATION_KEYS.map((key, index) => {
      const item = t.education.items[key];
      const status = key === "msc" ? "ongoing" : "done";
      return <article className="island-archive__document" data-object-index={index} key={key} hidden={filter !== "all" && filter !== status}>
        <div className="island-archive__stamp"><FileText size={22} aria-hidden="true" /><span>{copy.types[index]}</span><span className="island-content__status">{t.education[status]}</span></div>
        <h3>{item.degree}</h3><p className="island-content__meta">{item.school}</p><p>{item.focus}</p><Tags items={item.tags} />
        <p className="island-content__note">{copy.periodMissing}</p>
        {key === "thesis" && <div className="island-content__related"><AreaLink id="projects" index={0}>{t.journey.projectNodes[0]}</AreaLink></div>}
      </article>;
    })}</div>
  </div>;
}

function Skills({ selectedIndex }: { selectedIndex: number }) {
  const { t } = useLanguage();
  const copy = t.archipelago.capabilities;
  return <div className="island-capabilities">
    <nav className="island-content__index" aria-label={copy.index}>{skillsData.map((group, index) => <a href={`#skill-module-${index}`} key={group.category} onClick={(event) => openDocument(event, `skill-module-${index}`)}><span>0{index + 1}</span>{t.journey.skillNodes[index]}</a>)}</nav>
    <div className="island-capabilities__modules">{skillsData.map((group, index) => <details className="island-capabilities__module" id={`skill-module-${index}`} data-object-index={index} key={group.category} open={index === selectedIndex}>
      <summary><span className="island-content__number">0{index + 1}</span><h3>{t.skills.categories[group.category]}</h3><ChevronDown size={18} aria-hidden="true" /></summary>
      <p className="island-content__intro">{t.journey.skillDescriptions[index]}</p><h4>{copy.tools}</h4><Tags items={group.skills} />
      <div className="island-capabilities__evidence"><h4>{copy.examples}</h4><div className="island-content__related">{SKILL_PROJECTS[index].map((project) => <AreaLink key={project} id="projects" index={project}>{t.journey.projectNodes[project]}</AreaLink>)}</div>
        {index === 1 && <div className="island-content__related"><AreaLink id="experience">{copy.viewExperience}</AreaLink></div>}
        {index === 4 && <><p>{copy.foundation}</p><div className="island-content__related"><AreaLink id="education">{copy.viewEducation}</AreaLink></div></>}
      </div>
    </details>)}</div>
  </div>;
}

function Projects({ selectedIndex }: { selectedIndex: number }) {
  const { t } = useLanguage();
  const labels = t.archipelago.caseStudy;
  return <div className="island-cases">
    <nav className="island-content__index" aria-label={labels.index}>{projectsData.map((project, index) => <a href={`#project-case-${index}`} key={project.title} onClick={(event) => openDocument(event, `project-case-${index}`)}><span>0{index + 1}</span>{t.journey.projectNodes[index]}</a>)}</nav>
    <div className="island-cases__list">{projectsData.map((project, index) => {
      const copy = t.projects.items[index];
      return <details className="island-case" id={`project-case-${index}`} data-object-index={index} key={project.title} open={index === selectedIndex}>
        <summary><span className="island-content__number">0{index + 1}</span><h3>{copy.title}</h3><ChevronDown size={18} aria-hidden="true" /></summary>
        <div className="island-case__problem"><p className="island-content__meta">{labels.problem}</p><p>{labels.problems[index]}</p></div>
        <dl className="island-case__story"><div><dt>{labels.contribution}</dt><dd>{copy.proof.role}</dd></div><div><dt>{labels.solution}</dt><dd>{copy.description}</dd></div><div><dt>{labels.result}</dt><dd>{copy.proof.output}</dd></div></dl>
        <h4>{labels.technologies}</h4><Tags items={project.tags} /><p className="island-content__note">{labels.missingLinks}</p>
      </details>;
    })}</div>
  </div>;
}

function Experience({ selectedIndex }: { selectedIndex: number }) {
  const { t } = useLanguage();
  const copy = t.archipelago.timeline;
  const entries = [...t.experience.items].reverse();
  return <div className="island-timeline">
    <nav className="island-timeline__index" aria-label={copy.index}>{entries.map((item, index) => <a href={`#experience-entry-${index}`} key={index} onClick={(event) => openDocument(event, `experience-entry-${index}`)}><span>{item.date}</span><strong>{copy.organisations[index]}</strong></a>)}</nav>
    <div className="island-timeline__entries">{entries.map((item, index) => <details className="island-timeline__entry" id={`experience-entry-${index}`} data-object-index={index} key={index} open={index === selectedIndex}>
      <summary><span className="island-timeline__marker" aria-hidden="true" /><div><p className="island-content__meta">{item.date}</p><h3>{copy.organisations[index]}</h3><p>{copy.roleTypes[index]}</p></div><ChevronDown size={18} aria-hidden="true" /></summary>
      <dl className="island-content__facts"><div><dt>{copy.role}</dt><dd>{item.title} · {item.location}</dd></div></dl><p>{item.description}</p><h4>{copy.contribution}</h4><p>{copy.contributionNotes[index]}</p>
    </details>)}</div>
  </div>;
}

function Tesla() {
  const { t } = useLanguage();
  const copy = t.archipelago.tesla;
  const [color, setColor] = useState(0);
  // This is a temporary visual experiment, not a saved vehicle configuration.
  // Reset its world material together with the initial swatch on every opening.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("island:wrap", { detail: { color: WRAP_COLORS[0] } }));
  }, []);
  return <div className="island-garage">
    <p className="island-content__intro">{copy.intro}</p><div className="island-garage__identity"><div><p className="island-content__meta">{copy.vehicle}</p><h3>{copy.model}</h3><p>{copy.year}</p></div><p>{copy.personal}</p></div>
    <section className="island-garage__workbench" aria-labelledby="island-wrap-title">
      <div className="island-garage__swatch-preview" style={{ "--wrap-color": WRAP_COLORS[color], backgroundColor: WRAP_COLORS[color] } as CSSProperties} aria-hidden="true"><span /></div>
      <div><h3 id="island-wrap-title">{copy.demo}</h3><p>{copy.demoDescription}</p>
        <div className="island-garage__samples" role="group" aria-label={copy.demo}>{WRAP_COLORS.map((value, index) => <Button type="button" variant={color === index ? "secondary" : "outline"} aria-pressed={color === index} key={value} onClick={() => { setColor(index); window.dispatchEvent(new CustomEvent("island:wrap", { detail: { color: value } })); }}><span className="island-garage__sample" style={{ backgroundColor: value }} aria-hidden="true" />{copy.colors[index]}{color === index && <Check size={14} aria-hidden="true" />}</Button>)}</div>
        <p className="island-content__meta" aria-live="polite">{copy.selected}: {copy.colors[color]}</p>
      </div>
    </section>
    <section className="island-content__pending"><h3>{copy.documentation}</h3><p>{copy.missing}</p></section><p className="island-content__note">{copy.disclaimer}</p>
    <Button asChild variant="outline"><a href={`mailto:${siteProfile.email}?subject=${encodeURIComponent(copy.subject)}`}>{copy.contact}<Mail size={16} aria-hidden="true" /></a></Button>
  </div>;
}

function Dance({ selectedIndex }: { selectedIndex: number }) {
  const { t } = useLanguage();
  const copy = t.archipelago.dance;
  return <div className="island-dance">
    <p className="island-content__intro">{copy.intro}</p><p className="island-content__meta">{copy.disciplines}</p>
    <div className="island-dance__paths">
      <details className="island-dance__path" id="dance-athlete" data-object-index={0} open={selectedIndex === 0}><summary><span className="island-content__number">01</span><h3>{copy.athlete}</h3><ChevronDown size={18} aria-hidden="true" /></summary><p>{copy.athleteDescription}</p><div className="island-content__pending"><h4>{copy.media}</h4><p>{copy.mediaMissing}</p></div></details>
      <details className="island-dance__path" id="dance-teacher" data-object-index={1} open={selectedIndex === 1}><summary><span className="island-content__number">02</span><h3>{copy.teacher}</h3><ChevronDown size={18} aria-hidden="true" /></summary><p>{copy.teacherDescription}</p><p className="island-content__note">{copy.teachingMissing}</p><Button asChild variant="outline"><a href={`mailto:${siteProfile.email}?subject=${encodeURIComponent(copy.subject)}`}>{copy.contact}<Mail size={16} aria-hidden="true" /></a></Button></details>
    </div>
  </div>;
}

function Contact() {
  const { lang, t } = useLanguage();
  const copy = t.archipelago.contact;
  const [topic, setTopic] = useState(0);
  return <div className="island-radio">
    <p className="island-content__intro">{copy.direct}</p><a className="island-content__email" href={`mailto:${siteProfile.email}`}>{siteProfile.email}<ArrowUpRight size={20} aria-hidden="true" /></a><p className="island-content__meta">{t.journey.profile.location}</p>
    <section className="island-radio__compose" aria-labelledby="island-contact-topic"><h3 id="island-contact-topic">{copy.topicLabel}</h3><div className="island-content__filters" role="group" aria-labelledby="island-contact-topic">{copy.topics.map((label, index) => <Button type="button" variant={topic === index ? "secondary" : "ghost"} aria-pressed={topic === index} key={label} onClick={() => setTopic(index)}>{label}</Button>)}</div><Button asChild><a href={`mailto:${siteProfile.email}?subject=${encodeURIComponent(copy.topics[topic])}`}>{copy.emailAction}<Mail size={16} aria-hidden="true" /></a></Button><p className="island-content__note">{copy.noSubmission}</p></section>
    <div className="island-content__links"><Button asChild variant="outline"><a href={getCvDownloadPath(lang)} download>{t.hero.ctaCV}<ArrowDownToLine size={16} aria-hidden="true" /></a></Button>{socialLinks.map((link) => <Button asChild variant="ghost" key={link.label}><a href={link.href} target="_blank" rel="noreferrer">{link.label}<ArrowUpRight size={16} aria-hidden="true" /></a></Button>)}</div>
    <div className="island-content__ai"><p>{t.journey.aiPrompt}</p><Button type="button" variant="secondary" onClick={() => window.dispatchEvent(new Event("personai:open"))}><MessageCircle size={18} aria-hidden="true" />{t.journey.ai.open}</Button></div>
  </div>;
}

/** Distinct semantic presentations; all documents remain in SSR HTML, including closed disclosures. */
export default function IslandContent({ island, selectedIndex = 0, presentation = "reader" }: { island: PortfolioIslandId; selectedIndex?: number; presentation?: "world" | "reader" }) {
  const { t } = useLanguage();
  const copy = t.game.islands[island];
  const safeIndex = Math.max(0, Math.floor(Number.isFinite(selectedIndex) ? selectedIndex : 0));
  return <SpotlightSection id={island} className={`island-content island-content--${island} island-content--${presentation}`}><Container>
    <p className="island-content__meta">{copy.subtitle}</p><div id={`island-heading-${island}`}><KineticHeading text={copy.name} className="island-content__heading" /></div>
    <div key={`${island}-${safeIndex}`}>
      {island === "about" && <Profile />}{island === "education" && <Education selectedIndex={Math.min(2, safeIndex)} />}
      {island === "skills" && <Skills selectedIndex={Math.min(skillsData.length - 1, safeIndex)} />}{island === "projects" && <Projects selectedIndex={Math.min(projectsData.length - 1, safeIndex)} />}
      {island === "experience" && <Experience selectedIndex={Math.min(t.experience.items.length - 1, safeIndex)} />}
      {island === "tesla" && <Tesla />}{island === "dance" && <Dance selectedIndex={Math.min(1, safeIndex)} />}{island === "contact" && <Contact />}
    </div>
  </Container></SpotlightSection>;
}
