# Call Composer

Create and share polished call invites in seconds. The app captures the essentials for any meeting—title, host, schedule, timezone, participants, agenda, and notes—and generates both a human-friendly briefing and an `.ics` calendar file ready to drop into Google Calendar, Outlook, or any standards-compliant calendar tool.

## Tech Stack

- [Next.js 14 (App Router)](https://nextjs.org)
- TypeScript
- Tailwind CSS (v4 preview through `@tailwindcss/postcss`)

## Local Development

```bash
cd agentic-app
npm install
npm run dev
```

Open `http://localhost:3000` in your browser. Edits inside `src/` hot-reload instantly.

## Key Features

- Streamlined form for meeting metadata with timezone-aware scheduling
- Live preview card showing the call brief at a glance
- One-click copy of a rich-text summary for async updates
- Instant `.ics` download with attendee list, agenda, and join link baked in
- Elegant dark UI tuned for presenting during screen shares

## Deploy

The app is optimized for Vercel deployment:

```bash
cd agentic-app
npm run build
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-63eb3a78
```

After deploying, verify with:

```bash
curl https://agentic-63eb3a78.vercel.app
```

> Ensure the `VERCEL_TOKEN` environment variable is available in your shell session before running the commands above.
