# Okno Flow

Administratívny systém pre montáž a predaj okien.

## Štruktúra projektu

```
okno_flow/
├── frontend/   # Next.js 14 + TypeScript + Tailwind
└── backend/    # NestJS (pripravuje sa)
```

## Spustenie frontendu

```bash
cd frontend
npm install
npm run dev
```

Aplikácia beží na http://localhost:3000

## Moduly (MVP)

- Dashboard
- Zákazníci (CRM)
- Cenové ponuky (PDF, email)
- Zameranie
- Zákazky
- Montáže (kalendár)
- Preberací protokol
- Fakturácia

## Tech stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** NestJS, PostgreSQL (pripravuje sa)
- **Design:** Inšpirovaný orsagsro.sk (#66bb6a, #0779e4, Inter)
