description: how to run tests for all projects
---

## 🛡 Verification Protocol
All planning tasks and feature implementations must be verified using these automated tests. **Manual browser testing is deprecated** and should only be used as a last resort.

## 🚀 Running Tests
To run tests for all projects in the monorepo, use the following command from the root directory:

```bash
npm test
```

To run tests in a specific package, use:

```bash
npm test -w packages/<package-name>
```

To run tests once without watch mode:

```bash
npm test -- --run
```

Supported packages:
- `packages/core`
- `packages/private-app`
- `packages/production-app`
