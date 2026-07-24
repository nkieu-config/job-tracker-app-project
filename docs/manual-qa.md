# Manual QA — click-through smoke test

A click-through checklist to confirm the app works end to end. Run it against
either target:

- **Production:** your live Vercel URL.
- **Local:** `npm run dev`, then open <http://localhost:3000>.

> Tip: the demo account is pre-populated, so you can test everything without
> entering data yourself. Some steps need env vars — the table notes which.

## What the browser suite already covers

`npm run test:e2e` drives 17 Playwright tests over sign-in, Today, the board,
the desk tabs, the full create → edit → delete lifecycle, and an axe pass on
every screen. CI runs it on every push and pull request.

It deliberately skips three things, and those are what this checklist is really
for:

- **the AI actions** — they spend the shared 30-calls-per-hour budget
- **resume upload and View PDF** — they need a real blob store
- **drag-and-drop on the board** — a real pointer drag is the only honest test

Steps marked 🤖 below are also asserted by that suite, so a full manual pass is
only worth it before a release. Day to day, the unmarked steps are the ones
worth clicking.

## Which feature needs which env var

| Feature | Needs |
| --- | --- |
| Sign in / sign up, applications CRUD, the board, Today | `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` |
| Resume upload + "View PDF" | `BLOB_READ_WRITE_TOKEN` |
| Every AI action — read a posting, score resumes, tailor, prep, coach, autofill | `GEMINI_API_KEY` |
| Password-reset email | `RESEND_API_KEY`, `EMAIL_FROM` |
| The AI usage page in the nav | `ADMIN_EMAILS` (your address) |

## Checklist

### Getting in

| # | Do this | Where | Expected result |
| --- | --- | --- | --- |
| 1 | Click **Try the live demo** | landing page | Lands on `/dashboard`, signed in as Demo User 🤖 |
| 2 | Or sign in as `demo@jobtracker.app` / `demotracker2026` | `/sign-in` | Same page — **Try the demo account** does it in one click 🤖 |

### Today

| # | Do this | Where | Expected result |
| --- | --- | --- | --- |
| 3 | Read the headline and the agenda under it | `/dashboard` | "*N* things worth doing", over a list of real reasons — a deadline inside the week, an interview with no prep sheet, a posting saved but never read, an application gone quiet 🤖 |
| 4 | Click an agenda item | `/dashboard` | Goes to the application it names |
| 5 | Look at the **AI coach** card | `/dashboard` | A short strategic brief, stamped with when it was generated |
| 6 | Click **Refresh coaching** _(AI)_ | `/dashboard` | A new brief replaces the old one, and the skill it tells you to prioritise is a gap that actually appears in your postings |
| 7 | Check **How the search is going** | `/dashboard` | Response / Interview / Offer rates, the funnel, **Weekly activity**, **Resume fit** and **Skills to focus on** — all populated, none empty 🤖 |
| 8 | Check **Every deadline ahead** | `/dashboard` | Upcoming deadlines, soonest first 🤖 |
| 9 | Click a funnel stage, e.g. **Applied** | `/dashboard` | The applications list, filtered to that status 🤖 |

### Getting around

| # | Do this | Where | Expected result |
| --- | --- | --- | --- |
| 10 | Click **Applications** in the nav | nav | The board: Saved → Applied → Interview → Offer → Rejected, with counts 🤖 |
| 11 | **Drag a card** into another column | board | It moves immediately; reload and it is still there |
| 12 | Switch to the list view | board | Search, status chips and sort all work — and each one shows up in the URL 🤖 |
| 13 | Press `⌘K` (or `Ctrl+K`), type part of a company name, press `Enter` | anywhere in the dashboard | The palette filters as you type and lands on that application; `Esc` closes it and gives focus back 🤖 |

### The desk

| # | Do this | Where | Expected result |
| --- | --- | --- | --- |
| 14 | Open **Acme Corp · Senior Backend Engineer** | list or board | Two panes — the posting on the left, tabs on the right. It sits at Interview, so it opens on **Prep** 🤖 |
| 15 | Read the posting itself | desk | Required skills your resume covers are **highlighted**; the ones it does not are **underlined in red** (Kubernetes, on the seeded data) 🤖 |
| 16 | Open the **Match** tab | desk | **Skills analysis** lists every required skill as matched or missing, with **Resume fit** below it 🤖 |
| 17 | Click **Read it again** _(AI)_ | Match | Shows "Analyzing…", then the analysis refreshes with no error |
| 18 | Click **Score my resumes** / **Score again** _(AI)_ | Match | Resume versions ranked by match %, banded Strong / Moderate / Weak |
| 19 | Open **Tailor**, paste a sentence of experience, submit _(AI)_ | desk | Bullets **stream in** live, and survive a reload |
| 20 | Open **Prep**, click **Draft my prep sheet** / **Write a new sheet** _(AI)_ | desk | The sheet streams in — technical questions, behavioural questions, questions to ask back, each with an answer key |
| 21 | Click **Practise** | Prep | One question at a time, answer key hidden until you ask for it, with a progress bar |

### Capture

| # | Do this | Where | Expected result |
| --- | --- | --- | --- |
| 22 | Paste a job description into the posting field, click **Read the posting** _(AI)_ | `/dashboard/applications/new` | Company, role and deadline fill themselves in and stay marked in highlighter until you edit them; a field the posting never stated says so instead of guessing 🤖 |
| 23 | Submit the form | new | Saved; it appears on the board and the Today counts move 🤖 |
| 24 | Edit it — change the role and the status — then save | detail → Edit | Both persist, and it moves to the new status filter 🤖 |
| 25 | Delete it | detail | Asks to confirm, then it is gone from the board 🤖 |

### Resumes and admin

| # | Do this | Where | Expected result |
| --- | --- | --- | --- |
| 26 | Upload a small text-based PDF _(Blob)_ | `/dashboard/resumes` | Upload succeeds, the extracted text shows on the resume page, and **View PDF** opens the file |
| 27 | Upload a scanned, image-only PDF _(Blob)_ | `/dashboard/resumes` | Rejected with "no readable text" rather than saved empty |
| 28 | Open **AI usage** _(admin)_ | nav | Tokens and cost per AI feature, reflecting the calls you just made |

### Getting out

| # | Do this | Where | Expected result |
| --- | --- | --- | --- |
| 29 | Click **Sign out** | nav | Back to the sign-in page 🤖 |
| 30 | While signed out, open `/dashboard` directly | URL bar | Redirected to `/sign-in` 🤖 |

## If something fails

- **An AI button errors** → check `GEMINI_API_KEY` is set (locally in `.env`; in
  prod, in Vercel env vars). In production, redeploy after changing env vars.
- **Upload or View PDF fails** → `BLOB_READ_WRITE_TOKEN` is missing; set it and
  redeploy.
- **Hit "AI rate limit reached"** → expected after 30 AI actions/hour per user;
  wait, or use a different account.
- **Sign-in returns a 500 in production** → most likely a migration that never
  reached the production database. Vercel does not run `prisma migrate deploy`
  for you — see [deploy.md](deploy.md).
- **Sign-in bounces, or the session does not stick** → `BETTER_AUTH_URL` has to
  match the origin you are browsing, exactly.
- **"Too many attempts" on sign-in** → the auth limiter doing its job: 10
  sign-ins per 5 minutes, 5 sign-ups per hour.
- **No AI usage link in the nav** → your address is not in `ADMIN_EMAILS`.
- **Env var added but still failing** → Vercel only applies new env vars to
  _new_ deployments. Redeploy (Deployments → ⋯ → Redeploy).

## Automated checks (no clicking)

```bash
npm run lint        # code style
npm run typecheck   # types
npm test            # unit/component tests
npm run test:e2e    # browser suites (needs the app running at BASE_URL)
npm run build       # production build
```

## Related docs

- [Local setup & scripts](setup.md)
- [Deploy guide](deploy.md)
