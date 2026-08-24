import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, Plus_Jakarta_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

/*
 * Both families are loaded here, not through a `@import url(...)` in
 * globals.css. That import was silently dropped from the compiled stylesheet by
 * Tailwind v4, so neither font had ever reached the browser and the whole app
 * was rendering in the OS default sans-serif. next/font self-hosts the files,
 * preloads them, and emits a size-adjusted local fallback so the swap does not
 * reflow.
 *
 * The fonts declared here own `--font-jawhara`, `--font-ibm-arabic` and
 * `--font-latin`; globals.css composes them into `--font-sans` and must not
 * redefine them. Order in that stack is Latin, then Arabic — font matching is
 * per-glyph, so each script reaches its own family.
 */
/*
 * MS-jawhara carries all Arabic text. It is a single 700-weight file, so the
 * `weight` range below is deliberate: declaring "100 900" tells the browser this
 * one face covers every weight, which stops it synthesising a faux-bold on top
 * of outlines that are already bold. Without it, the 52 `font-extrabold` /
 * `font-black` sites in the app would smear.
 *
 * The consequence to know: Arabic has exactly one weight now. `font-normal`
 * through `font-black` all render identically in Arabic, so weight cannot carry
 * hierarchy there — size, colour and spacing have to.
 */
const fontJawhara = localFont({
  src: "./fonts/MSjawhara-Bold.ttf",
  variable: "--font-jawhara",
  display: "swap",
  weight: "100 900",
  style: "normal",
});

/*
 * Demoted to a fallback: MS-jawhara maps 404 codepoints and covers the Arabic
 * this UI actually uses (letters, tashkeel, both digit sets), but not the
 * Persian/Urdu extensions پ چ ژ گ. Anything it lacks lands here instead of on a
 * random system font. Trimmed to three weights and not preloaded, since it now
 * paints only the rare glyph.
 */
const fontArabicFallback = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-ibm-arabic",
  display: "swap",
  preload: false,
});

const fontLatin = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-latin",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Metrix - Goal Orbit",
  description: "Track your life goals with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${fontJawhara.variable} ${fontArabicFallback.variable} ${fontLatin.variable}`}
      suppressHydrationWarning
    >
      <body
        className="font-sans antialiased bg-canvas text-foreground selection:bg-primary/20"
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('theme');
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  
                  if (savedTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
