# TimeXP

A time tracking app with a fun credits system. Log work sessions with a tag and project, then see a weekly summary of your hours converted into credits you can spend on rewards.

Built with Expo (React Native + web), so it runs in the browser now and can be shipped to the App Store and Play Store later from the same codebase.

## Features

- **Timer** — start/stop a session, attach a tag and project
- **History** — all logged sessions grouped by day, long-press to delete
- **Weekly Summary** — total hours and credits earned this week, broken down by project
- **Credit Rules** — configure earn rates (e.g. 0.5 credits/hr for Study) and spend costs (e.g. 4 credits for a Movie Night)

## Stack

| Layer | Tech |
|---|---|
| App framework | Expo (React Native + web) |
| Routing | Expo Router |
| Styling | NativeWind (Tailwind for React Native) |
| Database | Supabase |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the dashboard go to **Settings → API** and copy your **Project URL** and **anon/public key**
3. Create a `.env` file in the project root (see `.env.example`):

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

4. In the Supabase dashboard go to **SQL Editor**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the two tables and seeds two default credit rules.

### 3. Run

```bash
# Browser
npm run web

# iOS simulator (requires Xcode)
npm run ios

# Android emulator
npm run android
```

## Project structure

```
app/
  _layout.jsx          # Root layout
  (tabs)/
    _layout.jsx        # Tab bar
    index.jsx          # Timer screen
    history.jsx        # History screen
    summary.jsx        # Weekly summary screen
    settings.jsx       # Credit rules screen
lib/
  supabase.js          # Supabase client
supabase/
  schema.sql           # Database schema + seed data
```

## Credit rules

Two rules are seeded by default — edit or delete them in the Credits tab:

- **Study** — earn 0.5 credits per hour (applies to all projects)
- **Movie Night** — spend 4 credits flat

Earn rules can optionally be scoped to a specific project name. Leave the project match blank to apply the rule to all logged time.

## Roadmap

- [ ] Auth (multi-user)
- [ ] Push notification on Saturday with weekly summary
- [ ] Manually log a spend event (e.g. "I watched a movie")
- [ ] Cumulative credit balance across weeks
- [ ] iOS App Store + Google Play release
