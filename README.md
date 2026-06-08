This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### 1. 環境設定（必做）

複製 `.env.example` 為 `.env.local`，然後把值填上：

```bash
cp .env.example .env.local
# 然後用編輯器把 .env.local 裡的 placeholder 改成你的真實值
```

需要的環境變數分兩類：
- **Server-only（敏感）**：`SUPABASE_SERVICE_ROLE_KEY` / `TELEGRAM_BOT_TOKEN` / `TELEGRAM_SECRET` / `TELEGRAM_ADMIN_ID` / `ADMIN_PASSWORD`
- **Client + Server**：`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` / `NEXT_PUBLIC_SITE_URL` + 主題色 + 班別時段

完整說明都在 `.env.example` 註解裡。

### 2. 啟動開發伺服器

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
