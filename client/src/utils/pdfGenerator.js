import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, getGrade } from './helpers';

// ── Report Card PDF ───────────────────────────────────────────────────────────
export const generateReportCard = (student, result) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header background
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('EduSmart Public School', pageWidth / 2, 16, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Report Card — Academic Session 2024-2025', pageWidth / 2, 26, { align: 'center' });
  doc.text(result?.exam_name || 'Examination', pageWidth / 2, 34, { align: 'center' });

  // Reset color
  doc.setTextColor(30, 41, 59);

  // Student info box
  doc.setFillColor(248, 249, 252);
  doc.roundedRect(14, 46, pageWidth - 28, 34, 3, 3, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${student?.first_name || ''} ${student?.last_name || ''}`, 20, 57);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Student ID: ${student?.student_id || '—'}`, 20, 65);
  doc.text(`Class: ${result?.class || student?.class || '—'} - ${result?.section || student?.section || '—'}`, 20, 72);

  doc.text(`Exam: ${result?.exam_name || '—'}`, 110, 65);
  doc.text(`Date: ${formatDate(new Date())}`, 110, 72);

  // Marks table
  doc.setTextColor(30, 41, 59);
  const tableData = (result?.subjects || []).map(s => [
    s.subject,
    s.max_marks,
    s.obtained_marks,
    `${Math.round((s.obtained_marks / s.max_marks) * 100)}%`,
    getGrade(s.obtained_marks, s.max_marks),
  ]);

  autoTable(doc, {
    startY: 86,
    head: [['Subject', 'Max Marks', 'Obtained', 'Percentage', 'Grade']],
    body: tableData,
    foot: [[
      'Total',
      result?.total_marks || 0,
      result?.total_obtained || 0,
      `${result?.percentage || 0}%`,
      result?.grade || '—',
    ]],
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { halign: 'center' },
      2: { halign: 'center', fontStyle: 'bold' },
      3: { halign: 'center' },
      4: { halign: 'center', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // Summary section
  const finalY = doc.lastAutoTable.finalY + 12;
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(14, finalY, pageWidth - 28, 28, 3, 3, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);

  const cols = [
    ['Overall Grade', result?.grade || '—'],
    ['Percentage',    `${result?.percentage || 0}%`],
    ['Rank',          result?.rank ? `${result.rank}` : '—'],
    ['Result',        (result?.percentage || 0) >= 40 ? 'PASS' : 'FAIL'],
  ];

  cols.forEach(([label, val], i) => {
    const x = 20 + i * 44;
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x, finalY + 10);
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(String(val), x, finalY + 22);
  });

  // Footer
  const footY = doc.internal.pageSize.height - 18;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, footY - 4, pageWidth - 14, footY - 4);
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('This is a computer-generated report card.', pageWidth / 2, footY, { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, footY + 6, { align: 'center' });

  doc.save(`ReportCard_${student?.student_id || 'student'}_${result?.exam_name?.replace(/\s/g, '_') || 'exam'}.pdf`);
};

// ── Fee Receipt PDF ───────────────────────────────────────────────────────────
export const generateFeeReceipt = (fee, student) => {
  const doc = new jsPDF({ unit: 'mm', format: [148, 210] }); // A5
  const w = doc.internal.pageSize.width;

  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, w, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('EduSmart Public School', w / 2, 13, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('FEE RECEIPT', w / 2, 22, { align: 'center' });

  // Receipt number badge
  doc.setFillColor(79, 126, 248);
  doc.roundedRect(w / 2 - 24, 26, 48, 9, 2, 2, 'F');
  doc.setFontSize(8);
  doc.text(`Receipt: ${fee?.receipt_number || 'PENDING'}`, w / 2, 32, { align: 'center' });

  // Student details
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const rows = [
    ['Student Name', `${student?.first_name || ''} ${student?.last_name || ''}`],
    ['Student ID',   student?.student_id || '—'],
    ['Class',        `${student?.class || '—'} - ${student?.section || '—'}`],
    ['Parent Name',  student?.parent_name || '—'],
    ['Month',        fee?.month || '—'],
    ['Fee Type',     fee?.fee_type || 'Monthly'],
    ['Payment Mode', fee?.payment_mode || '—'],
    ['Date',         formatDate(fee?.paid_date)],
  ];

  let y = 46;
  rows.forEach(([label, val]) => {
    doc.setTextColor(100, 116, 139);
    doc.text(label, 14, y);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(String(val), 70, y);
    doc.setFont('helvetica', 'normal');
    y += 8;
  });

  // Amount box
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(14, y + 2, w - 28, 26, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Amount Paid', w / 2, y + 12, { align: 'center' });
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text(`₹${Number(fee?.paid_amount || 0).toLocaleString('en-IN')}`, w / 2, y + 24, { align: 'center' });

  // Footer
  const fy = doc.internal.pageSize.height - 14;
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('This is a computer-generated receipt. No signature required.', w / 2, fy, { align: 'center' });

  doc.save(`Receipt_${fee?.receipt_number || 'fee'}.pdf`);
};