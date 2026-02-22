# Fiscio 🧾

> AI-native administratie voor Nederlandse ZZP'ers

Ritregistratie · Bonnetjes scannen · Peppol facturatie · AI belastingadvies

## Stack

| Laag | Technologie |
|------|-------------|
| Monorepo | Turborepo |
| Web | Next.js 15 (App Router, TypeScript) |
| Mobile | Expo SDK 52 (React Native) |
| API | tRPC v11 |
| Database | Supabase (PostgreSQL) |
| ORM | Drizzle |
| Auth | Supabase Auth |
| Styling web | Tailwind CSS v4 |

## Structuur

```
fiscio/
├── apps/
│   ├── web/        → Next.js dashboard (vercel deploy)
│   └── mobile/     → Expo app (iOS + Android)
├── packages/
│   ├── api/        → tRPC router (gedeeld)
│   ├── db/         → Drizzle schema + client
│   └── ui/         → Gedeelde React components
├── turbo.json
└── tsconfig.base.json
```

## Aan de slag

### Vereisten
- Node.js 22+
- npm 10+

### Installeren

```bash
npm install
```

### Environment variabelen

Kopieer het voorbeeld en vul je Supabase gegevens in:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Vul in `apps/web/.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `DATABASE_URL` — Supabase Transaction Pooler URL

### Development starten

```bash
npm run dev
```

- Web: http://localhost:3000
- Mobile: Scan QR code met Expo Go

### Database migraties

```bash
npm run db:push
```

## Roadmap

Zie [GitHub Projects](https://github.com/users/gjrkdk/projects/4) voor de actuele status.

- **Phase 1 — MVP**: Ritten, kosten, facturen, auth
- **Phase 2 — AI Adviseur**: OCR, belastingtips, Peppol
- **Phase 3 — Web & Schaal**: Web dashboard, analytics
- **Phase 4 — Expansie**: België, Duitsland
