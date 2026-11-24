import { jsPDF } from 'jspdf';
import { I18N } from '../i18n.ts';
import type { Incident, Language, SeverityLevel } from '../types.ts';
import type { ReportResponse } from '../services/apiService.ts';

export function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function severityBadgeClass(sev: SeverityLevel): string {
  switch (sev) {
    case 'critical':
      return 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40';
    case 'high':
      return 'bg-orange-500/15 text-orange-400 border-orange-500/40';
    case 'medium':
      return 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40';
    default:
      return 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/40';
  }
}

export function formatTimestamp(iso: string | undefined, lang: Language): string {
  if (!iso) return '—';
  try {
    const locale = lang === 'kk' ? 'kk-KZ' : lang === 'ru' ? 'ru-RU' : 'en-US';
    return new Date(iso).toLocaleString(locale, {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function exportIncidentsCsv(incidents: Incident[]): void {
  const headers = [
    'TrackingNumber',
    'City',
    'District',
    'Category',
    'Severity',
    'Status',
    'Title',
    'Address',
    'Lat',
    'Lng',
    'Source',
    'Verified',
    'CreatedAt',
  ];
  const rows = incidents.map((i) =>
    [
      i.trackingNumber,
      i.cityId,
      i.district,
      i.category,
      i.severity,
      i.status,
      `"${(i.title || '').replace(/"/g, '""')}"`,
      `"${(i.address || '').replace(/"/g, '""')}"`,
      i.lat.toFixed(5),
      i.lng.toFixed(5),
      i.source,
      String(i.operatorVerified),
      i.createdAt,
    ].join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `qalaqauip-incidents-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportAnalyticsPdf(params: {
  cityName: string;
  incidents: Incident[];
  report: ReportResponse | null;
  lang: Language;
}): void {
  const { cityName, incidents, report, lang } = params;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const t = I18N[lang];

  doc.setFillColor(8, 13, 20);
  doc.rect(0, 0, 595, 76, 'F');
  doc.setTextColor(0, 212, 232);
  doc.setFontSize(18);
  doc.text('QalaQauip — Urban Intelligence Report', 40, 36);
  doc.setTextColor(220, 230, 240);
  doc.setFontSize(10);
  doc.text(`City: ${cityName} | Generated: ${new Date().toISOString()}`, 40, 56);

  doc.setTextColor(20, 30, 45);
  let y = 104;
  doc.setFontSize(12);
  doc.text(`${t.activeIncidents}: ${incidents.length}`, 40, y);
  y += 18;
  const critCount = incidents.filter((i) => i.severity === 'critical').length;
  const resCount = incidents.filter((i) => i.status === 'resolved' || i.status === 'closed').length;
  doc.text(`${t.criticalAlerts}: ${critCount} | ${t.statuses.resolved}: ${resCount}`, 40, y);
  y += 24;

  if (report) {
    doc.setFontSize(13);
    doc.text(report.title || 'Qala Brain Report', 40, y);
    y += 18;
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(report.executiveSummary || '', 510);
    doc.text(lines, 40, y);
    y += lines.length * 14 + 12;

    for (const item of report.keyFindings || []) {
      const wrapped = doc.splitTextToSize(`• ${item}`, 500);
      doc.text(wrapped, 48, y);
      y += wrapped.length * 13 + 4;
      if (y > 760) {
        doc.addPage();
        y = 50;
      }
    }
  }

  y += 10;
  doc.setFontSize(11);
  doc.text('Incident Ledger (Latest 18):', 40, y);
  y += 16;
  doc.setFontSize(9);

  for (const inc of incidents.slice(0, 18)) {
    const line = `${inc.trackingNumber} | ${inc.severity.toUpperCase()} | ${inc.status} | ${inc.title}`;
    const wrapped = doc.splitTextToSize(line, 510);
    doc.text(wrapped, 40, y);
    y += wrapped.length * 12 + 4;
    if (y > 770) {
      doc.addPage();
      y = 50;
    }
  }

  doc.save(`qalaqauip-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
