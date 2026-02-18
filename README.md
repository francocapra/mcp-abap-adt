# mcp-abap-adt

> Fork by [orchestraight.co](https://github.com/orchestraight) | Original by [mario-andreschak](https://github.com/mario-andreschak/mcp-abap-adt)

MCP (Model Context Protocol) server that bridges AI tools to SAP ABAP systems via ADT (ABAP Development Tools) REST APIs. Use it with Claude Code, Cline, Claude Desktop, or any MCP-compatible client to read ABAP source code, inspect DDIC objects, preview table data, and more.

## What Changed in This Fork

- **GetTableContents** now uses the standard ADT endpoint `POST /sap/bc/adt/datapreview/ddic` instead of requiring a custom SAP-side service (`/z_mcp_abap_adt/z_tablecontent/`). No backend implementation needed.
- XML response is parsed into clean JSON (columns with descriptions + rows as key-value objects).

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/orchestraight/mcp-abap-adt
cd mcp-abap-adt

# 2. Install & build
npm install
npm run build

# 3. Configure SAP credentials
cp .env.example .env
# Edit .env with your SAP_URL, SAP_USERNAME, SAP_PASSWORD, SAP_CLIENT

# 4. Test connection
npm test

# 5. Run with MCP Inspector
npm run dev
```

## Configuration

Create a `.env` file in the project root:

```env
SAP_URL=https://your-sap-system.com:8000
SAP_USERNAME=your_username
SAP_PASSWORD=your_password
SAP_CLIENT=100
```

If your password contains `#`, wrap the value in quotes.

## Available Tools (13)

| Tool | Description | Key Parameters |
|---|---|---|
| `GetProgram` | ABAP program source code | `program_name` |
| `GetClass` | ABAP class source code | `class_name` |
| `GetInterface` | ABAP interface source code | `interface_name` |
| `GetFunctionGroup` | Function group source code | `function_group` |
| `GetFunction` | Function module source code | `function_name`, `function_group` |
| `GetInclude` | ABAP include source code | `include_name` |
| `GetTable` | Table structure (DDIC) | `table_name` |
| `GetStructure` | Structure definition (DDIC) | `structure_name` |
| `GetTypeInfo` | Data element / domain info | `type_name` |
| `GetPackage` | Package contents | `package_name` |
| `GetTableContents` | Table data preview (parsed JSON) | `table_name`, `max_rows` (default: 100) |
| `GetTransaction` | Transaction details | `transaction_name` |
| `SearchObject` | Quick search for ABAP objects | `query`, `maxResults` (default: 100) |

## MCP Client Integration

### Claude Code / Claude Desktop

Add to your MCP settings (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mcp-abap-adt": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-abap-adt/dist/index.js"]
    }
  }
}
```

### Cline (VS Code)

Add to `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "mcp-abap-adt": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-abap-adt/dist/index.js"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Architecture

```
src/
  index.ts           # Server class, MCP setup, tool registration, dispatch
  lib/utils.ts       # HTTP layer: axios, auth, CSRF tokens, response helpers
  handlers/          # One file per tool (handleGet*.ts, handleSearchObject.ts)
```

**Request flow:** MCP client -> `index.ts` dispatch -> handler -> `makeAdtRequest()` -> SAP ADT REST endpoint -> response back to client.

All handlers use standard ADT endpoints under `/sap/bc/adt/`. No custom SAP-side services are required.

## Commands

```bash
npm run build    # Compile TypeScript -> dist/
npm run start    # Run server (stdio transport)
npm run dev      # Run with MCP Inspector (http://localhost:5173)
npm test         # Integration tests (requires live SAP connection)
```

---

## Roadmap

New tools to be implemented using standard ADT REST API endpoints (`/sap/bc/adt/*`). No custom SAP-side services needed.

### Phase 1 - CDS & RAP Objects

| Tool | Endpoint | Method | Description |
|---|---|---|---|
| `GetCDSView` | `/ddic/ddl/sources/{name}/source/main` | GET | CDS DDL source code |
| `GetAccessControl` | `/acm/dcl/sources/{name}/source/main` | GET | CDS access control (DCL) source |
| `GetMetadataExtension` | `/ddic/ddlx/sources/{name}/source/main` | GET | CDS metadata extensions |
| `GetServiceDefinition` | `/ddic/srvd/sources/{name}/source/main` | GET | Service definition source |
| `GetServiceBinding` | `/businessservices/bindings/{name}` | GET | Service binding definition |

### Phase 2 - Data & Analysis

| Tool | Endpoint | Method | Description |
|---|---|---|---|
| `RunFreestyleSQL` | `/datapreview/freestyle` | POST | Execute arbitrary SELECT queries |
| `GetWhereUsed` | `/repository/informationsystem/usageReferences` | POST | Where-used list for any object |
| `GetClassIncludes` | `/oo/classes/{name}/includes/{type}` | GET | Test classes, local types, macros |
| `GetMessageClass` | `/messageclass/{name}` | GET | Message class definition |

### Phase 3 - Code Quality & Testing

| Tool | Endpoint | Method | Description |
|---|---|---|---|
| `SyntaxCheck` | `/checkruns` | POST | ABAP syntax check |
| `RunATCCheck` | `/atc/worklists` + `/atc/runs` | POST | ABAP Test Cockpit checks |
| `RunUnitTests` | `/abapunit/testruns` | POST | Execute ABAP unit tests |
| `PrettyPrint` | `/abapsource/prettyprinter` | POST | Format ABAP source code |
| `GetRuntimeDumps` | `/runtime/dumps` | GET | ST22 runtime error feed |

### Phase 4 - Navigation & Intelligence

| Tool | Endpoint | Method | Description |
|---|---|---|---|
| `GetTypeHierarchy` | `/abapsource/typehierarchy` | POST | Class/interface inheritance tree |
| `CodeCompletion` | `/abapsource/codecompletion/proposal` | POST | Code completion proposals |
| `NavigateToDefinition` | `/navigation/target` | POST | Go-to-definition lookup |
| `GetAbapDoc` | `/docu/abap/langu` | POST | ABAP keyword documentation |

### Phase 5 - System & Transport

| Tool | Endpoint | Method | Description |
|---|---|---|---|
| `Discovery` | `/discovery` | GET | List all available ADT services |
| `ListObjectTypes` | `/repository/informationsystem/objecttypes` | GET | All ABAP object types |
| `ListTransports` | `/cts/transportrequests` | GET | Transport requests |
| `ListInactiveObjects` | `/activation/inactiveobjects` | GET | Inactive objects |

> **Note:** SAP does not publish official public API docs for ADT endpoints. The roadmap above is based on reverse-engineering from [marcellourbani/abap-adt-api](https://github.com/marcellourbani/abap-adt-api), Eclipse ADT communication logs, and SAP Community posts. Use `/sap/bc/adt/discovery` on your system to confirm available services.

---

## License

MIT

## Credits

- Original project: [mario-andreschak/mcp-abap-adt](https://github.com/mario-andreschak/mcp-abap-adt)
- ADT API reference: [marcellourbani/abap-adt-api](https://github.com/marcellourbani/abap-adt-api)
