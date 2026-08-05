# @0pvalencia/academic-linter-mcp

MCP linter académico (APA/estructura) para JSON de Google Docs.

## Install / run (npx)

```bash
npx -y @0pvalencia/academic-linter-mcp
```

## Cursor / Claude / VS Code

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
