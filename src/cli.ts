#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { lintDocumentStructure, type StructureInput } from "./lint.js";

function createServer(): McpServer {
  const server = new McpServer(
    { name: "academic-linter-mcp", version: "0.1.1" },
    {
      instructions:
        "Linter académico. Pasa el JSON de get_document_structure (o un resumen de headings) a lint_structure. No modifica el Doc: solo reporta hallazgos. Luego corrige con google-documents-mcp.",
    },
  );

  server.registerTool(
    "lint_structure",
    {
      title: "Lint estructura académica",
      description:
        "Analiza headings, numeración, placeholders y posibles problemas APA. Input: JSON de get_document_structure o { headings: [{text, namedStyleType, startIndex?, endIndex?}] }.",
      inputSchema: z
        .object({
          structureJson: z
            .string()
            .describe("JSON stringificado de get_document_structure o lista de headings"),
          expectNumberedChapters: z.boolean().optional().default(true),
        })
        .strict(),
    },
    async ({ structureJson, expectNumberedChapters }) => {
      let parsed: StructureInput;
      try {
        parsed = JSON.parse(structureJson) as StructureInput;
      } catch {
        return {
          content: [{ type: "text" as const, text: "structureJson no es JSON válido." }],
          isError: true,
        };
      }
      const report = lintDocumentStructure(parsed, { expectNumberedChapters: expectNumberedChapters ?? true });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(report, null, 2) }],
        structuredContent: report,
      };
    },
  );

  server.registerTool(
    "lint_text_placeholders",
    {
      title: "Buscar placeholders en texto",
      description: "Detecta [...], TODO, TBD, XXX, lorem ipsum en un texto plano (p. ej. read_document).",
      inputSchema: z.object({ text: z.string().min(1) }).strict(),
    },
    async ({ text }) => {
      const patterns = [
        { id: "ellipsis_brackets", re: /\[\.\.\.\]|\[\u2026\]/g },
        { id: "todo", re: /\bTODO\b/gi },
        { id: "tbd", re: /\bTBD\b/g },
        { id: "xxx", re: /\bXXX\b/g },
        { id: "lorem", re: /lorem ipsum/gi },
        { id: "placeholder_name", re: /\( indícalo|placeholder|TU NOMBRE|AUTHOR HERE/gi },
      ];
      const findings: Array<{ id: string; count: number; samples: string[] }> = [];
      for (const p of patterns) {
        const matches = text.match(p.re) ?? [];
        if (matches.length === 0) continue;
        findings.push({
          id: p.id,
          count: matches.length,
          samples: matches.slice(0, 5),
        });
      }
      const report = { ok: findings.length === 0, findings };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(report, null, 2) }],
        structuredContent: report,
      };
    },
  );

  server.registerTool(
    "compact_headings_view",
    {
      title: "Vista compacta de headings",
      description:
        "Convierte get_document_structure JSON en líneas `[start-end] LEVEL \"texto\"`. Ideal para agentes (evita JSON de 100KB+).",
      inputSchema: z.object({ structureJson: z.string() }).strict(),
    },
    async ({ structureJson }) => {
      let parsed: StructureInput;
      try {
        parsed = JSON.parse(structureJson) as StructureInput;
      } catch {
        return {
          content: [{ type: "text" as const, text: "structureJson no es JSON válido." }],
          isError: true,
        };
      }
      const headings = extractHeadings(parsed);
      const lines = headings.map((h) => {
        const range =
          h.startIndex != null && h.endIndex != null ? `[${h.startIndex}-${h.endIndex}]` : "[?-?]";
        return `${range} ${h.namedStyleType ?? "?"} "${h.text}"`;
      });
      const text = lines.join("\n") || "(sin headings)";
      return {
        content: [{ type: "text" as const, text }],
        structuredContent: { count: headings.length, lines },
      };
    },
  );

  return server;
}

function extractHeadings(input: StructureInput): Array<{
  text: string;
  namedStyleType?: string;
  startIndex?: number;
  endIndex?: number;
}> {
  if (Array.isArray(input.headings)) {
    return input.headings.map((h) => ({
      text: h.text,
      namedStyleType: h.namedStyleType ?? undefined,
      startIndex: h.startIndex,
      endIndex: h.endIndex,
    }));
  }
  if (Array.isArray(input.blocks)) {
    return input.blocks
      .filter((b) => (b.namedStyleType ?? "").startsWith("HEADING") || b.namedStyleType === "TITLE")
      .map((b) => ({
        text: (b.text ?? "").trim(),
        namedStyleType: b.namedStyleType ?? undefined,
        startIndex: b.startIndex,
        endIndex: b.endIndex,
      }))
      .filter((h) => h.text.length > 0);
  }
  return [];
}

console.error("academic-linter-mcp running on stdio");
serveStdio(() => createServer(), {
  onerror: (error) => {
    console.error("academic-linter-mcp error:", error instanceof Error ? error.message : String(error));
  },
});
