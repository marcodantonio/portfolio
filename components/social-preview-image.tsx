import type { Lang } from "@/content/i18n";
import { siteProfile } from "@/content/site";

type SocialPreviewCopy = {
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  availability: string;
  footer: string;
  chips: string[];
  meta: Array<{ label: string; value: string }>;
};

const copy: Record<Lang, SocialPreviewCopy> = {
  it: {
    badge: "Portfolio",
    title: "Marco D'Antonio",
    subtitle: "Software developer e AI engineer",
    description: "AI, interfacce e infrastruttura affidabile con attenzione al prodotto.",
    availability: "Disponibile per opportunita",
    footer: "marcodantonio.it",
    chips: ["AI systems", "Web apps", "Computer vision", "Cloudflare Workers"],
    meta: [
      { label: "Stato", value: "Open to opportunities" },
      { label: "Base", value: siteProfile.location },
      { label: "Lingua", value: "IT / EN" },
    ],
  },
  en: {
    badge: "Portfolio",
    title: "Marco D'Antonio",
    subtitle: "Software developer and AI engineer",
    description: "AI, interfaces, and reliable infrastructure with a product mindset.",
    availability: "Open to opportunities",
    footer: "marcodantonio.it/en",
    chips: ["AI systems", "Web apps", "Computer vision", "Cloudflare Workers"],
    meta: [
      { label: "Status", value: "Open to opportunities" },
      { label: "Base", value: siteProfile.location },
      { label: "Language", value: "IT / EN" },
    ],
  },
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        borderRadius: 999,
        border: "1px solid rgba(96, 87, 232, 0.16)",
        background: "rgba(255, 255, 255, 0.78)",
        color: "#0F172A",
        padding: "10px 16px",
        fontSize: 18,
        lineHeight: 1,
        whiteSpace: "nowrap",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
      }}
    >
      {children}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 20,
        padding: "14px 0",
        borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#64748B",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#0F172A",
          textAlign: "right",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 14,
        padding: "12px 0",
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#64748B",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function SocialPreviewImage({ lang }: { lang: Lang }) {
  const text = copy[lang];

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, #F8FAFC 0%, #EEF0FB 52%, #E9EDF7 100%)",
        color: "#0F172A",
        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 16% 18%, rgba(96, 87, 232, 0.18), transparent 28%), radial-gradient(circle at 80% 16%, rgba(96, 87, 232, 0.10), transparent 22%), radial-gradient(circle at 72% 82%, rgba(88, 166, 255, 0.08), transparent 24%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(96, 87, 232, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(96, 87, 232, 0.06) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          opacity: 0.35,
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          padding: 56,
          gap: 34,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            flex: 1.15,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                marginBottom: 18,
                borderRadius: 999,
                border: "1px solid rgba(96, 87, 232, 0.18)",
                background: "rgba(255, 255, 255, 0.72)",
                color: "#6057E8",
                padding: "10px 16px",
                fontSize: 16,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
              }}
            >
              {text.badge}
            </div>

            <div
              style={{
                fontSize: 86,
                lineHeight: 0.92,
                fontWeight: 900,
                letterSpacing: "-0.08em",
                marginLeft: -4,
                marginBottom: 14,
                maxWidth: 760,
              }}
            >
              {text.title}
            </div>

            <div
              style={{
                fontSize: 34,
                lineHeight: 1.12,
                fontWeight: 700,
                color: "#111827",
                maxWidth: 720,
                marginBottom: 16,
              }}
            >
              {text.subtitle}
            </div>

            <div
              style={{
                fontSize: 24,
                lineHeight: 1.28,
                color: "#475569",
                maxWidth: 720,
                marginBottom: 26,
              }}
            >
              {text.description}
            </div>

            <div
              style={{
                width: 170,
                height: 4,
                borderRadius: 999,
                background:
                  "linear-gradient(90deg, #6057E8 0%, #A78BFA 52%, #58A6FF 100%)",
                boxShadow: "0 0 18px rgba(96, 87, 232, 0.25)",
                marginBottom: 26,
              }}
            />

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {text.chips.map((chip) => (
                <Pill key={chip}>{chip}</Pill>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 18,
              marginTop: 28,
              paddingTop: 18,
              borderTop: "1px solid rgba(15, 23, 42, 0.12)",
            }}
          >
            <div style={{ fontSize: 18, color: "#334155" }}>{siteProfile.email}</div>
            <div style={{ fontSize: 18, color: "#64748B" }}>{text.footer}</div>
          </div>
        </div>

        <div
          style={{
            width: 372,
            borderRadius: 34,
            border: "1px solid rgba(15, 23, 42, 0.08)",
            background: "rgba(255, 255, 255, 0.74)",
            boxShadow: "0 24px 70px rgba(15, 23, 42, 0.12)",
            padding: 28,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: "#28C840",
                  boxShadow: "0 0 0 7px rgba(40, 200, 64, 0.10)",
                }}
              />
              <div
                style={{
                  fontSize: 14,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#6057E8",
                }}
              >
                {text.availability}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                borderRadius: 24,
                border: "1px solid rgba(15, 23, 42, 0.08)",
                background: "rgba(255, 255, 255, 0.85)",
                padding: "8px 18px",
              }}
            >
              {text.meta.map((row) => (
                <MetaRow key={row.label} label={row.label} value={row.value} />
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              borderRadius: 24,
              border: "1px solid rgba(96, 87, 232, 0.14)",
              background:
                "linear-gradient(180deg, rgba(96, 87, 232, 0.08) 0%, rgba(255, 255, 255, 0.78) 100%)",
              padding: 18,
              marginTop: 18,
            }}
          >
            <div
              style={{
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#64748B",
                marginBottom: 12,
              }}
            >
              Focus
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <StatPill label="AI" value="Systems + RAG" />
              <StatPill label="UI" value="Product-led interfaces" />
              <StatPill label="Infra" value="Cloudflare Workers" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
