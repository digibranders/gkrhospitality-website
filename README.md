# GKR Hospitality - Web Application

A modern, high-performance web application for GKR Hospitality, redesigned and migrated to **Next.js 15**. This project features a premium design with smooth animations, responsive layouts, and optimized performance.

## 🚀 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Testing**: [Vitest](https://vitest.dev/) & [React Testing Library](https://testing-library.com/)

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ installed on your machine.

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd garrett-ronan-web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🧪 Testing

This project uses **Vitest** for unit testing. The test suite covers all major pages (`Home`, `About`, `Services`, `Contact`) and core components (`Navbar`, `Footer`).

Run tests:

```bash
npm test
```

## 📊 Analytics

Google Tag Manager is loaded site-wide from the root layout via
`src/components/common/GoogleTagManager.tsx` (container **GTM-TG8GB3PP**),
including the `<noscript>` fallback for clients without JavaScript.

To point a build at a different container — or to disable GTM locally — set the
environment variable before building:

```bash
# .env.local
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX   # empty value disables GTM entirely
```

## 📦 Building for Production

To create an optimized production build:

```bash
npm run build
```

To run the production build locally:

```bash
npm start
```

## Deploying

The site is hosted on Vercel (project `gkrhospitality-website`, team "Digibranders' projects"), connected to this repository through the Vercel GitHub App.

- Work happens on `development`. Every push there builds a Preview deployment.
- Merging a pull request into `main` deploys to production at www.gkrhospitality.com.

Vercel only builds commits whose author email matches the GitHub account of a Vercel team member. Commit with the email verified on your GitHub account (`git config user.email`), and ask the team owner to add you to the Vercel team if you are not in it.

If pushes stop producing deployments, check Vercel > Settings > Git. From March to September 2026 the connection showed as connected but received no pushes; disconnecting and reconnecting the repository fixed it.

## 📂 Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── about/           # About Page
│   │   ├── contact/         # Contact Page
│   │   ├── services/        # Services Page
│   │   ├── components/      # Shared Components (Navbar, Footer, UI)
│   │   ├── layout.tsx       # Root Layout
│   │   └── page.tsx         # Home Page
│   └── styles/              # Global Styles
├── public/                  # Static Assets
├── vitest.config.ts         # Testing Configuration
└── next.config.ts           # Next.js Configuration
```

## ⚡ Performance Optimizations

- **Images**: LCP optimizations with `priority` loading for Hero images. Responsive `sizes` props implemented across all sections.
- **Animations**: `will-change-transform` applied to infinite marquees to prevent layout thrashing and flickering.
- **Strict Typing**: Full TypeScript coverage for reliability.

---

Original design source: [Figma](https://www.figma.com/design/R3CuqwDEmiaGCkZXymwCBK/Garrett-Ronan---Website)
