# Fonts (not committed)

`MSjawhara-Bold.ttf` is a licensed Arabic display font — its redistribution
terms are unverified, so it is excluded from this public repository.
`src/app/layout.tsx` loads it via `next/font/local`; without the file present
at this path, `npm run build` will fail on a fresh clone.

To build locally, place a licensed copy of the font here as
`MSjawhara-Bold.ttf`. The live deployment is unaffected — it is published via
`vercel deploy`, which uploads the local working tree directly rather than
building from this Git history.
