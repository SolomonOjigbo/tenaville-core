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
      selector:
        "CallExpression[callee.object.name='Math'][callee.property.name=/^(round|floor|ceil)$/]",
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
