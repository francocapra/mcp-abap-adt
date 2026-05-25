# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

An MCP (Model Context Protocol) server that bridges AI tools (Cline, Claude Desktop, etc.) to SAP ABAP systems via ADT (ABAP Development Tools) REST APIs. It exposes 13 read-only tools for retrieving ABAP source code, metadata, and object search results.

## Commands

```bash
npm run build          # Compile TypeScript → dist/
npm run start          # Run the compiled server (stdio transport)
npm run dev            # Run with MCP Inspector (opens at http://localhost:5173)
npm test               # Run Jest integration tests (requires live SAP connection)
```

Tests are integration tests that hit a real SAP system — they require a valid `.env` file with SAP credentials. There are no unit tests or mocks.

## Architecture

```
src/
  index.ts           # Server class, MCP setup, tool registration, tool dispatch
  lib/utils.ts       # Shared HTTP layer: axios singleton, auth, CSRF tokens, response helpers
  handlers/          # One file per tool (handleGet*.ts, handleSearchObject.ts)
```

**Request flow:** `index.ts` registers tools with `@modelcontextprotocol/sdk`, dispatches `CallToolRequest` via switch statement → handler function → `makeAdtRequest()` (in `utils.ts`) → SAP ADT REST endpoint → raw response text returned to MCP client.

**Key patterns:**
- All handlers follow the same structure: validate args → build ADT URL with `getBaseUrl()` + URL-encoded params → `makeAdtRequest()` → `return_response()` / `return_error()`
- `utils.ts` manages a singleton axios instance, Basic Auth headers, CSRF token fetching/caching (for POST/PUT), and cookie persistence
- SAP credentials come from `.env` via dotenv (loaded relative to `dist/`). Required vars: `SAP_URL`, `SAP_USERNAME`, `SAP_PASSWORD`, `SAP_CLIENT`
- Self-signed TLS certificates are accepted by default (`rejectUnauthorized: false`)

**ADT endpoint mapping** (requests to `{SAP_URL}/sap/bc/adt/...`):
- Programs: `GET /programs/programs/{name}/source/main`
- Classes: `GET /oo/classes/{name}/source/main`
- Interfaces: `GET /oo/interfaces/{name}/source/main`
- Function Groups: `GET /functions/groups/{name}/source/main`
- Function Modules: `GET /functions/groups/{group}/fmodules/{name}/source/main`
- Tables/Structures/Types/Packages: `GET /ddic/...` or `/repository/...` paths
- Search: `GET /repository/informationsystem/search?operation=quickSearch&query=...`
- Table Contents: `POST /datapreview/ddic?ddicEntityName={name}&rowNumber={max}` (standard ADT endpoint, returns parsed JSON)

## Adding a New Tool

1. Create `src/handlers/handleNewTool.ts` following the existing handler pattern
2. Import and add the handler to the switch statement in `src/index.ts` (`CallToolRequestSchema` handler)
3. Add the tool schema to the `ListToolsRequestSchema` handler array in `src/index.ts`
4. Rebuild with `npm run build`

## Configuration

Copy `.env.example` to `.env` and fill in SAP system credentials.

## Gotchas

- **`#` em senhas:** Se a senha SAP contém `#`, envolva o valor entre aspas no `.env` — dotenv trata `#` como comentário caso contrário.
- **`.env` path:** É carregado relativo a `dist/`, não ao CWD. Se rodar `npm start` de outro diretório, o `.env` precisa estar acessível a partir de `dist/`.
- **Self-signed TLS aceito por default** (`rejectUnauthorized: false`). Não use este server contra produção sem revisar.
- **Não existem mocks.** `npm test` requer SAP system live e `.env` válido. Para rodar um único handler: `npm test -- --testNamePattern="<handler-name>"`.
- **CSRF tokens são cached no axios singleton em `utils.ts`.** Se o backend reciclar a sessão (ex.: logout/login), o cache fica stale — restart o server (`npm run dev`) para forçar refetch.
