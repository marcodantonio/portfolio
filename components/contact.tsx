"use client";

import { useRef, useState } from "react";
import { BsLinkedin, BsGithub } from "react-icons/bs";
import { BsSend } from "react-icons/bs";
import { LoaderCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { sendEmail } from "@/actions/sendEmail";
import { Eyebrow } from "@/components/system/copy";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Magnetic from "@/components/magnetic";
import { useLanguage } from "@/context/language-context";
import { useTheme } from "@/context/theme-context";
import { turnstileSiteKey } from "@/content/site";

const socials = [
  { href: "https://github.com/marcodantonio", label: "github.com/marcodantonio", short: "gh", icon: BsGithub },
  { href: "https://linkedin.com/in/marcodantonio00", label: "linkedin.com/in/marcodantonio00", short: "li", icon: BsLinkedin },
  { href: "mailto:me@marcodantonio.it", label: "me@marcodantonio.it", short: "@", icon: null },
] as const;

const fieldClass =
  "rounded-md border-line bg-[var(--background)] text-foreground placeholder:text-copy-muted/60 focus-visible:border-[var(--accent)] focus-visible:ring-0";
const ctaButtonClass = "h-10 rounded-full px-5 text-[13px] font-semibold tracking-[0.14em]";

export default function Contact() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [pending, setPending] = useState(false);
  const [securityMounted, setSecurityMounted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  // Mounts Turnstile on demand and resolves once its ref is populated, so a
  // submit that fires before the form is focused still gets a live widget.
  const waitForTurnstile = async () => {
    setSecurityMounted(true);
    let frames = 0;
    while (!turnstileRef.current) {
      frames += 1;
      if (frames > 300) {
        throw new Error(t.contact.errorSecurity);
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    return turnstileRef.current;
  };

  const getTurnstileToken = async () => {
    const widget = turnstileRef.current ?? (await waitForTurnstile());
    if (!widget) {
      throw new Error(t.contact.errorSecurity);
    }

    widget.reset();
    widget.execute();

    try {
      return await widget.getResponsePromise(30_000, 250);
    } catch {
      throw new Error(t.contact.errorSecurity);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);

    const formData = new FormData(e.currentTarget);

    try {
      const token = await getTurnstileToken();
      formData.set("cf-turnstile-response", token);
      const { error } = await sendEmail(formData);
      if (error) {
        toast.error(error);
      } else {
        toast.success(t.contact.sent);
        formRef.current?.reset();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t.contact.errorGeneric;
      toast.error(message);
    } finally {
      setPending(false);
      turnstileRef.current?.reset();
    }
  };

  return (
    <div className="contact-command space-y-12">
      <div className="flex flex-col gap-3">
        <Eyebrow className="text-[0.78rem] tracking-[0.24em]">{t.contact.label}</Eyebrow>
      </div>

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
        <div data-reveal className="contact-command__copy">
          <h2 className="font-display text-[clamp(26px,3.2vw,42px)] font-extrabold leading-[1.12] tracking-[-0.035em]">
            {t.contact.title}
            <br />
            <em className="not-italic text-[var(--accent)]">{t.contact.titleEm}</em>
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-[1.82] text-copy-muted">{t.contact.sub}</p>

          <div className="mt-9 flex flex-col gap-2.5">
            {socials.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target={social.href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="group flex items-center gap-3 font-mono text-[12.5px] text-copy-muted transition-all hover:translate-x-1 hover:text-[var(--accent)]"
                >
                  <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-md border border-line text-[11px] transition-colors group-hover:border-[var(--accent)] group-hover:bg-accent-soft">
                    {Icon ? <Icon size={13} /> : social.short}
                  </span>
                  {social.label}
                </a>
              );
            })}
          </div>
        </div>

        <form
          ref={formRef}
          data-reveal
          data-command={t.contact.command}
          className="contact-command__form flex flex-col gap-4"
          onFocusCapture={() => setSecurityMounted(true)}
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="contact-email"
              className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-copy-muted"
            >
              {t.contact.email}
            </label>
            <Input
              id="contact-email"
              className={`${fieldClass} h-12 px-3.5`}
              name="senderEmail"
              type="email"
              required
              maxLength={500}
              placeholder="you@email.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="contact-message"
              className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-copy-muted"
            >
              {t.contact.message}
            </label>
            <Textarea
              id="contact-message"
              className={`${fieldClass} min-h-32 rounded-md p-3.5`}
              name="message"
              required
              maxLength={5000}
              placeholder="..."
            />
          </div>

          {/* Invisible Turnstile — mounted only once the user shows intent
              (focuses a field) or on a cold submit. execution: "execute" keeps
              it silent until execute() runs on submit. No background noise. */}
          {securityMounted ? (
            <Turnstile
              ref={turnstileRef}
              siteKey={turnstileSiteKey}
              options={{
                theme: theme === "light" ? "light" : "dark",
                size: "invisible",
                execution: "execute",
                appearance: "execute",
              }}
              onExpire={() => turnstileRef.current?.reset()}
            />
          ) : null}

          <div className="pt-1">
            <Magnetic strength={0.4} radius={120} maxOffset={16}>
              <Button
                type="submit"
                size="default"
                className={`${ctaButtonClass} uppercase`}
                disabled={pending}
              >
                {pending ? (
                  <>
                    <LoaderCircle data-icon="inline-start" className="animate-spin" />
                    {t.contact.sending}
                  </>
                ) : (
                  <>
                    {t.contact.send}
                    <BsSend size={14} />
                  </>
                )}
              </Button>
            </Magnetic>
          </div>
        </form>
      </div>
    </div>
  );
}
