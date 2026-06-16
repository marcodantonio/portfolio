"use server";

import { Resend } from "resend";
import { headers } from "next/headers";
import { validateString, getErrorMessage } from "@/lib/utils";
import { verifyTurnstile } from "@/lib/turnstile";
import { siteProfile } from "@/content/site";
import {
  consumeRateLimit,
  getClientFingerprint,
  getRequestOrigin,
  isTrustedOrigin,
} from "@/lib/security";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const sendEmail = async (formData: FormData) => {
  const requestHeaders = await headers();
  if (!isTrustedOrigin(getRequestOrigin(requestHeaders), requestHeaders.get("host"))) {
    return { error: "Forbidden." };
  }

  const limiter = consumeRateLimit(getClientFingerprint(requestHeaders), {
    limit: 3,
    windowMs: 15 * 60 * 1000,
  });
  if (!limiter.allowed) {
    return { error: "Too many requests. Please wait a moment and try again." };
  }

  const senderEmail = formData.get("senderEmail");
  const message = formData.get("message");
  const turnstileToken = formData.get("cf-turnstile-response");

  if (!validateString(turnstileToken, 2048)) {
    return { error: "Security check missing." };
  }

  const turnstileValid = await verifyTurnstile(turnstileToken as string);
  if (!turnstileValid) {
    return { error: "Security check failed. Please try again." };
  }

  if (!validateString(senderEmail, 500) || !EMAIL_RE.test(senderEmail as string)) {
    return { error: "Invalid sender email." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { error: "Email service not configured." };
  const resend = new Resend(apiKey);
  if (!validateString(message, 5000)) {
    return { error: "Invalid message." };
  }

  let data;
  try {
    data = await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL ?? "Portfolio Contact <onboarding@resend.dev>",
      to: siteProfile.email,
      subject: `New message from ${senderEmail}`,
      replyTo: senderEmail as string,
      html: `
        <p><strong>From:</strong> ${escapeHtml(senderEmail as string)}</p>
        <hr />
        <p>${escapeHtml(message as string).replace(/\n/g, "<br>")}</p>
      `,
    });
  } catch (error: unknown) {
    return { error: getErrorMessage(error) };
  }

  return { data };
};
