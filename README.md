# @0pvalencia/academic-linter-mcp

MCP linter académico (APA/estructura) para JSON de Google Docs.

## Cursor / Claude / VS Code

### Local (recomendado si clonas el repo)

```json
{
  "mcpServers": {
    "academic-linter": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/academic-linter-mcp/dist/cli.js"]
    }
  }
}
```

Tras clonar: `npm install && npm run build`.

### npx (sin clonar)

```json
{
  "mcpServers": {
    "academic-linter": {
      "command": "npx",
      "args": ["-y", "@0pvalencia/academic-linter-mcp"]
    }
  }
}
```

> Si abres este repo en Cursor y usas `npx`, hace falta `npm install && npm run build` para que el bin local exista. Sin eso, `npx` falla con `academic-linter-mcp: not found` y el MCP se queda cargando.

## Install / run

```bash
npx -y @0pvalencia/academic-linter-mcp
```

## Local

```bash
npm install
npm run build
npm start
```

## Tools

| Tool | Uso |
| --- | --- |
| `lint_structure` | JSON de `get_document_structure` → errores/avisos |
| `compact_headings_view` | Vista compacta de headings |
| `lint_text_placeholders` | Busca `[...]`, TODO, lorem |

Complementa [`@0pvalencia/google-documents-mcp`](https://www.npmjs.com/package/@0pvalencia/google-documents-mcp).

## License

MIT
