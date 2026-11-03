---
sidebar_position: 2
---

# Getting Started

This repository contains two Node.js projects:

- The repository root is the Express API server.
- `documentation/` is the Docusaurus developer portal.

## API server

### Prerequisites

- Node.js 20 or newer is recommended.
- A reachable MongoDB instance.
- Credentials for any external provider you intend to exercise.

### Setup

From the repository root:

```bash
npm install
```

Create `.env` from `.env.example`, then set the values required by the code. At minimum, configure `MONGO_URI`, `ACCESS_TOKEN_SECRET`, and `REFRESH_TOKEN_SECRET`; see [Environment Variables](./env-variables.md).

Run the API:

```bash
npm run dev
```

The available root scripts are `start`, `dev`, and `test`. There is no root `build` or `seed` npm script at present.

Verify the server:

```bash
curl http://localhost:5000/health
```

Then open `http://localhost:5000/api/docs` for Swagger UI.

## Documentation portal

In a second terminal:

```bash
cd documentation
npm install
npm start
```

The documentation site is built separately with:

```bash
npm run build
```
