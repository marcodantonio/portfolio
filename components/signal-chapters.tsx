"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { ArrowDownToLine, ArrowUpRight, MessageCircle } from "lucide-react";
import KineticHeading from "@/components/kinetic-heading";
import SpotlightSection from "@/components/system/spotlight-section";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language-context";
import { siteProfile, socialLinks } from "@/content/site";
import { projectsData, skillsData } from "@/lib/data";
import { getCvDownloadPath } from "@/lib/cv";

const CHAPTER_IDS = ["about", "education", "skills", "projects", "experience", "contact"] as const;
type ChapterId = (typeof CHAPTER_IDS)[number];
type Point = { x: number; y: number };

const NETWORK_POINTS: Point[] = [
  { x: 25, y: 25 }, { x: 74, y: 20 }, { x: 50, y: 53 }, { x: 20, y: 77 }, { x: 80, y: 80 },
];
const EDUCATION_POINTS: Point[] = [{ x: 20, y: 28 }, { x: 52, y: 52 }, { x: 82, y: 25 }];
const EXPERIENCE_POINTS: Point[] = [{ x: 27, y: 32 }, { x: 75, y: 66 }];
const EDUCATION_KEYS = ["bsc", "thesis", "msc"] as const;

function openMarcoAI() {
  window.dispatchEvent(new Event("personai:open"));
}

/** Semantic content and real controls for the one shared Three.js scene. */
export default function SignalChapters() {
  return <><ProfileChapter /><EducationChapter /><SkillsChapter /><ProjectsChapter /><ExperienceChapter /><ContactChapter /></>;
}

function Chapter({ id, children, board }: { id: ChapterId; children: ReactNode; board: ReactNode }) {
  const { t } = useLanguage();
  const stage = CHAPTER_IDS.indexOf(id) + 1;
  const copy = t.journey.stages[stage];
  return (
    <SpotlightSection id={id} variant="story" className={`journey-section journey-chapter journey-chapter--${id}`}>
      <Container>
        <div className="journey-chapter__layout" data-journey-anchor={stage}>
          <div className="journey-chapter__copy">
            <p className="journey-chapter__mode"><span className="journey-chapter__number" aria-hidden="true">{String(stage).padStart(2, "0")}</span>{copy.stage}</p>
            <KineticHeading text={copy.title} as="h2" className="journey-chapter__heading" />
            <p className="journey-chapter__intro">{copy.detail}</p>
            {children}
          </div>
          <div className="journey-board">{board}</div>
        </div>
      </Container>
    </SpotlightSection>
  );
}

function Container({ children }: { children: ReactNode }) {
  return <div className="signal-container">{children}</div>;
}

function useNodeSelection(stage: number, initial = 0) {
  const [selected, setSelected] = useState(initial);
  function select(index: number) {
    setSelected(index);
    window.dispatchEvent(new CustomEvent("journey:select", { detail: { stage, index } }));
  }
  return [selected, select] as const;
}

function NodeBoard({ id, labels, points, selected, onSelect }: {
  id: ChapterId; labels: string[]; points: Point[]; selected: number; onSelect: (index: number) => void;
}) {
  const { t } = useLanguage();
  return (
    <>
      {labels.map((label, index) => (
        <Button
          type="button" variant="ghost" key={`${id}-${index}`} id={`${id}-node-${index}`}
          className="journey-node" data-signal-node={index} data-selected={selected === index}
          aria-pressed={selected === index} aria-controls={`${id}-detail-${index}`}
          style={{ left: `${points[index].x}%`, top: `${points[index].y}%` }} onClick={() => onSelect(index)}
        >
          <span className="journey-node__index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <span className="journey-node__label">{label}</span>
        </Button>
      ))}
      <p className="journey-board__hint">{t.journey.selectNode}</p>
    </>
  );
}

function Detail({ id, index, selected, children }: { id: ChapterId; index: number; selected: number; children: ReactNode }) {
  return <div id={`${id}-detail-${index}`} role="region" aria-labelledby={`${id}-node-${index}`} hidden={selected !== index} className="journey-detail__panel">{children}</div>;
}

function Tags({ items }: { items: readonly string[] }) {
  return <ul className="journey-detail__tags">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

function ProfileChapter() {
  const { t } = useLanguage();
  return (
    <Chapter id="about" board={(
      <figure className="journey-profile" style={{ left: "50%", top: "50%" }}>
        <div className="journey-profile__portrait" data-signal-node={0} data-selected="true">
          <Image src="/portrait.jpg" alt={t.journey.profile.portraitAlt} width={180} height={180} sizes="(max-width: 720px) 128px, 180px" />
        </div>
        <figcaption>
          <p className="journey-profile__name">{siteProfile.name}</p>
          <p className="journey-profile__meta">{t.journey.profile.location}</p>
          <p className="journey-profile__status"><span aria-hidden="true" />{t.hero.availability}</p>
        </figcaption>
      </figure>
    )}>
      <div className="journey-detail journey-detail--profile">
        <p className="journey-detail__text">{t.about.bio[2]}</p>
        <dl className="journey-profile__facts">
          <div><dt>{t.journey.profile.currentLabel}</dt><dd>{t.journey.profile.currentValue}</dd></div>
          <div><dt>{t.journey.profile.focusLabel}</dt><dd>{t.journey.profile.focusValue}</dd></div>
        </dl>
      </div>
    </Chapter>
  );
}

function EducationChapter() {
  const { t } = useLanguage();
  const [selected, select] = useNodeSelection(2);
  return (
    <Chapter id="education" board={<NodeBoard id="education" labels={t.journey.educationNodes} points={EDUCATION_POINTS} selected={selected} onSelect={select} />}>
      <div className="journey-detail journey-detail--education" aria-live="polite" aria-atomic="true">
        {EDUCATION_KEYS.map((key, index) => {
          const item = t.education.items[key];
          return (
            <Detail key={key} id="education" index={index} selected={selected}>
              <p className="journey-detail__meta">{key === "msc" ? t.education.ongoing : t.education.done}</p>
              <h3 className="journey-detail__title">{item.degree}</h3>
              <p className="journey-detail__meta">{item.school}</p>
              <p className="journey-detail__text">{item.focus}</p>
              <Tags items={item.tags} />
            </Detail>
          );
        })}
      </div>
    </Chapter>
  );
}

function SkillsChapter() {
  const { t } = useLanguage();
  const [selected, select] = useNodeSelection(3);
  return (
    <Chapter id="skills" board={<NodeBoard id="skills" labels={t.journey.skillNodes} points={NETWORK_POINTS} selected={selected} onSelect={select} />}>
      <div className="journey-detail journey-detail--skills" aria-live="polite" aria-atomic="true">
        {skillsData.map((group, index) => (
          <Detail key={group.category} id="skills" index={index} selected={selected}>
            <h3 className="journey-detail__title">{t.skills.categories[group.category]}</h3>
            <p className="journey-detail__text">{t.journey.skillDescriptions[index]}</p>
            <Tags items={group.skills} />
          </Detail>
        ))}
      </div>
    </Chapter>
  );
}

function ProjectsChapter() {
  const { t } = useLanguage();
  const [selected, select] = useNodeSelection(4);
  return (
    <Chapter id="projects" board={<NodeBoard id="projects" labels={t.journey.projectNodes} points={NETWORK_POINTS} selected={selected} onSelect={select} />}>
      <div className="journey-detail journey-detail--projects" aria-live="polite" aria-atomic="true">
        {projectsData.map((project, index) => {
          const copy = t.projects.items[index];
          return (
            <Detail key={project.title} id="projects" index={index} selected={selected}>
              <h3 className="journey-detail__title">{copy.title}</h3>
              <p className="journey-detail__text">{copy.description}</p>
              <dl className="journey-detail__proof">
                <div><dt>{t.projects.proofLabels.role}</dt><dd>{copy.proof.role}</dd></div>
                <div><dt>{t.projects.proofLabels.output}</dt><dd>{copy.proof.output}</dd></div>
              </dl>
              <Tags items={project.tags} />
            </Detail>
          );
        })}
      </div>
    </Chapter>
  );
}

function ExperienceChapter() {
  const { t } = useLanguage();
  const [selected, select] = useNodeSelection(5, 1);
  return (
    <Chapter id="experience" board={<NodeBoard id="experience" labels={t.journey.experienceNodes} points={EXPERIENCE_POINTS} selected={selected} onSelect={select} />}>
      <div className="journey-detail journey-detail--experience" aria-live="polite" aria-atomic="true">
        {t.experience.items.map((item, index) => (
          <Detail key={`${item.title}-${item.date}`} id="experience" index={index} selected={selected}>
            <p className="journey-detail__meta">{item.date} · {item.location}</p>
            <h3 className="journey-detail__title">{item.title}</h3>
            <p className="journey-detail__text">{item.description}</p>
          </Detail>
        ))}
      </div>
    </Chapter>
  );
}

function ContactChapter() {
  const { lang, t } = useLanguage();
  return (
    <Chapter id="contact" board={(
      <>
        <Button type="button" variant="ghost" className="journey-node journey-node--contact" data-signal-node={0} data-selected="true" style={{ left: "50%", top: "50%" }} onClick={openMarcoAI} aria-label={t.journey.ai.open}>
          <span className="journey-node__index" aria-hidden="true"><MessageCircle size={25} /></span>
          <span className="journey-node__label">{t.journey.ai.label}</span>
        </Button>
        <p className="journey-board__hint">{t.journey.aiPrompt}</p>
      </>
    )}>
      <div className="journey-detail journey-detail--contact">
        <a className="journey-contact__email" href={`mailto:${siteProfile.email}`}>{siteProfile.email}<ArrowUpRight size={20} aria-hidden="true" /></a>
        <div className="journey-contact__links">
          <Button asChild variant="outline"><a href={getCvDownloadPath(lang)} download>{t.hero.ctaCV}<ArrowDownToLine size={15} aria-hidden="true" /></a></Button>
          {socialLinks.map((link) => <Button asChild variant="ghost" key={link.label}><a href={link.href} target="_blank" rel="noreferrer">{link.label}<ArrowUpRight size={15} aria-hidden="true" /></a></Button>)}
        </div>
        <p className="journey-detail__meta">{t.journey.profile.location}</p>
      </div>
    </Chapter>
  );
}
