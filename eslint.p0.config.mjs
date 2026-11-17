import base from "./eslint.config.js";
import tseslint from "typescript-eslint";

// Temporary scoped P0 gate. Keep the repository-wide lint configuration
// unchanged; legacy formatting/type warnings require a separate cleanup PR.
export default [
  ...base,
  {
    files: [
      "src/components/layout/app-shell.tsx",
      "src/services/cloud-service.ts",
      "src/integrations/supabase/types.ts",
      "tests/p0.integration.test.mjs",
      "src/components/auth/role-access.tsx",
      "src/features/shared/components/data-table.tsx",
      "src/features/empresas/components/empresa-table.tsx",
      "src/routes/empresas.tsx",
      "src/routes/emprestimos.tsx",
      "src/routes/devolucoes.tsx",
      "src/routes/produtos.tsx",
    ],
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "prettier/prettier": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
    },
  },
];
