# 🌳 Tree Plantation Drive — Full-Stack Platform

A production-ready fundraising platform for tree plantation drives in India.

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Node.js)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth v5 (credentials + Google)
- **Payments**: Razorpay
- **Email**: SendGrid
- **PDF**: Custom HTML templates (print-to-PDF)

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL (local or [Neon.tech](https://neon.tech) free cloud)
- Razorpay test account

### 2. Install

```bash
npm install
```

### 3. Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/tree_platform"
NEXTAUTH_SECRET="generate-with: openssl rand -hex 32"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Razorpay (test keys from dashboard.razorpay.com)
RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxx"
RAZORPAY_KEY_SECRET="your_secret"
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxx"

# Optional: SendGrid for emails
SENDGRID_API_KEY="SG.xxxxxxxxxx"
FROM_EMAIL="noreply@yourdomain.com"
FROM_NAME="Tree Plantation Drive"
```

### 4. Database Setup

```bash
npm run db:generate   # Generate Prisma client
npm run db:migrate    # Create tables
npm run db:seed       # Seed campaigns + admin user
```

### 5. Run

```bash
npm run dev
```

Open: http://localhost:3000

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage with hero, packages, FAQs |
| `/campaigns` | All active campaigns |
| `/donate` | Donation checkout with Razorpay |
| `/success` | Payment success + downloads |
| `/impact` | Public transparency dashboard |
| `/csr` | Corporate CSR inquiry |
| `/dashboard` | Donor's personal dashboard |
| `/admin` | Admin management panel |
| `/auth/login` | Login |
| `/auth/register` | Register |

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/campaigns` | GET | List active campaigns |
| `/api/payment/create-order` | POST | Create Razorpay order |
| `/api/payment/verify` | POST | Verify payment & activate donation |
| `/api/payment/webhook` | POST | Razorpay webhook handler |
| `/api/donations/[id]` | GET | Donation details |
| `/api/receipts/[id]/pdf` | GET | Generate receipt HTML/PDF |
| `/api/certificates/[id]/pdf` | GET | Generate certificate HTML/PDF |
| `/api/admin/export-csv` | GET | Export all donations as CSV |
| `/api/auth/register` | POST | User registration |

---

## Default Admin Login

After seeding:
- **Email**: `admin@treeplantation.org`
- **Password**: `admin@123`

---

## Sponsorship Packages

| Trees | Price |
|-------|-------|
| 1 | ₹450 |
| 11 | ₹4,950 |
| 27 | ₹12,150 |
| 54 | ₹24,300 |
| 108 | ₹48,600 |

---

## Production Deployment

### Vercel (recommended)

```bash
npm install -g vercel
vercel
```

Set environment variables in Vercel dashboard.

### Environment for production

```env
NEXTAUTH_URL="https://yourdomain.com"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
RAZORPAY_KEY_ID="rzp_live_xxxxxxxxxx"   # Use live keys
```

### Razorpay Webhook

In Razorpay dashboard, set webhook URL to:
```
https://yourdomain.com/api/payment/webhook
```

Events to subscribe: `payment.captured`, `payment.failed`

---

## Features Implemented

✅ Homepage with hero, stats, packages, testimonials, FAQ  
✅ All campaign pages  
✅ Donation checkout form  
✅ Razorpay payment integration  
✅ Payment verification  
✅ Webhook handler  
✅ Auto receipt generation (HTML/PDF)  
✅ Auto certificate generation (HTML/PDF)  
✅ Email confirmation (SendGrid)  
✅ Donor dashboard with tree tracking  
✅ Public impact/transparency dashboard  
✅ Corporate CSR page  
✅ Admin panel with donation management  
✅ CSV export  
✅ Auth (credentials + Google OAuth)  
✅ Protected routes (middleware)  
✅ PostgreSQL + Prisma schema  
✅ Database seeding  
✅ Mobile-responsive design  
✅ 80G receipt placeholders  
✅ Dedication support (Maa, Dadi, Beti, etc.)  

---

## Folder Structure

```
tree-platform/
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed data
├── src/
│   ├── app/
│   │   ├── page.tsx          # Homepage
│   │   ├── campaigns/        # Campaigns listing
│   │   ├── donate/           # Donation checkout
│   │   ├── success/          # Payment success
│   │   ├── dashboard/        # Donor dashboard
│   │   ├── impact/           # Public impact dashboard
│   │   ├── csr/              # Corporate CSR
│   │   ├── admin/            # Admin panel
│   │   ├── auth/             # Login/Register
│   │   └── api/              # All API routes
│   ├── components/
│   │   └── layout/           # Navbar, Footer
│   ├── lib/
│   │   ├── prisma.ts         # DB client
│   │   ├── auth.ts           # NextAuth config
│   │   ├── razorpay.ts       # Payment utils
│   │   ├── email.ts          # SendGrid service
│   │   ├── pdf.ts            # PDF/certificate generator
│   │   └── utils.ts          # Helpers + constants
│   └── middleware.ts         # Route protection
├── .env.example
├── next.config.ts
├── tailwind.config.ts
└── package.json
```
