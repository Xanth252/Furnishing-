# Pukale Furnishing Centre CRM - Cloud & Vercel Deployment

This project is a modern full-stack rewrite of the Pukale Furnishing Centre CRM system configured for serverless deployment on **Vercel** with a **PostgreSQL** database.

## Architecture & Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | Angular 17, TypeScript, RxJS, jsPDF, html2canvas | Quotation maker, curtain calculations, invoices, customer & product tracking. |
| **Backend** | Next.js (App Router API routes), TypeScript | 100% route-compatible REST API replacement for ASP.NET Core controllers. |
| **Database** | PostgreSQL | Managed via Prisma ORM with migrations, indexes, and automated seeds. |
| **Authentication** | JWT & BCrypt | Bearer token authentication with secure password hashing. |
| **Reporting** | ExcelJS & jsPDF | Excel workbook export and PDF quotations. |

---

## Directory Structure

```text
deployment/
├── backend/                   # Next.js API server & Prisma ORM
│   ├── app/
│   │   └── api/
│   │       ├── auth/          # Login & token generation
│   │       ├── customers/     # Customer management & history
│   │       ├── dashboard/     # Financial metrics & monthly reports
│   │       ├── particulars/   # Saved items & measurement units
│   │       ├── products/      # Product tracking, stages & Excel export
│   │       ├── quotations/    # Quotation maker, summaries, auto-numbering
│   │       └── settings/      # Business profile & bank details
│   ├── prisma/
│   │   ├── schema.prisma      # PostgreSQL schema
│   │   └── seed.ts            # Default admin & particulars seed
│   ├── lib/                   # Prisma singleton, JWT auth & mappers
│   └── .env.example
├── frontend/                  # Angular 17 Single Page Application
│   ├── src/
│   ├── angular.json
│   ├── proxy.conf.json        # Dev proxy forward to Next.js API
│   └── vercel.json            # Vercel SPA rewrites
└── package.json               # Root scripts
```

---

## Local Development Setup

### 1. Install Dependencies
From the `deployment` root:
```bash
npm run install:all
```

### 2. Set Up PostgreSQL Database
Create a PostgreSQL database (locally, or free on [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app)).

In `deployment/backend/.env`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/curtains_db?schema=public"
JWT_SECRET="your-secure-random-secret-key"
```

Initialize the database schema and seed the default admin account:
```bash
cd backend
npx prisma db push
npx prisma db seed
```

> **Default Login:**
> * Username: `admin`
> * Password: `admin123`

### 3. Run Applications
In terminal 1 (Backend on `http://localhost:3000`):
```bash
npm run dev:backend
```

In terminal 2 (Frontend on `http://localhost:4200`):
```bash
npm run dev:frontend
```
Requests from Angular to `/api` are automatically proxied to `http://localhost:3000/api`.

---

## Deploying to Vercel

### Step 1: Deploy Backend (Next.js)
1. Push your repository to GitHub.
2. In [Vercel](https://vercel.com), click **Add New... > Project** and select the repository.
3. Under **Configure Project**:
   * **Root Directory:** select `deployment/backend`.
   * **Framework Preset:** Next.js.
4. Under **Environment Variables**, add:
   * `DATABASE_URL`: Your cloud PostgreSQL connection string (from Neon, Supabase, or Vercel Postgres).
   * `JWT_SECRET`: A long random secret string.
5. Click **Deploy**. Note your backend domain (e.g., `https://curtains-api.vercel.app`).
6. Run the seed once on your database:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

### Step 2: Deploy Frontend (Angular)
1. In Vercel, click **Add New... > Project** and select the repository again.
2. Under **Configure Project**:
   * **Root Directory:** select `deployment/frontend`.
   * **Framework Preset:** Angular.
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist/frontend/browser`
3. Update `vercel.json` in `deployment/frontend`:
   ```json
   {
     "rewrites": [
       { "source": "/api/(.*)", "destination": "https://curtains-api.vercel.app/api/$1" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
4. Click **Deploy**. Your Angular frontend will now seamlessly call the Next.js API without CORS issues.
