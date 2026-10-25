// Shared ESLint configuration.
//
// The `no-restricted-imports` block is the only thing keeping the module
// boundaries in ADR 0001 real: without it, module separation is a convention
// that erodes on the first deadline.
import tseslint from 'typescript-eslint';

/** Domain modules are entered through `application/` only. */
const moduleBoundaries = {
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: ['**/modules/*/domain/*', '**/modules/*/infrastructure/*'],
          message:
            "Enter a domain module through its application/ layer. Reaching into another module's domain/ or infrastructure/ breaks the boundary in ADR 0001.",
        },
        {
          group: ['@tenaville/core/financing', '**/modules/financing/**'],
          message:
            'Financing is R3 and disabled by default. Nothing in R1 or R2 may depend on it (PRD §8.12).',
        },
      ],
    },
  ],
};

/** Guards against the mistakes that are expensive to find later. */
const invariants = {
  'no-restricted-syntax': [
    'error',
    {
      // Narrowed to expressions that mention money. The original rule flagged
      // every Math.round/floor/ceil and produced five false positives — two in
      // calendar arithmetic, one on a percentage, two on pixel dimensions —
      // and no true ones. A rule suppressed that often stops being read, which
      // is worse than a narrower rule that is believed.
      //
      // The real guard is the type system: Kobo is a branded bigint, and
      // Math.round(bigint) does not compile. This catches the untyped paths —
      // a raw column value, a parsed string — where that protection is absent.
      selector:
        "CallExpression[callee.object.name='Math'][callee.property.name=/^(round|floor|ceil)$/] Identifier[name=/kobo|naira|amount|price|rent|commission|fee|balance|arrears/i]",
      message:
        'Rounding a monetary value belongs in @tenaville/money, which applies the documented rule in one place (PRD §10.1, ADR 0003).',
    },
    {
      selector: "Identifier[name='SUPABASE_SERVICE_ROLE_KEY']",
      message:
        'The service-role key bypasses RLS. It is for migrations and background jobs only — never a user-initiated request (ADR 0002).',
    },
  ],
};

export default tseslint.config(
  { ignores: ['**/dist/**', '**/.next/**', '**/.expo/**', '**/generated/**'] },
  ...tseslint.configs.recommendedTypeChecked,
  {
    // Config files are not part of a tsconfig project, so type-aware rules
    // cannot run on them.
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { projectService: true },
    },
    rules: {
      ...moduleBoundaries,
      ...invariants,
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
    },
  },
);
