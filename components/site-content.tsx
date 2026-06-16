import About from "@/components/about";
import Contact from "@/components/contact";
import Education from "@/components/education";
import Experience from "@/components/experience";
import Intro from "@/components/intro";
import ProjectsRail from "@/components/projects-rail";
import SectionGhostNumber from "@/components/section-ghost-number";
import Skills from "@/components/skills";
import Marquee from "@/components/marquee";
import SpotlightSection from "@/components/system/spotlight-section";
import { skillsData } from "@/lib/data";

const marqueeItems = Array.from(new Set(skillsData.flatMap((g) => g.skills)));

function Divider() {
  return <hr className="mx-auto w-full max-w-[1100px] border-t border-line-subtle" />;
}

function Container({ children }: { children: React.ReactNode }) {
  // `relative` so section content stacks above the positioned ghost numeral.
  return <div className="relative mx-auto w-full max-w-[1100px] px-6">{children}</div>;
}

export default function SiteContent() {
  // Block flow (not flex): ScrollTrigger's pin-spacer can't reserve the pin
  // distance inside a flex container, which would overlap the next section.
  return (
    <main>
      <Intro />

      <SpotlightSection id="about" className="py-24 sm:py-28">
        <SectionGhostNumber index="01" />
        <Container>
          <About />
        </Container>
      </SpotlightSection>

      <Divider />

      <SpotlightSection id="education" as="div" className="bg-[var(--surface)] py-24 sm:py-28">
        <SectionGhostNumber index="02" />
        <Container>
          <Education />
        </Container>
      </SpotlightSection>

      <Divider />

      <SpotlightSection id="skills" className="py-24 sm:py-28">
        <SectionGhostNumber index="03" />
        <Container>
          <Skills />
        </Container>
      </SpotlightSection>

      <Marquee items={marqueeItems} />

      <SpotlightSection id="projects" as="div" className="bg-[var(--surface)] py-24 sm:py-28">
        <SectionGhostNumber index="04" />
        <Container>
          <ProjectsRail />
        </Container>
      </SpotlightSection>

      <Divider />

      <SpotlightSection id="experience" className="py-24 sm:py-28">
        <SectionGhostNumber index="05" />
        <Container>
          <Experience />
        </Container>
      </SpotlightSection>

      <Divider />

      <SpotlightSection id="contact" className="py-24 sm:py-28">
        <SectionGhostNumber index="06" />
        <Container>
          <Contact />
        </Container>
      </SpotlightSection>
    </main>
  );
}
