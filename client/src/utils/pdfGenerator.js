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
export const generateFeeReceipt = async (fee, student, settings = {}) => {
  const doc = new jsPDF({ unit: 'mm', format: [148, 210] }); // A5
  const w = doc.internal.pageSize.width;

  const schoolName = settings.school_name || 'EduSmart Public School';
  const schoolSub = settings.school_subtitle || '';
  const schoolAddress = settings.school_address || '';
  const schoolContact = [settings.school_phone, settings.school_email].filter(Boolean).join(' | ');
  const footerNote = settings.receipt_footer || 'This is a computer-generated receipt. No signature required.';

  // Attempt to load the logo if provided
  let logoBase64 = null;
  if (settings.school_logo_url) {
    logoBase64 = await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = settings.school_logo_url.startsWith('/') 
        ? `${window.location.origin}${settings.school_logo_url}` 
        : settings.school_logo_url;
    });
  }

  let startY = 15;
  if (logoBase64) {
    // Draw Logo and left-aligned text
    doc.addImage(logoBase64, 'PNG', 14, startY - 5, 18, 18);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(schoolName, 36, startY);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    if (schoolSub) {
      startY += 5;
      doc.text(schoolSub, 36, startY);
    }
    if (schoolAddress) {
      startY += 4;
      doc.setFontSize(8);
      doc.text(schoolAddress, 36, startY);
    }
    if (schoolContact) {
      startY += 4;
      doc.setFontSize(8);
      doc.text(schoolContact, 36, startY);
    }
    startY += 8;
  } else {
    // Centered text when no logo
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(schoolName, w / 2, startY, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    if (schoolSub) {
      startY += 5;
      doc.text(schoolSub, w / 2, startY, { align: 'center' });
    }
    if (schoolAddress) {
      startY += 5;
      doc.setFontSize(8);
      doc.text(schoolAddress, w / 2, startY, { align: 'center' });
    }
    if (schoolContact) {
      startY += 4;
      doc.setFontSize(8);
      doc.text(schoolContact, w / 2, startY, { align: 'center' });
    }
    startY += 8;
  }

  // Separator Line
  doc.setDrawColor(226, 232, 240);
  doc.line(14, startY, w - 14, startY);
  
  startY += 10;
  // FEE RECEIPT Title
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('FEE RECEIPT', w / 2, startY, { align: 'center' });
  
  // Receipt info
  startY += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Receipt No: ${fee?.receipt_number || 'PENDING'}`, 14, startY);
  doc.text(`Date: ${formatDate(fee?.paid_date || fee?.created_at || new Date())}`, w - 14, startY, { align: 'right' });

  startY += 6;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, startY, w - 14, startY);

  // Student Details
  startY += 8;
  const rows = [
    ['Student Name', `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || '—'],
    ['Student ID',   student?.student_id || '—'],
    ['Class',        `${student?.class || '—'} - ${student?.section || '—'}`],
    ['Parent Name',  student?.parent_name || '—'],
    ['Month',        fee?.month || '—'],
    ['Fee Type',     fee?.fee_type || 'Monthly'],
    ['Payment Mode', fee?.payment_mode || '—'],
  ];

  let y = startY;
  rows.forEach(([label, val]) => {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text(label, 14, y);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(String(val), 60, y);
    doc.setFont('helvetica', 'normal');
    y += 8;
  });

  // Amount Box
  y += 4;
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(14, y, w - 28, 26, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Amount Paid', w / 2, y + 9, { align: 'center' });
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text(`Rs. ${Number(fee?.paid_amount || 0).toLocaleString('en-IN')}`, w / 2, y + 20, { align: 'center' });

  // Footer Note
  const fy = doc.internal.pageSize.height - 15;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  const splitFooter = doc.splitTextToSize(footerNote, w - 28);
  doc.text(splitFooter, w / 2, fy, { align: 'center' });

  doc.save(`Receipt_${fee?.receipt_number || 'fee'}.pdf`);
};