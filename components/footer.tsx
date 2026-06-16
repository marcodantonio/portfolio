"use client";

import { Eyebrow } from "@/components/system/copy";
import { PageShell, SectionDivider } from "@/components/system/shell";

export default function Footer() {
  return (
    <footer className="site-footer-lazy pb-10">
      <PageShell>
        <SectionDivider />
        <div className="flex items-end justify-between gap-4 pt-6">
          <Eyebrow>Marco D&apos;Antonio</Eyebrow>
          <small className="font-mono text-xs text-copy-muted">
            &copy; {new Date().getFullYear()} — built with Next.js & Three.js
          </small>
        </div>
      </PageShell>
    </footer>
  );
}
