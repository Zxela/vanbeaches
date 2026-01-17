# TASK-001: Monorepo Setup with pnpm Workspaces

**Phase**: 1 - Foundation
**Dependencies**: None
**Verification Level**: L3 (Build)

## Objective

Initialize pnpm workspace configuration and create the monorepo directory structure for the Van Beaches project.

## Implementation Steps

1. Initialize root package.json with workspace configuration
2. Create pnpm-workspace.yaml defining workspaces
3. Create directory structure: `/server`, `/client`, `/shared`
4. Set up root tsconfig.json with project references
5. Create base tsconfig files for each workspace
6. Configure shared ESLint configuration (Biome preferred)
7. Add root scripts for cross-workspace commands

## Files to Create

- `package.json` - Root package with workspace scripts
- `pnpm-workspace.yaml` - Workspace definition
- `tsconfig.json` - Root TypeScript config with references
- `tsconfig.base.json` - Shared TypeScript settings
- `biome.json` - Biome linter/formatter config
- `server/package.json` - Server workspace package
- `server/tsconfig.json` - Server TypeScript config
- `client/package.json` - Client workspace package
- `client/tsconfig.json` - Client TypeScript config
- `shared/package.json` - Shared workspace package
- `shared/tsconfig.json` - Shared TypeScript config

## Completion Criteria

- [ ] `pnpm install` succeeds from root
- [ ] `pnpm -r build` runs across all packages
- [ ] TypeScript path aliases resolve correctly between workspaces

## AC References

- Design Doc: Implementation Path Mapping - Monorepo structure
