import type { Metadata } from "next";
import Link from "next/link";
import { BodyCopy, Eyebrow } from "@/components/system/copy";
import KineticHeading from "@/components/kinetic-heading";
import SpotlightSection from "@/components/system/spotlight-section";
import { SectionDivider } from "@/components/system/shell";
import { agentCatalog, agentDiscoveryLinks, homepageLinkHeader } from "@/lib/agent-discovery";

export const metadata: Metadata = {
  title: "API & Agent Resources — Marco D'Antonio",
  description: "Machine-readable discovery resources, service docs, and agent-facing endpoints.",
};

function Container({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-[960px] px-6">{children}</div>;
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-line-subtle bg-panel-strong px-4 py-3 font-mono text-[12px] leading-relaxed text-copy-muted">
      <code>{children}</code>
    </pre>
  );
}

export default function AgentDocsPage() {
  return (
    <main className="flex flex-col">
      <SpotlightSection className="py-24 sm:py-28">
        <Container>
          <div className="space-y-8">
            <KineticHeading
              eyebrow="// agent resources"
              text="API & Agent Resources"
            />
            <BodyCopy className="max-w-2xl text-copy-muted">
              Discovery endpoints and agent-facing resources.
            </BodyCopy>
          </div>
        </Container>
      </SpotlightSection>

      <SectionDivider className="mx-auto w-full max-w-[1040px]" />

      <SpotlightSection className="py-24 sm:py-28">
        <Container>
          <article className="rounded-xl border border-line-subtle bg-panel px-6 py-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
            <Eyebrow className="mb-3 text-[0.78rem] tracking-[0.24em]">Discovery</Eyebrow>
            <div className="mt-4">
              <CodeBlock>{homepageLinkHeader}</CodeBlock>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px] leading-relaxed text-copy-muted">
              <Link className="text-foreground underline decoration-[var(--accent)] decoration-2 underline-offset-4" href={agentDiscoveryLinks.apiCatalog}>
                /.well-known/api-catalog
              </Link>
              <Link className="text-foreground underline decoration-[var(--accent)] decoration-2 underline-offset-4" href={agentDiscoveryLinks.serviceDoc}>
                /docs/api
              </Link>
            </div>
          </article>
        </Container>
      </SpotlightSection>

      <SectionDivider className="mx-auto w-full max-w-[1040px]" />

      <SpotlightSection className="bg-[var(--surface)] py-24 sm:py-28">
        <Container>
          <div className="space-y-5">
            <article className="rounded-xl border border-line-subtle bg-panel px-6 py-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
              <Eyebrow className="mb-3 text-[0.78rem] tracking-[0.24em]">Catalog</Eyebrow>
              <div className="mt-4 space-y-2.5">
                {agentCatalog.endpoints.map((endpoint) => (
                  <div key={endpoint.path} className="rounded-xl border border-line-subtle bg-[var(--background)] px-4 py-3">
                    <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-copy-muted">
                      {endpoint.method}
                    </div>
                    <div className="mt-1 break-words text-foreground">{endpoint.path}</div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-line-subtle bg-panel px-6 py-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
              <Eyebrow className="mb-3 text-[0.78rem] tracking-[0.24em]">WebMCP</Eyebrow>
              <ul className="mt-4 space-y-2.5 text-[14px] text-copy-muted">
                {agentCatalog.webmcp.map((tool) => (
                  <li key={tool.name} className="rounded-xl border border-line-subtle bg-[var(--background)] px-4 py-3">
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-copy-muted">
                      {tool.name}
                    </span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-xl border border-line-subtle bg-surface px-6 py-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.25)]">
              <Eyebrow className="mb-3 text-[0.78rem] tracking-[0.24em]">Notes</Eyebrow>
              <ul className="mt-4 space-y-2.5 text-[14px] leading-relaxed text-copy-muted">
                <li>DNS-AID lives in Cloudflare DNS and DNSSEC.</li>
                <li>Markdown for Agents is controlled at the zone level.</li>
                <li>
                  <Link className="text-foreground underline decoration-[var(--accent)] decoration-2 underline-offset-4" href="/security.txt">
                    security.txt
                  </Link>{" "}
                  and{" "}
                  <Link className="text-foreground underline decoration-[var(--accent)] decoration-2 underline-offset-4" href="/robots.txt">
                    robots.txt
                  </Link>{" "}
                  are exposed for discovery.
                </li>
              </ul>
            </article>
          </div>
        </Container>
      </SpotlightSection>
    </main>
  );
}
