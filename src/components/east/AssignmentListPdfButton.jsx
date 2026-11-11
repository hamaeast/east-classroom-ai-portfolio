import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { gradeColumns } from '@/lib/gradebookReports';
import { chicagoToday } from '@/lib/weeklyGoals';

// Builds a one-page PDF listing every gradebook assignment in the selected
// nine-weeks segment that is due on or before today, with its title, possible
// points, and due date — so the admin can recreate the same assignments in
// eSchool without scrolling the on-screen gradebook.
export default function AssignmentListPdfButton({ period, segment, assignments, weeklyRows, weekDates }) {
  const [building, setBuilding] = useState(false);

  const buildPdf = () => {
    setBuilding(true);
    try {
      const today = chicagoToday();
      const columns = gradeColumns(assignments, weeklyRows, segment, weekDates)
        .filter(column => {
          const date = column.dueDate || column.eventDate;
          return !date || String(date).slice(0, 10) <= today;
        });
      const doc = new jsPDF({ unit: 'pt', format: 'letter' });
      const marginX = 48;
      let y = 56;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(`Period ${period} — Nine Weeks ${segment} Assignments`, marginX, y);
      y += 18;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(90);
      doc.text(`Generated ${new Date().toLocaleString()} · ${columns.length} assignments due on or before ${today}`, marginX, y);
      y += 24;

      const colX = { num: marginX, title: marginX + 28, points: marginX + 360, date: marginX + 430 };
      doc.setTextColor(40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('#', colX.num, y);
      doc.text('Assignment title', colX.title, y);
      doc.text('Points', colX.points, y);
      doc.text('Due date', colX.date, y);
      y += 6;
      doc.setDrawColor(180);
      doc.line(marginX, y, 564, y);
      y += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const cleanTitle = label => label.replace(/\s*·\s*frozen.*$/i, '').replace(/\s*\(Off\)\s*$/, ' (off)');
      columns.forEach((column, index) => {
        if (y > 740) { doc.addPage(); y = 56; }
        const date = column.dueDate || column.eventDate || '';
        doc.setTextColor(60);
        doc.text(String(index + 1), colX.num, y);
        const titleLines = doc.splitTextToSize(cleanTitle(column.label), 320);
        doc.text(titleLines, colX.title, y);
        doc.text(String(column.max ?? ''), colX.points, y);
        doc.text(date ? String(date).slice(0, 10) : '—', colX.date, y);
        y += 15 * titleLines.length + 4;
      });

      y += 4;
      doc.setDrawColor(180);
      doc.line(marginX, y, 564, y);
      y += 14;
      doc.setFont('helvetica', 'bold');
      doc.text('Total possible points', colX.title, y);
      doc.text(String(columns.reduce((sum, column) => sum + (Number(column.max) || 0), 0)), colX.points, y);

      doc.save(`period-${period}-nine-weeks-${segment}-assignments.pdf`);
    } finally {
      setBuilding(false);
    }
  };

  return (
    <button type="button" disabled={building} onClick={buildPdf} className="east-button">
      {building ? 'Building PDF…' : 'Export assignment list (PDF)'}
    </button>
  );
}