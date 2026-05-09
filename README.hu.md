# react-lens

[English README](./README.md)

Könnyű, gyors statikus ellenőrző eszköz modern React projektekhez.

A React Lens végignézi a React, TypeScript és JavaScript fájlokat, és olyan gyanús mintákat jelez, amelyek nem feltétlenül hibásak szintaktikailag, de később teljesítmény-, karbantarthatósági vagy biztonsági problémát okozhatnak.

Nem ESLint-helyettesítő. Inkább egy kiegészítő fejlesztői eszköz, ami magyarázható javaslatokat ad React architektúra és best practice jellegű problémákra.

## Mire jó?

Reactben sok hiba nem azonnal látszik. A kód működik, de később például:

- felesleges újrarendereléseket okoz,
- stale state problémához vezet,
- nehezebben érthető lesz,
- hibás UI viselkedést okoz lista újrarendezésnél,
- vagy biztonsági kockázatot rejt.

A React Lens célja, hogy ezekre korán figyelmeztessen lokális fejlesztés, pull request vagy CI futás közben.

## Gyors használat

```bash
npx react-lens .
```

pnpm-mel:

```bash
pnpm dlx react-lens .
```

Magyar kimenettel:

```bash
pnpm dlx react-lens . --lang hu
```

CI módban:

```bash
pnpm dlx react-lens . --ci --min-severity warning
```

SARIF riport készítése:

```bash
pnpm dlx react-lens . --format sarif > react-lens.sarif
```

## Példa kimenet

```txt
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ React Lens Jelentés                                                                ┃
┃ Találatok: 2  |  HIBA: 0  FIGYELMEZTETÉS: 2  JAVASLAT: 0  INFO: 0                  ┃
┃ Vizsgált fájlok: 125                                                               ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌────────────────────────────────────────────────────────────────────────────────────
│ #1   FIGYELMEZTETÉS   ● high  ─  Array index used as React key
│ src/components/UserList.tsx:21:9
│
│ Array index used as React key
│ Index keys cause incorrect reconciliation when items are reordered, inserted, or removed.
│
│ Jelenlegi kód:
│    19 │ {items.map((item, index) => (
│    20 │   <div
│ >  21 │     key={index}
│    22 │   >
│
│ Javasolt megoldás:
│ key={item.id}
└────────────────────────────────────────────────────────────────────────────────────
```

## Fő funkciók

- React kód statikus elemzése
- TypeScript és JavaScript támogatás
- olvasható terminálos riport
- magyar és angol kimenet
- JSON és SARIF formátum
- opcionális interaktív terminál UI
- szabályonként állítható súlyosság
- `eslint-plugin-react-hooks` ajánlott szabályainak integrálása
- CI-ben használható hibakódok
- fixture-alapú tesztelés

## Mit ellenőriz?

A React Lens többek között ezeket a mintákat keresi:

| Szabály | Alapértelmezett szint | Jelentés |
| --- | --- | --- |
| `effect-derived-state` | `warning` | Valószínűleg render közben számolható state kerül `useEffect` + `setState` mintába |
| `effect-event-flag` | `warning` | Boolean flag csak azért létezik, hogy egy effectet triggereljen |
| `async-effect-race` | `warning` | Async effect régi választ írhat vissza újabb állapot fölé |
| `missing-effect-cleanup` | `error` | Listener, timer vagy subscription cleanup nélkül |
| `unstable-context-value` | `warning` | Instabil `Context.Provider value` referencia |
| `inline-prop-to-memo` | `warning` | Inline object, array vagy function memoizált child komponensnek |
| `useless-memo` | `info` | Triviális érték fölöslegesen `useMemo`-ba csomagolva |
| `unstable-memo-deps` | `warning` | Instabil érték a memo dependency listában |
| `key-index-risk` | `warning` | Array index használata React `key` propként |
| `rsc-client-boundary` | `warning` | Kliens oldali hook valószínű szerver boundary-ben |
| `server-function-contract` | `error` | Server Function szerződés sérülhet |
| `server-function-untrusted-input` | `warning` | Server Function validálatlan vagy jogosultság nélkül kezelt inputtal |
| `serializable-props-across-boundary` | `warning` | Nem szerializálható prop server/client boundary körül |
| `hydration-root-mismatch-risk` | `warning` | Hydration vagy `createRoot` használati kockázat |
| `dangerous-html-xss-risk` | `error` | Kockázatos `dangerouslySetInnerHTML` használat |
| `client-env-secrets-risk` | `error` | Titkos env változó kliens oldali kódba kerülhet |

A React Hooks hivatalos ajánlott lint szabályai is bekapcsolhatók, ezek `react-hooks/...` prefixszel jelennek meg.

## Konfiguráció

Opcionálisan létrehozható egy `react-lens.config.json` fájl a projekt gyökerében:

```json
{
  "include": ["src/**/*.{ts,tsx,js,jsx}"],
  "ignore": ["dist/**", "node_modules/**"],
  "reactCompiler": "auto",
  "officialHooksLint": "recommended",
  "rolloutMode": "gradual",
  "reactEnvironment": "auto",
  "rules": {
    "effect-derived-state": "warning",
    "missing-effect-cleanup": "error",
    "key-index-risk": "warning",
    "dangerous-html-xss-risk": "error",
    "client-env-secrets-risk": "error"
  }
}
```

A szabályok szintjei:

```txt
off
info
suggestion
warning
error
```

## Parancssori opciók

```bash
react-lens [target] [options]
```

| Opció | Jelentés |
| --- | --- |
| `--format <format>` | Kimenet: `pretty`, `json` vagy `sarif` |
| `--lang <lang>` | Nyelv: `en` vagy `hu` |
| `--min-severity <level>` | Minimum szint: `info`, `suggestion`, `warning`, `error` |
| `--interactive` | Interaktív terminál riport |
| `--theme <theme>` | Interaktív téma: `noir`, `paper`, `amber` |
| `--ci` | Hibakóddal lép ki, ha warning vagy error van |
| `--max-runtime-ms <ms>` | Maximális futási idő ellenőrzése |
| `--perf-baseline-file <path>` | Futási idő baseline fájl |
| `--max-runtime-growth-percent <percent>` | Engedélyezett lassulás baseline-hoz képest |

## Interaktív mód

```bash
react-lens . --interactive
```

Magyarul:

```bash
react-lens . --interactive --lang hu
```

Hasznos billentyűk:

| Billentyű | Művelet |
| --- | --- |
| `↑` / `↓` | Találat kiválasztása |
| `tab` | Szűrő váltása |
| `t` | Téma váltása |
| `o` | Fájl megnyitása |
| `c` | Javasolt fix másolása |
| `q` | Kilépés |

## Mikor hasznos?

A React Lens akkor hasznos, ha:

- gyors React kódminőségi ellenőrzést szeretnél,
- pull request előtt keresnél gyanús mintákat,
- CI-ben szeretnél architektúra/performance jellegű figyelmeztetéseket,
- tanulni szeretnéd, miért lehet egy React minta kockázatos,
- SARIF riportot szeretnél code scanning eszközökhöz.

Nem erre való:

- teljes ESLint helyettesítésre,
- runtime performance profilingra,
- pontos render mérésre,
- formális security auditként.

## Korlátok

A React Lens heurisztikus eszköz. Ez azt jelenti, hogy adhat:

- false positive találatot,
- false negative eredményt,
- framework-specifikus edge case-eket,
- nem teljes biztonsági következtetéseket.

A biztonsági találatokat review-jelzésként érdemes kezelni, nem bizonyított sérülékenységként.

## Fejlesztés

Függőségek telepítése:

```bash
pnpm install
```

Typecheck:

```bash
pnpm exec tsc --noEmit
```

Build:

```bash
pnpm run build
```

Tesztek:

```bash
pnpm run test
```

Teljes ellenőrzés:

```bash
pnpm run check
```

React Lens futtatása saját magán:

```bash
pnpm run build
pnpm run scan
pnpm run scan:hu
```

## Projektstruktúra

```txt
src/cli.ts          CLI belépési pont
src/scanner/        fájlkeresés és elemzési pipeline
src/rules/          React Lens szabályok
src/config/         alapbeállítások és config schema
src/formatters/     pretty, JSON, SARIF és interaktív kimenet
src/i18n/           angol és magyar szövegek
src/docs/           dokumentációs segédlogika
src/perf/           futási idő budget ellenőrzés
tests/fixtures/     positive és negative példák
tests/integration/  integrációs tesztek
tests/rules/        célzott rule tesztek
```

## Licenc

[MIT](./LICENSE)
