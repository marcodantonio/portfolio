import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      ".wrangler/**",
      ".claude/**",
      ".superpowers/**",
      "cloudflare-env.d.ts",
    ],
  },
  ...nextVitals,
];

export default eslintConfig;
