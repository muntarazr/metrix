# Contributing to METRIX

Thank you for your interest in contributing to METRIX! We welcome contributions to make this strict goal-tracking and productivity platform even better.

## Development Setup

### Prerequisites

- **Node.js** 20.x or higher
- **npm** 10.x or higher
- A [Supabase](https://supabase.com/) project (with schema from `supabase/setup.sql`)

### Quick Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/muntarazr/metrix.git
   cd metrix
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase, Gemini, and Mistral keys in `.env.local`.

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Quality Checks & Testing

Before submitting a pull request, ensure all tests and validation checks pass:

```bash
# Run unit and sensitive logic tests
npm test

# Type-check TypeScript without emitting
npx tsc --noEmit

# Run ESLint
npm run lint

# Build for production
npm run build
```

---

## Pull Request Guidelines

1. **Branch Naming**: Use clear prefixes such as `feat/`, `fix/`, `refactor/`, `docs/`.
2. **Commit Messages**: Follow standard conventional commits format (e.g., `feat: add task export support`, `fix: handle timezone offset in streak calculation`).
3. **Clean Code**: Keep PRs focused on a single change or fix.
4. **Documentation**: Update documentation and types if you change user-facing behavior or database schemas.

---

## Code of Conduct

Please treat everyone with respect and kindness. We aim to foster an open, welcoming, and productive environment for all contributors.
