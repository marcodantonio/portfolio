import About from "@/components/about";
import Contact from "@/components/contact";
import Education from "@/components/education";
import Experience from "@/components/experience";
import Intro from "@/components/intro";
import ProjectsRail from "@/components/projects-rail";
import Skills from "@/components/skills";
import SpotlightSection from "@/components/system/spotlight-section";

function Container({ children }: { children: React.ReactNode }) {
  return <div className="relative mx-auto w-full max-w-[1100px] px-6">{children}</div>;
}

export default function SiteContent() {
  // Block flow (not flex): ScrollTrigger's pin-spacer can't reserve the pin
  // distance inside a flex container, which would overlap the next section.
  return (
    <main className="story-flow">
      <Intro />

      <SpotlightSection id="about" variant="story" className="py-20 sm:py-24">
        <Container>
          <About />
        </Container>
      </SpotlightSection>

      <SpotlightSection id="education" as="div" variant="story" className="py-20 sm:py-24">
        <Container>
          <Education />
        </Container>
      </SpotlightSection>

      <SpotlightSection id="skills" variant="story" className="py-20 sm:py-24">
        <Container>
          <Skills />
        </Container>
      </SpotlightSection>

      <SpotlightSection id="projects" as="div" variant="story" className="py-20 sm:py-24">
        <Container>
          <ProjectsRail />
        </Container>
      </SpotlightSection>

      <SpotlightSection id="experience" variant="story" className="py-20 sm:py-24">
        <Container>
          <Experience />
        </Container>
      </SpotlightSection>

      <SpotlightSection id="contact" variant="story" className="py-20 sm:py-24">
        <Container>
          <Contact />
        </Container>
      </SpotlightSection>
    </main>
  );
}
