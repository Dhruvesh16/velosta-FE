// ── PDF Export Service ────────────────────────────────────────────────────────
// Minimal, editorial light-theme itinerary PDF using jsPDF + jspdf-autotable.
// `buildItineraryPDF` returns a Blob (for sharing); `exportItineraryPDF` triggers
// a browser download.

import type { ItineraryData, TripData } from "@/lib/types/planner.types";

/** Generate a clean, minimal itinerary PDF. Returns the jsPDF document and a filename. */
export async function buildItineraryPDF(
  itineraryData: ItineraryData,
  tripData: TripData
): Promise<{ blob: Blob; filename: string }> {
  // Dynamic import to keep bundle size lean
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const M = 18; // page margin

  // ── Currency glyph fallback ─────────────────────────────────────────────
  // jsPDF's built-in fonts (Helvetica/Times) don't carry the ₹ glyph (U+20B9),
  // which renders as "1". Replace with "Rs " for clean ASCII rendering.
  const RUPEE = /\u20B9\s?/g;
  const sanitize = (s: unknown): string =>
    typeof s === "string" ? s.replace(RUPEE, "Rs ") : String(s ?? "");

  // Monkey-patch doc.text so every direct call is sanitized automatically.
  const _origText = doc.text.bind(doc);
  (doc as any).text = (text: any, ...rest: any[]) => {
    if (typeof text === "string") return _origText(sanitize(text), ...rest);
    if (Array.isArray(text))
      return _origText(text.map((t) => (typeof t === "string" ? sanitize(t) : t)) as any, ...rest);
    return _origText(text, ...rest);
  };

  // Light, minimal palette
  const INK: [number, number, number] = [11, 31, 42];      // navy, primary text
  const INK2: [number, number, number] = [70, 88, 102];    // body
  const MUTED: [number, number, number] = [140, 152, 162]; // labels
  const ACCENT: [number, number, number] = [217, 119, 87]; // coral hairline
  const TEAL: [number, number, number] = [47, 111, 115];   // eyebrow
  const HAIR: [number, number, number] = [225, 220, 212];  // hairlines

  const setFill = (c: [number, number, number]) => doc.setFillColor(...c);
  const setText = (c: [number, number, number]) => doc.setTextColor(...c);
  const setDraw = (c: [number, number, number]) => doc.setDrawColor(...c);

  const hairline = (x1: number, y1: number, x2: number) => {
    setDraw(HAIR);
    doc.setLineWidth(0.2);
    doc.line(x1, y1, x2, y1);
  };

  const footer = (pageLabel: string) => {
    setText(MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Velosta", M, H - 10);
    doc.text(pageLabel, W - M, H - 10, { align: "right" });
    setDraw(HAIR);
    doc.setLineWidth(0.15);
    doc.line(M, H - 13, W - M, H - 13);
  };

  // ── Cover ─────────────────────────────────────────────────────────────────
  // Pure white page. Subtle coral hairline at top, generous whitespace.
  setFill(ACCENT);
  doc.rect(0, 0, 30, 0.8, "F");

  // Eyebrow
  setText(TEAL);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("ITINERARY", M, 30, { charSpace: 1.6 });

  // Destination — large serif-style display
  setText(INK);
  doc.setFont("times", "normal");
  doc.setFontSize(38);
  const dest = itineraryData.destination || "Your Journey";
  doc.text(dest, M, 50);

  // Duration sub-line
  if (itineraryData.duration) {
    setText(MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(itineraryData.duration, M, 58);
  }

  hairline(M, 68, W - M);

  // Meta grid — 2 columns, label on top, value below
  const meta: [string, string][] = [
    ["Dates", tripData.dateRange ? `${tripData.dateRange.start} → ${tripData.dateRange.end}` : "Flexible"],
    [
      "Travelers",
      tripData.travelers
        ? `${tripData.travelers.adults} adult${tripData.travelers.adults !== 1 ? "s" : ""}${tripData.travelers.children ? `, ${tripData.travelers.children} child${tripData.travelers.children !== 1 ? "ren" : ""}` : ""}`
        : "1 adult",
    ],
    ["Budget", tripData.budget ?? itineraryData.totalBudget ?? "—"],
    ["Total estimate", itineraryData.totalEstimatedCost ?? "—"],
  ];

  const colW = (W - M * 2) / 2;
  meta.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * colW;
    const y = 80 + row * 16;
    setText(MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(label.toUpperCase(), x, y, { charSpace: 1.2 });
    setText(INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const truncated = String(value).length > 38 ? String(value).slice(0, 36) + "…" : String(value);
    doc.text(truncated, x, y + 6);
  });

  hairline(M, 116, W - M);

  // Summary
  if (itineraryData.summary) {
    setText(TEAL);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("ABOUT THIS TRIP", M, 128, { charSpace: 1.4 });

    setText(INK2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(itineraryData.summary, W - M * 2);
    doc.text(lines.slice(0, 8), M, 136);
  }

  // Budget breakdown — minimal list
  if (itineraryData.budgetBreakdown) {
    const entries = Object.entries(itineraryData.budgetBreakdown).filter(([, v]) => v);
    if (entries.length > 0) {
      let y = 200;
      setText(TEAL);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("BUDGET BREAKDOWN", M, y, { charSpace: 1.4 });
      y += 8;

      entries.forEach(([key, val]) => {
        setText(INK2);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        doc.text(label, M, y);
        setText(INK);
        doc.setFont("helvetica", "bold");
        doc.text(String(val), W - M, y, { align: "right" });
        // Dotted leader line
        setDraw(HAIR);
        doc.setLineWidth(0.1);
        doc.setLineDashPattern([0.4, 0.8], 0);
        doc.line(M + 28, y - 1, W - M - 22, y - 1);
        doc.setLineDashPattern([], 0);
        y += 7;
      });
    }
  }

  footer("Cover");

  // ── Day pages ─────────────────────────────────────────────────────────────
  const days = itineraryData.itineraryTable ?? [];

  days.forEach((day, dayIdx) => {
    doc.addPage();

    // Subtle accent bar
    setFill(ACCENT);
    doc.rect(0, 0, 30, 0.8, "F");

    // Eyebrow + day label
    setText(TEAL);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`DAY ${day.day}`, M, 30, { charSpace: 1.6 });

    // Day theme — serif display
    setText(INK);
    doc.setFont("times", "normal");
    doc.setFontSize(24);
    const theme = day.theme || `Day ${day.day}`;
    const themeLines = doc.splitTextToSize(theme, W - M * 2 - 30);
    doc.text(themeLines.slice(0, 2), M, 42);

    // Daily cost — top right
    if (day.dailyCost) {
      setText(INK);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(String(day.dailyCost), W - M, 30, { align: "right" });
      setText(MUTED);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text("ESTIMATED", W - M, 24, { align: "right", charSpace: 1.2 });
    }

    hairline(M, 56, W - M);

    // Activities table — clean, monochrome, no zebra
    let nextY = 64;
    if (day.rows && day.rows.length > 0) {
      autoTable(doc, {
        startY: nextY,
        head: [["Time", "Activity", "Notes", "Cost"]],
        body: day.rows.map((r) => [
          r.time ?? "",
          r.activity ?? "",
          r.description ?? "",
          r.pricing ?? "",
        ]),
        theme: "plain",
        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: { top: 3, bottom: 3, left: 0, right: 4 },
          textColor: INK2 as unknown as number[],
          lineColor: HAIR as unknown as number[],
          lineWidth: 0,
        },
        headStyles: {
          fillColor: [255, 255, 255] as unknown as number[],
          textColor: MUTED as unknown as number[],
          fontStyle: "bold",
          fontSize: 7,
          cellPadding: { top: 2, bottom: 4, left: 0, right: 4 },
        },
        bodyStyles: { fillColor: [255, 255, 255] as unknown as number[] },
        columnStyles: {
          0: { cellWidth: 22, fontStyle: "bold", textColor: INK as unknown as number[] },
          1: { cellWidth: 50, fontStyle: "bold", textColor: INK as unknown as number[] },
          2: { cellWidth: "auto" as unknown as number },
          3: { cellWidth: 24, halign: "right", fontStyle: "bold", textColor: INK as unknown as number[] },
        },
        didDrawCell: (data) => {
          // Bottom hairline under each row (body only)
          if (data.section === "body" && data.column.index === 0) {
            const y = data.cell.y + data.cell.height;
            setDraw(HAIR);
            doc.setLineWidth(0.15);
            doc.line(M, y, W - M, y);
          }
        },
        didParseCell: (data) => {
          // Replace ₹ glyph (unsupported in built-in fonts) with "Rs " in cells.
          if (Array.isArray(data.cell.text)) {
            data.cell.text = data.cell.text.map((t) =>
              typeof t === "string" ? t.replace(RUPEE, "Rs ") : t
            );
          }
        },
        margin: { left: M, right: M },
      });
      nextY = ((doc as any).lastAutoTable?.finalY ?? nextY) + 8;
    }

    // Meals + Stay — compact two-line block
    const blocks: { label: string; value: string }[] = [];
    if (day.meals) {
      const m = [day.meals.breakfast, day.meals.lunch, day.meals.dinner].filter(Boolean) as string[];
      if (m.length) blocks.push({ label: "MEALS", value: m.join("  ·  ") });
    }
    if (day.accommodation) {
      blocks.push({ label: "STAY", value: day.accommodation });
    }

    blocks.forEach((b) => {
      if (nextY > H - 30) return;
      setText(TEAL);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(b.label, M, nextY, { charSpace: 1.4 });
      setText(INK2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const lines = doc.splitTextToSize(b.value, W - M * 2);
      doc.text(lines.slice(0, 2), M, nextY + 5);
      nextY += 5 + Math.min(lines.length, 2) * 4.2 + 4;
    });

    footer(`Day ${day.day} of ${days.length}`);
  });

  // ── Trip summary page ────────────────────────────────────────────────────
  if (itineraryData.expenseSummary || itineraryData.localTips?.length) {
    doc.addPage();
    setFill(ACCENT);
    doc.rect(0, 0, 30, 0.8, "F");

    setText(TEAL);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("SUMMARY", M, 30, { charSpace: 1.6 });

    setText(INK);
    doc.setFont("times", "normal");
    doc.setFontSize(28);
    doc.text("Wrap-up", M, 44);

    hairline(M, 56, W - M);

    let y = 70;
    const es = itineraryData.expenseSummary;
    if (es) {
      if (es.totalPerPerson) {
        setText(MUTED);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("PER PERSON", M, y, { charSpace: 1.2 });
        setText(INK);
        doc.setFont("times", "normal");
        doc.setFontSize(20);
        doc.text(String(es.totalPerPerson), M, y + 9);
        y += 22;
      }
      if (es.totalForGroup) {
        setText(MUTED);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("FOR GROUP", M, y, { charSpace: 1.2 });
        setText(INK);
        doc.setFont("times", "normal");
        doc.setFontSize(20);
        doc.text(String(es.totalForGroup), M, y + 9);
        y += 22;
      }

      if (es.costSavingTips?.length) {
        y += 4;
        setText(TEAL);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("COST SAVING TIPS", M, y, { charSpace: 1.4 });
        y += 7;
        es.costSavingTips.forEach((tip) => {
          if (y > H - 22) return;
          setText(INK);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.text("·", M, y);
          setText(INK2);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          const lines = doc.splitTextToSize(tip, W - M * 2 - 5);
          doc.text(lines, M + 4, y);
          y += lines.length * 5 + 2;
        });
        y += 4;
      }
    }

    if (itineraryData.localTips?.length) {
      setText(TEAL);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("LOCAL TIPS", M, y, { charSpace: 1.4 });
      y += 7;
      itineraryData.localTips.forEach((tip) => {
        if (y > H - 22) return;
        setText(INK);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("·", M, y);
        setText(INK2);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        const lines = doc.splitTextToSize(tip, W - M * 2 - 5);
        doc.text(lines, M + 4, y);
        y += lines.length * 5 + 2;
      });
    }

    footer("Summary");
  }

  const filename = `${(itineraryData.destination ?? "velosta").replace(/[^a-z0-9]/gi, "-").toLowerCase()}-itinerary.pdf`;
  const blob = doc.output("blob");
  return { blob, filename };
}

/** Trigger a browser download of the itinerary PDF. */
export async function exportItineraryPDF(
  itineraryData: ItineraryData,
  tripData: TripData
): Promise<void> {
  const { blob, filename } = await buildItineraryPDF(itineraryData, tripData);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revoke so Safari can complete the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Share the itinerary using the Web Share API when possible.
 * Falls back to clipboard text when Web Share isn't supported.
 * Returns the action that was taken so the UI can show an appropriate toast. */
export async function shareItinerary(
  itineraryData: ItineraryData,
  tripData: TripData
): Promise<"shared" | "copied" | "downloaded"> {
  const title = `${itineraryData.destination ?? "Velosta"} Itinerary`;
  const text =
    `${title}${itineraryData.duration ? ` · ${itineraryData.duration}` : ""}` +
    (itineraryData.totalEstimatedCost ? ` · ${itineraryData.totalEstimatedCost}` : "") +
    `\n\nGenerated with Velosta AI.`;

  // Try sharing the PDF file via Web Share Level 2 (mobile + Safari/Chrome on https)
  try {
    const { blob, filename } = await buildItineraryPDF(itineraryData, tripData);
    const file = new File([blob], filename, { type: "application/pdf" });
    const nav = navigator as Navigator & {
      canShare?: (data: { files?: File[] }) => boolean;
    };
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ title, text, files: [file] });
      return "shared";
    }
    // Web Share without files (text-only)
    if (nav.share) {
      await nav.share({ title, text });
      // Also auto-download the PDF since the share didn't include it
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return "downloaded";
    }
  } catch (err) {
    // User cancelled the native share — treat as no-op
    if ((err as DOMException)?.name === "AbortError") return "shared";
  }

  // Fallback — copy a plain-text summary to clipboard
  try {
    await navigator.clipboard.writeText(buildPlainTextItinerary(itineraryData));
    return "copied";
  } catch {
    return "copied";
  }
}

/** Plain text version for clipboard fallback. */
export function buildPlainTextItinerary(d: ItineraryData): string {
  const lines: string[] = [];
  lines.push(`${d.destination ?? "Trip"}${d.duration ? ` · ${d.duration}` : ""}`);
  if (d.summary) lines.push(`\n${d.summary}`);
  (d.itineraryTable ?? []).forEach((day) => {
    lines.push(`\nDay ${day.day}${day.theme ? ` — ${day.theme}` : ""}`);
    (day.rows ?? []).forEach((r) => {
      const time = r.time ? `${r.time}  ` : "";
      const cost = r.pricing ? `  (${r.pricing})` : "";
      lines.push(`  ${time}${r.activity ?? ""}${cost}`);
    });
  });
  if (d.totalEstimatedCost) lines.push(`\nTotal: ${d.totalEstimatedCost}`);
  lines.push("\nGenerated with Velosta AI.");
  return lines.join("\n");
}

