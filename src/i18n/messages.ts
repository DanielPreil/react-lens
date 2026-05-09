import type { Severity } from "../types/findings.js";

export type Lang = "en" | "hu";

type UiMessages = {
  reportTitle: string;
  noFindings: string;
  summary: string;
  findings: string;
  filesScanned: string;
  rule: string;
  ruleName: string;
  title: string;
  pattern: string;
  why: string;
  suggestedFix: string;
  confidence: string;
  whenIgnore: string;
  fixSteps: string;
  fixExample: string;
};

type RuleGuide = {
  en: string[];
  hu: string[];
};

type RuleText = {
  title: string;
  pattern: string;
  why: string;
  suggestion: string;
  whenIgnore?: string;
};

export const ui: Record<Lang, UiMessages> = {
  en: {
    reportTitle: "React Lens Report",
    noFindings: "No findings.",
    summary: "Summary",
    findings: "Findings",
    filesScanned: "Files scanned",
    rule: "Rule ID",
    ruleName: "Rule name",
    title: "Title",
    pattern: "Pattern",
    why: "Why it matters",
    suggestedFix: "Suggested fix",
    confidence: "Confidence",
    whenIgnore: "When to ignore",
    fixSteps: "How to fix (step-by-step)",
    fixExample: "Suggested code example"
  },
  hu: {
    reportTitle: "React Lens Jelentés",
    noFindings: "Nincs találat.",
    summary: "Összegzés",
    findings: "Találatok",
    filesScanned: "Vizsgált fájlok",
    rule: "Szabály azonosító",
    ruleName: "Szabály neve",
    title: "Cím",
    pattern: "Minta",
    why: "Miért fontos",
    suggestedFix: "Javasolt javítás",
    confidence: "Bizonyosság",
    whenIgnore: "Mikor hagyható figyelmen kívül",
    fixSteps: "Javítási lépések",
    fixExample: "Javasolt kódminta"
  }
};

export function labelSeverity(severity: Severity, lang: Lang): string {
  if (lang === "hu") {
    if (severity === "error") return "HIBA";
    if (severity === "warning") return "FIGYELMEZTETÉS";
    if (severity === "suggestion") return "JAVASLAT";
    return "INFO";
  }

  if (severity === "error") return "ERROR";
  if (severity === "warning") return "WARNING";
  if (severity === "suggestion") return "SUGGESTION";
  return "INFO";
}

export const ruleNames: Record<Lang, Record<string, string>> = {
  en: {
    "effect-derived-state": "Derived state synchronized in effect",
    "effect-event-flag": "Event flag handled in effect",
    "async-effect-race": "Async effect race condition risk",
    "missing-effect-cleanup": "Missing effect cleanup",
    "unstable-context-value": "Unstable context provider value",
    "inline-prop-to-memo": "Inline prop passed to memoized child",
    "useless-memo": "Trivial memoization",
    "unstable-memo-deps": "Unstable memo dependencies",
    "rsc-client-boundary": "Client-only hook in server boundary",
    "server-function-contract": "Server Function contract violation",
    "server-function-untrusted-input": "Server Function untrusted input risk",
    "serializable-props-across-boundary": "Non-serializable boundary props risk",
    "hydration-root-mismatch-risk": "Hydration/createRoot mismatch risk",
    "dangerous-html-xss-risk": "Potential dangerouslySetInnerHTML XSS risk",
    "client-env-secrets-risk": "Client-side secret env access risk"
  },
  hu: {
    "effect-derived-state": "Származtatott `state` `useEffect`-ben",
    "effect-event-flag": "Esemény-flag kezelése `useEffect`-ben",
    "async-effect-race": "`async` `useEffect` versenyhelyzet kockázat",
    "missing-effect-cleanup": "Hiányzó `useEffect` cleanup",
    "unstable-context-value": "Instabil `Context.Provider value` referencia",
    "inline-prop-to-memo": "Inline `prop` memoizált komponensnek",
    "useless-memo": "Triviális `useMemo` használat",
    "unstable-memo-deps": "Instabil memo `dependency` lista",
    "rsc-client-boundary": "Kliens hook szerver boundary-ben",
    "server-function-contract": "Server Function szerződésszegés",
    "server-function-untrusted-input": "Server Function validálatlan input kockázat",
    "serializable-props-across-boundary": "Nem szerializálható prop boundary kockázat",
    "hydration-root-mismatch-risk": "Hydration/createRoot mismatch kockázat",
    "dangerous-html-xss-risk": "`dangerouslySetInnerHTML` XSS kockázat",
    "client-env-secrets-risk": "Kliens oldali titkos env elérés kockázat"
  }
};

export const ruleGuides: Record<string, RuleGuide> = {
  "effect-derived-state": {
    en: [
      "Find values derived from `props`/`state` and stored via `setState` inside `useEffect`.",
      "Move the computation back into render so the UI has a single source of truth.",
      "Keep memoization only if profiling shows the calculation is expensive.",
      "Re-check `dependency` arrays after refactor."
    ],
    hu: [
      "Keresd meg azokat az értékeket, amik `props`/`state` alapján számolhatók, mégis `setState`-tel mennek `useEffect`-be.",
      "A számítást vidd vissza renderbe, hogy egyetlen forrásból épüljön az állapot.",
      "`useMemo` csak akkor maradjon, ha mérés alapján tényleg drága a számítás.",
      "Refaktor után ellenőrizd újra a `dependency` listát."
    ]
  },
  "effect-event-flag": {
    en: [
      "Locate boolean flags used only to trigger a `useEffect`.",
      "Move event-specific action directly into event handler.",
      "Reserve effects for external synchronization work.",
      "Remove temporary flag state if no longer needed."
    ],
    hu: [
      "Keresd meg a boolean flageket, amelyek csak `useEffect` triggerre szolgálnak.",
      "Az eseményhez tartozó műveletet tedd közvetlenül az event handlerbe.",
      "Az effect maradjon külső rendszerrel való szinkronizálásra.",
      "A feleslegessé váló ideiglenes flag `state`-et töröld."
    ]
  },
  "async-effect-race": {
    en: [
      "Wrap `fetch`/`async` flow with cancellation or stale-response guard.",
      "Prefer `AbortController` where possible.",
      "Guard `setState` calls so older requests cannot override newer data.",
      "Verify behavior with rapidly changing input values."
    ],
    hu: [
      "Az `async`/`fetch` folyamat köré tegyél megszakítást vagy stale-response védelmet.",
      "Elsőként `AbortController` használata javasolt.",
      "A `setState` hívást védd, hogy régi kérés ne írjon felül új adatot.",
      "Teszteld gyorsan változó inputokkal is."
    ]
  },
  "missing-effect-cleanup": {
    en: [
      "List registrations inside effect (`addEventListener`, timer, subscription).",
      "Return cleanup callback from `useEffect`.",
      "Unsubscribe/remove/disconnect everything created in the effect.",
      "Check unmount behavior to confirm no stale updates remain."
    ],
    hu: [
      "Listázd az effecten belüli regisztrációkat (`addEventListener`, timer, subscription).",
      "A `useEffect` adjon vissza cleanup callbacket.",
      "Mindent szedj le cleanupben, amit az effect felregisztrált.",
      "Unmount után ellenőrizd, hogy nincs stale update."
    ]
  },
  "unstable-context-value": {
    en: [
      "Check whether `Context.Provider value` is created inline each render.",
      "Memoize the value object with stable dependencies.",
      "Split unrelated context concerns when value grows.",
      "Re-check consumer render frequency after change."
    ],
    hu: [
      "Nézd meg, hogy a `Context.Provider value` inline jön-e létre minden rendernél.",
      "A `value` objektumot memoizáld stabil dependency-kkel.",
      "Nagy `value` esetén bontsd külön context-ekre a független részeket.",
      "Utána ellenőrizd újra a consumer re-render gyakoriságát."
    ]
  },
  "inline-prop-to-memo": {
    en: [
      "Find inline object/array/function props passed to `React.memo` children.",
      "Hoist static values outside component body.",
      "Use `useMemo`/`useCallback` only where stable reference is needed.",
      "Validate whether memoization now actually skips renders."
    ],
    hu: [
      "Keresd meg az inline object/array/function propokat `React.memo` childokon.",
      "Az állandó értékeket emeld ki a komponens törzsén kívülre.",
      "`useMemo`/`useCallback` csak ott kell, ahol tényleg stabil referencia kell.",
      "Ellenőrizd, hogy a memoizálás valóban csökkenti-e a render számot."
    ]
  },
  "useless-memo": {
    en: [
      "Review `useMemo` blocks computing trivial expressions.",
      "Remove memoization where it adds noise without measurable gain.",
      "Keep memo only for proven expensive computation or reference stability.",
      "Re-profile after cleanup if performance was the original concern."
    ],
    hu: [
      "Nézd át a triviális kifejezést számoló `useMemo` blokkokat.",
      "Ahol nincs mérhető nyereség, ott a memoizálást vedd ki.",
      "`useMemo` csak bizonyítottan drága számításnál vagy referencia-stabilitáshoz maradjon.",
      "Ha ez teljesítmény miatt került be, profilozz újra takarítás után."
    ]
  },
  "unstable-memo-deps": {
    en: [
      "Inspect dependency arrays for inline object/array/function values.",
      "Stabilize dependencies before using them in `useMemo`/`useCallback`.",
      "Extract dependency creation or memoize that dependency first.",
      "Confirm dependency list still reflects real data flow."
    ],
    hu: [
      "Vizsgáld át a dependency listát inline object/array/function elemekre.",
      "A dependency-ket stabilizáld, mielőtt `useMemo`/`useCallback` használja őket.",
      "Emeld ki a dependency létrehozását, vagy azt memoizáld először.",
      "Ellenőrizd, hogy a dependency lista továbbra is valós adatfolyamot tükröz."
    ]
  },
  "rsc-client-boundary": {
    en: [
      "Identify interactive hooks in modules likely evaluated on the server.",
      "Move interactive state/effects into a dedicated `use client` component.",
      "Keep server components focused on data loading and composition.",
      "Re-check boundaries after refactor."
    ],
    hu: [
      "Keresd meg a szerveren futó modulokban használt interaktív hookokat.",
      "Az interaktív state/effect logikát vidd külön `use client` komponensbe.",
      "A szerver komponens maradjon adatbetöltésre és kompozícióra.",
      "Refaktor után ellenőrizd újra a boundary-kat."
    ]
  },
  "server-function-contract": {
    en: [
      "Check `use server` directive placement at module/function top.",
      "Ensure every server-callable function is async.",
      "Split mixed client/server modules into explicit boundaries.",
      "Retest client calls and form actions."
    ],
    hu: [
      "Ellenőrizd, hogy a `use server` direktíva a modul/függvény tetején van-e.",
      "Minden szerverről hívható függvény legyen `async`.",
      "A vegyes kliens/szerver logikát bontsd külön modulokra.",
      "Teszteld újra a kliens hívásokat és form actionöket."
    ]
  },
  "server-function-untrusted-input": {
    en: [
      "Treat every Server Function argument as user-controlled input.",
      "Validate with schemas and enforce authorization before mutations.",
      "Sanitize/escape sensitive fields where relevant.",
      "Add tests for invalid and unauthorized payloads."
    ],
    hu: [
      "Minden Server Function argumentumot kezeld kliens által kontrollált inputként.",
      "Mutáció előtt legyen schema-validáció és jogosultság-ellenőrzés.",
      "Szükség esetén sanitize/escape lépéseket is tegyél be.",
      "Írj tesztet hibás és jogosulatlan payloadokra is."
    ]
  },
  "serializable-props-across-boundary": {
    en: [
      "Inspect props crossing server/client boundaries.",
      "Avoid passing inline callbacks or complex instances as boundary props.",
      "Pass serializable data, or use Server Function references where needed.",
      "Re-run boundary tests after changes."
    ],
    hu: [
      "Vizsgáld át a szerver/kliens boundary-n átadott propokat.",
      "Kerüld az inline callbackek és komplex objektumok átadását.",
      "Adj át szerializálható adatot, vagy használj Server Function referenciát.",
      "Módosítás után futtasd újra a boundary teszteket."
    ]
  },
  "hydration-root-mismatch-risk": {
    en: [
      "Verify SSR entrypoints use `hydrateRoot` for server-rendered HTML.",
      "Avoid using `createRoot` where hydration is expected.",
      "Match `identifierPrefix` between server render and client hydration.",
      "Test hydration warnings in development."
    ],
    hu: [
      "Ellenőrizd, hogy SSR esetén `hydrateRoot` fut-e a kliensen.",
      "Hydration kontextusban ne `createRoot`-ot használj.",
      "A `identifierPrefix` érték egyezzen szerver és kliens oldalon.",
      "Fejlesztői módban nézd át a hydration warningokat."
    ]
  },
  "dangerous-html-xss-risk": {
    en: [
      "Track every `dangerouslySetInnerHTML` usage and its data source.",
      "Sanitize dynamic HTML with a vetted sanitizer before render.",
      "Prefer structured JSX rendering for trusted UI data.",
      "Add security tests for script/event-handler payload injection."
    ],
    hu: [
      "Kövesd végig a `dangerouslySetInnerHTML` használat adatforrását.",
      "A dinamikus HTML-t render előtt valid sanitizerrel tisztítsd.",
      "Megbízható UI adatoknál inkább strukturált JSX renderelést használj.",
      "Adj security tesztet script/event handler payloadokra."
    ]
  },
  "client-env-secrets-risk": {
    en: [
      "List env variables used in client modules.",
      "Keep secret values server-only and expose explicit public aliases.",
      "Use explicit public prefixes (for example `NEXT_PUBLIC_` or `VITE_`) only for non-sensitive values.",
      "Rebuild and inspect client bundles when introducing env usage."
    ],
    hu: [
      "Listázd a kliens modulokban használt env változókat.",
      "A titkos értékek maradjanak szerver oldalon, kliensre csak publikus alias menjen.",
      "Publikus prefixet (pl. `NEXT_PUBLIC_`, `VITE_`) csak nem érzékeny értékre használj.",
      "Env bevezetés után ellenőrizd újra a kliens bundle-t."
    ]
  }
};

export const ruleTextsHu: Partial<Record<string, RuleText>> = {
  "effect-derived-state": {
    title: "Származtatott `state` valószínűleg `useEffect`-ben van szinkronizálva",
    pattern: "`setState` hívás látható `useEffect`-en belül.",
    why: "Ez gyakran extra renderhez és stale `state` kockázathoz vezet.",
    suggestion: "A származtatott értéket renderben számold, és `useMemo` csak drága számításnál maradjon.",
    whenIgnore: "Akkor hagyd így, ha külső rendszerrel szinkronizálsz az effectben."
  },
  "effect-event-flag": {
    title: "`useEffect` valószínűleg esemény-flag triggerre van használva",
    pattern: "Boolean flag + `useEffect` trigger minta detektálva.",
    why: "Az eseménylogika effectben nehezebben követhető és hibára hajlamosabb.",
    suggestion: "Az akciót közvetlenül az eseménykezelőben futtasd.",
    whenIgnore: "Ha nem eseményreakcióról van szó, hanem tényleges külső szinkronról."
  },
  "async-effect-race": {
    title: "`async` effect stale állapotot frissíthet",
    pattern: "`async` effectben van `setState`, de nincs cancel/stale guard.",
    why: "Régebbi kérés visszaírhatja az újabb állapotot.",
    suggestion: "Használj `AbortController`-t vagy ignore flaget cleanup-pal.",
    whenIgnore: "Csak akkor, ha garantáltan egyetlen kérés fut és nem lehet versenyhelyzet."
  },
  "missing-effect-cleanup": {
    title: "Effect mellékhatás cleanup nélkül",
    pattern: "Listener/timer/subscription regisztráció cleanup nélkül.",
    why: "Memóriaszivárgást vagy stale update-et okozhat.",
    suggestion: "Adj vissza cleanup függvényt, ami mindent leszed, amit az effect felrakott.",
    whenIgnore: "Ritka esetben kihagyható, ha az erőforrás élettartama biztosan megegyezik a teljes appal."
  },
  "unstable-context-value": {
    title: "Instabil `Context.Provider value` referencia",
    pattern: "Inline object/array/function megy a `Provider value`-ba.",
    why: "Új referencia miatt a consumerek feleslegesen újrarenderelhetnek.",
    suggestion: "Memoizáld a provider `value`-t, vagy bontsd kisebb context-ekre.",
    whenIgnore: "Ha a provider ritkán renderel újra és a consumer kör kicsi."
  },
  "inline-prop-to-memo": {
    title: "Inline `prop` memoizált komponensnek átadva",
    pattern: "Inline object/array/function `prop` memoized childon.",
    why: "A referencia változás gyengíti a `React.memo` hatását.",
    suggestion: "Emeld ki az állandó értékeket vagy memoizáld a referenciát.",
    whenIgnore: "Ha a child eleve mindig újrarenderel valós oka miatt, vagy nincs teljesítménygond."
  },
  "useless-memo": {
    title: "Triviális számítás `useMemo`-ba csomagolva",
    pattern: "A `useMemo` valószínűleg egyszerű kifejezést memoizál.",
    why: "A kézi memoizáció bonyolultságot adhat valódi nyereség nélkül.",
    suggestion: "Vedd ki a `useMemo`-t, ha nincs mérhető teljesítményelőny.",
    whenIgnore: "Akkor maradhat, ha referencia-stabilitás miatt szükséges memoized child felé."
  },
  "unstable-memo-deps": {
    title: "Memo hook instabil `dependency`-t tartalmaz",
    pattern: "`dependency` listában inline object/array/function található.",
    why: "Instabil dependency miatt a memoizáció minden rendernél érvénytelenedhet.",
    suggestion: "Stabilizáld vagy emeld ki külön a dependency-k előállítását.",
    whenIgnore: "Ha a memo eredménye szándékosan minden rendernél újraszámolandó."
  },
  "rsc-client-boundary": {
    title: "Kliens-only hook valószínűleg szerver boundary-ben fut",
    pattern: "Interaktív hook található szervernek tűnő modulban.",
    why: "A Server Component nem használhat kliens interaktív hookokat.",
    suggestion: "Az interaktív részt tedd `use client` komponensbe, és adat-propot adj át."
  },
  "server-function-contract": {
    title: "Server Function szerződés megsértése",
    pattern: "`use server` direktíva/`async` szerződés sérül.",
    why: "A kliensről hívható szerverfüggvény hálózati művelet, ezért szerződése kötött.",
    suggestion: "A `use server` kerüljön felülre, és a függvény legyen `async`."
  },
  "server-function-untrusted-input": {
    title: "Server Function validálatlan inputot kezelhet",
    pattern: "Mutáció látható validáció/jogosultság ellenőrzés nélkül.",
    why: "A Server Function bemenet kliens-kontrollált, ezért nem megbízható.",
    suggestion: "Végezz schema-validációt és authz ellenőrzést minden mutáció előtt."
  },
  "serializable-props-across-boundary": {
    title: "Nem szerializálható prop mehet át boundary-n",
    pattern: "Inline callback/komplex prop látható boundary-közeli JSX-ben.",
    why: "A server->client propoknak szerializálhatónak kell lenniük (vagy server reference-nek).",
    suggestion: "Adj át szerializálható adatot vagy Server Function referenciát."
  },
  "hydration-root-mismatch-risk": {
    title: "Hydration root mismatch kockázat",
    pattern: "SSR és root API-k használata nem konzisztens.",
    why: "Rossz root API vagy eltérő prefix hydration eltérésekhez vezethet.",
    suggestion: "SSR markuphoz `hydrateRoot`-ot használj és egyeztesd az `identifierPrefix` értéket."
  },
  "dangerous-html-xss-risk": {
    title: "Lehetséges XSS kockázat `dangerouslySetInnerHTML` használattal",
    pattern: "Dinamikus HTML kerülhet `__html` mezőbe egyértelmű sanitize nélkül.",
    why: "A nem tisztított HTML script futtatást és kliens oldali támadást okozhat.",
    suggestion: "Tisztítsd a HTML-t megbízható sanitizerrel, vagy használj JSX renderelést."
  },
  "client-env-secrets-risk": {
    title: "Titkos env változó kliens kódba kerülhet",
    pattern: "Nem publikus `process.env.*` referencia látható kliens modulban.",
    why: "Érzékeny konfiguráció browser bundle-be szivároghat.",
    suggestion: "Titkos env-et csak szerveren olvass, kliensre csak explicit publikus változót adj."
  }
};

export const ruleExamples: Record<Lang, Record<string, string>> = {
  en: {
    "effect-derived-state": "const fullName = `${firstName} ${lastName}`;",
    "effect-event-flag": "const handleClick = async () => {\n  await submitForm();\n};",
    "async-effect-race": "useEffect(() => {\n  const controller = new AbortController();\n\n  const load = async () => {\n    const res = await fetch(url, { signal: controller.signal });\n    setData(await res.json());\n  };\n\n  load();\n\n  return () => controller.abort();\n}, [url]);",
    "missing-effect-cleanup": "useEffect(() => {\n  window.addEventListener(\"resize\", onResize);\n  return () => window.removeEventListener(\"resize\", onResize);\n}, [onResize]);",
    "unstable-context-value": "const value = useMemo(() => ({ user, logout }), [user, logout]);\n\nreturn <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;",
    "inline-prop-to-memo": "const columns = useMemo(() => [{ key: \"name\" }], []);\nreturn <UserTable columns={columns} />;",
    "useless-memo": "const normalized = name.trim();",
    "unstable-memo-deps": "const options = useMemo(() => ({ mode }), [mode]);\nconst value = useMemo(() => compute(list, options), [list, options]);",
    "rsc-client-boundary": "\"use client\";\nimport { useState } from \"react\";\n\nexport default function Counter() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;\n}",
    "server-function-contract": "\"use server\";\n\nexport async function createPost(formData: FormData) {\n  // ...\n}",
    "server-function-untrusted-input": "const parsed = schema.parse(input);\nawait authorize(session.user, \"update\");\nawait db.post.update({ data: parsed });",
    "serializable-props-across-boundary": "return <ClientWidget userId={user.id} onSubmit={submitAction} />;",
    "hydration-root-mismatch-risk": "hydrateRoot(domNode, <App />, { identifierPrefix: \"app-1\" });\n// Server render uses the same identifierPrefix.",
    "dangerous-html-xss-risk": "const clean = DOMPurify.sanitize(untrustedHtml);\nreturn <div dangerouslySetInnerHTML={{ __html: clean }} />;",
    "client-env-secrets-risk": "// Client: only read explicit public keys\nconst analyticsId = process.env.NEXT_PUBLIC_ANALYTICS_ID;"
  },
  hu: {
    "effect-derived-state": "const fullName = `${firstName} ${lastName}`;",
    "effect-event-flag": "const handleClick = async () => {\n  await submitForm();\n};",
    "async-effect-race": "useEffect(() => {\n  const controller = new AbortController();\n\n  const load = async () => {\n    const res = await fetch(url, { signal: controller.signal });\n    setData(await res.json());\n  };\n\n  load();\n\n  return () => controller.abort();\n}, [url]);",
    "missing-effect-cleanup": "useEffect(() => {\n  window.addEventListener(\"resize\", onResize);\n  return () => window.removeEventListener(\"resize\", onResize);\n}, [onResize]);",
    "unstable-context-value": "const value = useMemo(() => ({ user, logout }), [user, logout]);\n\nreturn <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;",
    "inline-prop-to-memo": "const columns = useMemo(() => [{ key: \"name\" }], []);\nreturn <UserTable columns={columns} />;",
    "useless-memo": "const normalized = name.trim();",
    "unstable-memo-deps": "const options = useMemo(() => ({ mode }), [mode]);\nconst value = useMemo(() => compute(list, options), [list, options]);",
    "rsc-client-boundary": "\"use client\";\nimport { useState } from \"react\";\n\nexport default function Counter() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;\n}",
    "server-function-contract": "\"use server\";\n\nexport async function createPost(formData: FormData) {\n  // ...\n}",
    "server-function-untrusted-input": "const parsed = schema.parse(input);\nawait authorize(session.user, \"update\");\nawait db.post.update({ data: parsed });",
    "serializable-props-across-boundary": "return <ClientWidget userId={user.id} onSubmit={submitAction} />;",
    "hydration-root-mismatch-risk": "hydrateRoot(domNode, <App />, { identifierPrefix: \"app-1\" });\n// Szerver oldalon ugyanaz az identifierPrefix.",
    "dangerous-html-xss-risk": "const clean = DOMPurify.sanitize(untrustedHtml);\nreturn <div dangerouslySetInnerHTML={{ __html: clean }} />;",
    "client-env-secrets-risk": "// Kliens oldalon csak publikus kulcsot olvass\nconst analyticsId = process.env.NEXT_PUBLIC_ANALYTICS_ID;"
  }
};
