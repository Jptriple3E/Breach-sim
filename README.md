# BREACH — Terminal Hacking Simulator

A retro-terminal styled hacking simulator with a **real, working backend**:
user accounts, password hashing, JWT auth, a persistent SQLite database, and
a REST API. All "hacking" is scripted and fictional — no real network
scanning, exploitation, or system access ever happens. It's a game, safe to
run anywhere, and doubles as a full-stack portfolio project.

## Stack

- **Backend:** Node.js + Express
- **Database:** SQLite (via `better-sqlite3`) — file-based, persists in `db/breach.db`
- **Auth:** bcrypt password hashing + JWT tokens
- **Frontend:** plain HTML/CSS/JS terminal UI (no framework needed)

## Local setup

```bash
npm install
cp .env.example .env   # then edit .env and set JWT_SECRET
npm start
```

Then open **http://localhost:3000** in your browser.

By default (no `DATABASE_URL` set) it uses a local SQLite file, created
automatically at `db/breach.db`. Delete that file any time to reset all
users/progress.

## Deployment

The app auto-switches database backend: set `DATABASE_URL` to use Postgres
(works on serverless/ephemeral-filesystem hosts), or leave it unset to use
SQLite (needs a host with persistent disk).

### Required environment variables in production

| Variable | Required | Notes |
|---|---|---|
| `JWT_SECRET` | **Yes** | Long random string. Server refuses to boot in production without it. Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `DATABASE_URL` | No | Postgres connection string. Omit to use SQLite instead. |
| `CORS_ORIGIN` | Recommended | Your deployed frontend's URL. Defaults to `*` (open) if unset. |
| `PORT` | No | Most hosts set this for you. |
| `NODE_ENV` | Recommended | Set to `production` to enable the JWT_SECRET safety check. |

### Option A — Railway / Render / Fly.io (SQLite, persistent volume)

1. Push this project to a GitHub repo.
2. Create a new app on the platform, pointing at the repo.
3. Set env vars: `JWT_SECRET`, `NODE_ENV=production`, `CORS_ORIGIN`.
4. Mount a persistent volume at `/app/db` (Railway: "Volumes" tab; Fly.io: `fly volumes create`; Render: paid disk add-on).
5. Deploy — the platform will run `npm start` (or the Dockerfile, if it detects one).

### Option B — Any platform with Postgres (serverless-friendly)

Use this if your host doesn't support persistent disks (e.g. Vercel), or
you just prefer a managed database.

1. Create a free Postgres database on **Supabase**, **Neon**, or **Railway**.
2. Copy its connection string into `DATABASE_URL`.
3. Set `JWT_SECRET` and `NODE_ENV=production` as above.
4. Deploy. On first boot the app automatically creates the `users` and
   `progress` tables via `db.init()` — no manual migration needed.

### Option C — Docker (portable, works on most hosts)

```bash
docker build -t breach-sim .
docker run -p 3000:3000 \
  -e JWT_SECRET=your-long-random-secret \
  -e NODE_ENV=production \
  -v breach-data:/app/db \
  breach-sim
```

Swap in `-e DATABASE_URL=...` instead of the volume mount if using Postgres.

## How it works

1. Sign up / log in (passwords are hashed with bcrypt, sessions use JWT).
2. Pick a mission from the sidebar.
3. Type commands into the terminal. Each mission is a scripted sequence of
   steps — type the expected (fictional) command and the simulator
   advances, awarding points on completion. Type `hint` if stuck.
4. Progress and score persist in the database and show on the leaderboard.

## Project structure

```
breach-sim/
├── server.js              # Express app entry point
├── db/
│   ├── database.js        # SQLite schema + connection
│   ├── missions.js        # Mission scripts (edit this to add missions!)
│   └── breach.db          # created at runtime
├── middleware/
│   └── auth.js            # JWT verification middleware
├── routes/
│   ├── auth.js             # POST /api/auth/signup, /login
│   ├── missions.js         # GET/POST /api/missions/...
│   └── leaderboard.js      # GET /api/leaderboard
└── public/                # static frontend (served by Express)
    ├── index.html
    ├── style.css
    └── terminal.js
```

## Adding your own missions

Open `db/missions.js` and add an object to the `MISSIONS` array. Each
mission has a `briefing` and a `steps` array; each step has a `match`
(regex the user's typed command must satisfy) and an `output` string shown
back. Set `completesMission: true` on the final step to award points.

## API reference

| Method | Endpoint                          | Auth | Description                       |
|--------|------------------------------------|------|------------------------------------|
| POST   | `/api/auth/signup`                | No   | Create account, returns JWT       |
| POST   | `/api/auth/login`                 | No   | Log in, returns JWT               |
| GET    | `/api/missions`                   | Yes  | List missions + your progress     |
| GET    | `/api/missions/:id`                | Yes  | Get one mission's briefing/state  |
| POST   | `/api/missions/:id/command`        | Yes  | Submit a terminal command         |
| GET    | `/api/leaderboard`                 | Yes  | Top 10 scores                     |

Send the JWT as `Authorization: Bearer <token>` on protected routes.

## Notes on safety

This project deliberately contains **no** real scanning, exploitation, or
credential-attack code. All "vulnerabilities," "hashes," and "exploits" are
fictional strings matched by regex — nothing here talks to a real network
or system. That's intentional: it's what makes it safe to hand to anyone,
run on any machine, and put in a portfolio without caveats.
