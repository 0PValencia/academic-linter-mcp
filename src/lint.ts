export interface HeadingLike {
  text: string;
  namedStyleType?: string | null;
  startIndex?: number;
  endIndex?: number;
}

export interface StructureInput {
  headings?: HeadingLike[];
  blocks?: Array<{
    text?: string | null;
    namedStyleType?: string | null;
    startIndex?: number;
    endIndex?: number;
  }>;
  [key: string]: unknown;
}

export interface LintFinding {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  heading?: string;
}

export interface LintReport {
  ok: boolean;
  summary: string;
  counts: { error: number; warning: number; info: number };
  findings: LintFinding[];
  headingStats: Record<string, number>;
}

export function lintDocumentStructure(
  input: StructureInput,
  options: { expectNumberedChapters: boolean },
): LintReport {
  const headings = normalizeHeadings(input);
  const findings: LintFinding[] = [];
  const headingStats: Record<string, number> = {};

  for (const h of headings) {
    const style = h.namedStyleType ?? "UNKNOWN";
    headingStats[style] = (headingStats[style] ?? 0) + 1;
  }

  const h1 = headings.filter((h) => h.namedStyleType === "HEADING_1");
  const h2 = headings.filter((h) => h.namedStyleType === "HEADING_2");
  const h3 = headings.filter((h) => h.namedStyleType === "HEADING_3");

  if (h1.length === 0) {
    findings.push({
      severity: "error",
      code: "no_heading_1",
      message: "No hay HEADING_1. Un informe académico necesita capítulos de nivel 1.",
    });
  }

  if (h1.length > 0 && h2.length === 0 && h3.length === 0 && h1.length > 12) {
    findings.push({
      severity: "warning",
      code: "all_heading_1",
      message: `Hay ${h1.length} HEADING_1 y ningún H2/H3. Probable que format_academic_document haya subido todos los niveles a H1.`,
    });
  }

  if (options.expectNumberedChapters) {
    const numbered = h1.filter((h) => /^\d+(\.\d+)*[\.\):-]?\s+\S/.test(h.text.trim()));
    if (h1.length >= 3 && numbered.length < Math.ceil(h1.length * 0.5)) {
      findings.push({
        severity: "warning",
        code: "unnumbered_chapters",
        message: `Pocos HEADING_1 numerados (${numbered.length}/${h1.length}). Revisa secuencia 1., 2., 3.…`,
      });
    }

    const nums = numbered
      .map((h) => {
        const m = h.text.trim().match(/^(\d+)/);
        return m ? Number(m[1]) : null;
      })
      .filter((n): n is number => n != null);
    for (let i = 1; i < nums.length; i++) {
      if (nums[i]! < nums[i - 1]!) {
        findings.push({
          severity: "warning",
          code: "chapter_order",
          message: `Numeración de capítulos no monótona cerca de ${nums[i - 1]} → ${nums[i]}.`,
        });
        break;
      }
    }
  }

  for (const h of headings) {
    if (/\[\.\.\.\]|TODO|TBD|lorem ipsum/i.test(h.text)) {
      findings.push({
        severity: "error",
        code: "placeholder_in_heading",
        message: `Heading con placeholder: "${h.text.slice(0, 80)}"`,
        heading: h.text,
      });
    }
    if ((h.text ?? "").trim().length === 0) {
      findings.push({
        severity: "error",
        code: "empty_heading",
        message: "Hay un heading vacío.",
      });
    }
  }

  // Duplicate H1 titles
  const seen = new Map<string, number>();
  for (const h of h1) {
    const key = h.text.trim().toLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const [title, count] of seen) {
    if (count > 1) {
      findings.push({
        severity: "warning",
        code: "duplicate_h1",
        message: `HEADING_1 duplicado ${count}×: "${title.slice(0, 80)}"`,
        heading: title,
      });
    }
  }

  const counts = {
    error: findings.filter((f) => f.severity === "error").length,
    warning: findings.filter((f) => f.severity === "warning").length,
    info: findings.filter((f) => f.severity === "info").length,
  };

  return {
    ok: counts.error === 0,
    summary:
      counts.error === 0 && counts.warning === 0
        ? "Estructura OK."
        : `Hallazgos: ${counts.error} errores, ${counts.warning} avisos, ${counts.info} infos.`,
    counts,
    findings,
    headingStats,
  };
}

function normalizeHeadings(input: StructureInput): HeadingLike[] {
  if (Array.isArray(input.headings)) return input.headings;
  if (Array.isArray(input.blocks)) {
    return input.blocks
      .filter((b) => {
        const s = b.namedStyleType ?? "";
        return s.startsWith("HEADING") || s === "TITLE";
      })
      .map((b) => ({
        text: (b.text ?? "").trim(),
        namedStyleType: b.namedStyleType,
        startIndex: b.startIndex,
        endIndex: b.endIndex,
      }));
  }
  return [];
}
