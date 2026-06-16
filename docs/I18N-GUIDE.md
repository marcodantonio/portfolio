# Internationalization Guide

The entire portfolio is bilingual: **Italian (IT)** and **English (EN)**. The source of truth is `content/i18n.ts`, a centralized dictionary with all UI copy.

## How It Works

### The Dictionary Structure

`content/i18n.ts` exports:
- **`Lang`** type: `"it" | "en"`
- **`Copy`** type: TypeScript interface for all strings (ensures type safety)
- **`dictionary`** object: `Record<Lang, Copy>` with IT and EN translations

```ts
export const dictionary: Record<Lang, Copy> = {
  it: { /* Italian copy */ },
  en: { /* English copy */ }
}
```

**Key principle:** Every UI string lives here. No hardcoded text in components.

### The Language Context

`context/language-context.tsx` provides:
```tsx
interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Copy;  // Dictionary for current language
}
```

**Behavior:**
- Default route language: Italian on `/`, English on `/en`
- On language toggle (IT ↔ EN), `setLang()` updates React state, localStorage, and the URL
- The active language is set server-side by the locale-specific root layout and mirrored in the client context
- All consumers get fresh translations immediately

### Using Translations in Components

```tsx
import { useLanguage } from "@/context/language-context";

export default function MyComponent() {
  const { t } = useLanguage();

  return (
    <div>
      <h1>{t.about.title}</h1>
      <p>{t.about.bio[0]}</p>
    </div>
  );
}
```

**Accessing translations:**
- Scalars: `t.nav.about`, `t.hero.badge`
- Arrays: `t.about.bio[0]`, `t.hero.chips[1]`
- Nested objects: `t.education.items.bsc.degree`

**Note:** All strings are read-only. No string interpolation or dynamic keys.

## Dictionary Structure

### Top-Level Keys

- **`nav`** — navigation labels (6 section anchors)
- **`hero`** — hero section (badge, scroll hint, chat copy, CTA buttons)
- **`about`** — about section (title, bio paragraphs, terminal card title)
- **`education`** — education section (degree labels, school names, focus areas, tags)
- **`skills`** — skills section (title, category names)
- **`projects`** — projects section (project titles, descriptions)
- **`experience`** — experience section (job titles, dates, locations, descriptions)
- **`contact`** — contact section (form labels, CTA text)
- **`footer`** — footer line / copyright row

### Example: Education

```ts
education: {
  label: "// 02 — education",           // Eyebrow text
  title: "Formazione",                  // KineticHeading text
  bsc: "Triennale",                     // Bachelor label
  thesis: "Tesi Triennale",             // Thesis label
  msc: "Magistrale in corso",           // MSc label
  ongoing: "In corso",                  // Status label
  done: "Completata",                   // Status label
  distance: "~ 120 km",                 // Distance label
  items: {
    bsc: {
      degree: "Laurea Triennale in Informatica",  // Degree name
      school: "Università degli Studi dell'Aquila — L'Aquila",  // School + city
      focus: "AI & Machine Learning, Web Technology, Web Engineering",  // Focus area
      tags: ["AI/ML", "Web Tech", "Web Engineering", "Java", "Python"]  // Tag array
    },
    thesis: { /* ... */ },
    msc: { /* ... */ }
  }
}
```

## Adding a New String

### Step 1: Identify Location

Decide which section (hero, about, skills, etc.) the string belongs to.

### Step 2: Add to Type Definition

Update the `Copy` interface at the top of `content/i18n.ts`:

```ts
type Copy = {
  // ... existing keys
  hero: {
    // ... existing hero fields
    newField: string;  // <-- add here
  }
  // ... rest
}
```

If it's an array or nested object, adjust the type accordingly:
```ts
mySection: {
  items: Array<{ field1: string; field2: string }>;
  labels: Record<string, string>;
}
```

### Step 3: Add to Both Languages

Add the key to both `dictionary.it` and `dictionary.en`:

```ts
it: {
  hero: {
    // ... existing
    newField: "Testo italiano qui"
  }
},
en: {
  hero: {
    // ... existing
    newField: "English text here"
  }
}
```

### Step 4: Use in Component

```tsx
const { t } = useLanguage();
return <p>{t.hero.newField}</p>;
```

**TypeScript will catch missing translations at compile time.**

## Modifying Existing Strings

1. Locate the key in `content/i18n.ts`
2. Update both `dictionary.it[key]` and `dictionary.en[key]`
3. Component automatically re-renders when language context updates

**Example:** Fixing a typo in Italian education title

```ts
it: {
  education: {
    title: "Formazione (fixed typo here)"  // <-- update
  }
},
en: {
  education: {
    title: "Education"  // <-- ensure parity
  }
}
```

## Theme + Language Persistence

Both are persisted to localStorage:

- **Theme:** `html.dark` class + `theme-context.tsx` saves to `localStorage.theme`
- **Language:** `localStorage.lang` persists selected language

On page reload, both preferences hydrate from storage.

## HTML in Strings

Some strings contain HTML markup (e.g., `<strong>`, `<br />`):

```ts
  about: {
    bio: [
      "Sono Marco, un <strong>Software Developer</strong> con..."
    ]
  }
```

**Rendering with dangerouslySetInnerHTML:**

```tsx
const { t } = useLanguage();
return (
  <p dangerouslySetInnerHTML={{ __html: t.about.bio[0] }} />
);
```

**Security:** This is safe because:
- Strings come from the trusted, version-controlled `i18n.ts` file
- No user input is ever placed in i18n values
- All HTML must be explicitly written by developers
- **Critical:** Never interpolate user-supplied data into i18n strings
- If you ever need to accept user HTML, sanitize with a library like DOMPurify

Use only simple HTML tags: `<strong>`, `<em>`, `<br />`. Avoid event handlers or script tags.

## Checking for Missing Translations

TypeScript will error if you try to access a non-existent key:

```tsx
const { t } = useLanguage();
t.nonexistent.key;  // ❌ TS Error: Property 'nonexistent' does not exist
```

**To add a new section without breaking:**
1. Add the type to `Copy`
2. Add both language dictionaries
3. Re-run `npm run build` or restart dev server

## Best Practices

✓ **Keep strings literal** — no dynamic interpolation in i18n values

✓ **Use simple HTML only** — `<strong>`, `<em>`, `<br />` only (no event handlers)

✓ **Organize by UI section** — nav, hero, about, etc. (one dictionary key per page section)

✓ **Use consistent terminology** — keep equivalent labels aligned across languages

✓ **Test both languages** — toggle language in header, verify all copy updates

✓ **Keep parity** — English and Italian dictionaries should be parallel in structure

✗ **Don't use string concatenation** — avoid `t.first + " " + t.last` (breaks i18n tooling)

✗ **Don't hardcode text** — every UI string goes in i18n.ts

✗ **Don't use `React.createElement` in strings** — use HTML markup instead

## Future Expansions

To add a new language (e.g., Spanish):

1. Add `"es"` to `Lang` type
2. Add Spanish dictionary to `dictionary`
3. Update header language toggle (add `<button>` for ES)
4. Update TypeScript types (will error on missing ES translations)
5. Test language context hydration

## Debugging Language Issues

**String not updating when language toggles?**
- Check `useLanguage()` is being called in the component
- Verify the key path is correct in `t.section.field`
- Check localStorage (might be stale): `localStorage.removeItem('lang')`

**Type error for missing translation?**
- Verify the key exists in BOTH `dictionary.it` and `dictionary.en`
- Re-run `npm run build` to clear type cache

**HTML not rendering in string?**
- Use `dangerouslySetInnerHTML={{ __html: t.key }}` to render HTML
- Avoid JSX syntax inside i18n strings
