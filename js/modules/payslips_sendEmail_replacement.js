/**
 * DROP-IN REPLACEMENT for the sendEmail method in js/modules/payslips.js
 *
 * Find the entire:
 *   sendEmail: function (employeeId, runId) { ... }
 * block and replace it with the code below (the outer object comma is not included).
 *
 * Changes:
 *  1. Email HTML body = exact output of generatePayslipHTML() — same as the modal
 *  2. PDF attachment  = same HTML rendered via jsPDF doc.html() (primary path)
 *                       or a pixel-faithful jsPDF fallback if html() is unavailable
 */

  sendEmail: function (employeeId, runId) {
    const btn      = document.getElementById('btn-email-payslip');
    const origHtml = btn ? btn.innerHTML : '';
    const reset    = () => { if (btn) { btn.innerHTML = origHtml; btn.disabled = false; } };
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…'; btn.disabled = true; }

    // ── Guards ──────────────────────────────────────────────────────────────
    if (!runId || runId === 'undefined' || runId === 'null') {
      window.Toast.show('Cannot email a draft payslip. Finalise the payroll run first.', 'warning');
      return reset();
    }

    // ── Load records ────────────────────────────────────────────────────────
    const empId = typeof employeeId === 'string' ? parseInt(employeeId) : employeeId;
    const emp   = window.DB.employees.find(e => e.id === empId);
    const line  = window.DB.payslips.find(p => p.runId === runId && p.employeeId === empId);
    const run   = (window.DB.payrollRuns || []).find(r => r.id === runId);
    const comp  = run
      ? (window.DB.companies.find(c => c.id == run.companyId) || { name: run.company || 'Company' })
      : { name: 'Company' };

    if (!emp)  { window.Toast.show('Employee not found.', 'warning'); return reset(); }
    if (!line) { window.Toast.show('Payslip data not found for this run.', 'warning'); return reset(); }
    if (!emp.email || !emp.email.trim()) {
      window.Toast.show('Employee has no email address. Update their profile first.', 'warning');
      return reset();
    }

    const period   = line.period || (run ? run.period : 'N/A');
    const compName = comp.name || 'Company';

    // ── Get the EXACT payslip HTML used in the modal ─────────────────────────
    // generatePayslipHTML returns the inner content; remove the print/close
    // buttons (they live in a .no-print div at the top of the output).
    const payslipInner = this.generatePayslipHTML(line, emp, comp)
      .replace(/<div[^>]*class="no-print"[^>]*>[\s\S]*?<\/div>/gi, '');

    // Wrap in a full email-safe document.
    // The payslip uses inline styles so no external CSS is needed.
    const emailBodyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Payslip — ${period}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    background: #f1f5f9;
    padding: 24px 12px;
    color: #1e293b;
  }
  /* cols grid fallback for email clients that don't support display:grid */
  .cols { display: table; width: 100%; }
  .cols > div { display: table-cell; width: 50%; vertical-align: top; padding-right: 16px; }
  .cols > div:last-child { padding-right: 0; padding-left: 16px; }
</style>
</head>
<body>
  ${payslipInner}
  <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:16px;font-family:Arial,sans-serif;">
    This payslip was generated automatically by Nexa HR &amp; Payroll.
    Please do not reply to this email.
  </p>
</body>
</html>`;

    const emailBodyText =
      `PAYSLIP — ${period}\n${'='.repeat(50)}\n` +
      `Employee : ${emp.firstName} ${emp.lastName}\n` +
      `Company  : ${compName}\n` +
      `Period   : ${period}\n\n` +
      `Please open the attached PDF or view the HTML version of this email.\n\n` +
      `For queries contact HR at ${comp.email || 'hr@company.co.za'}.`;

    // ── Helper: POST to api/email.php ────────────────────────────────────────
    const doSend = (pdfBase64) => {
      const attachments = pdfBase64 ? [{
        filename:       `Payslip_${(emp.firstName || '').replace(/\s/g, '_')}_${(period || '').replace(/\s/g, '_')}.pdf`,
        content_base64: pdfBase64,
        mime_type:      'application/pdf'
      }] : [];

      let authToken = '';
      try {
        const s = localStorage.getItem('hrpms_user');
        if (s) { const o = JSON.parse(s); authToken = o.token || o.authToken || ''; }
      } catch (_) { /* ignore */ }

      fetch('api/email.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken },
        body: JSON.stringify({
          to:          emp.email.trim(),
          subject:     `Your Payslip for ${period} — ${compName}`,
          body_html:   emailBodyHtml,
          body_text:   emailBodyText,
          attachments: attachments
        })
      })
      .then(res => {
        if (res.status === 401) throw new Error('Auth error — check API_SECRET_KEY in .env.');
        return res.json().catch(() => { throw new Error('Non-JSON response from server — check api/email.php for PHP errors.'); });
      })
      .then(data => {
        if (data.status === 'sent') {
          window.Toast.show(`Payslip emailed to ${emp.email}`, 'success');
          if (btn) btn.innerHTML = '<i class="fas fa-check"></i> Sent';
        } else {
          throw new Error(data.error || 'Send failed.');
        }
      })
      .catch(err => {
        console.error('[Payslips.sendEmail]', err);
        window.Toast.show('Email failed: ' + err.message, 'warning');
        reset();
      });
    };

    // ── Primary PDF path: jsPDF doc.html() renders the exact payslip HTML ───
    // doc.html() uses html2canvas internally (bundled in jsPDF 2.5.1).
    if (window.jspdf) {
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

        // Off-screen container at A4 pixel width (794px ≈ A4 at 96dpi)
        const container = document.createElement('div');
        container.style.cssText = [
          'position:fixed',
          'top:0',
          'left:-9999px',
          'width:794px',
          'background:#ffffff',
          'font-family:Arial,Helvetica,sans-serif',
          'font-size:13px',
          'color:#1e293b',
          'line-height:1.5',
          'z-index:-1'
        ].join(';');
        container.innerHTML = payslipInner;
        document.body.appendChild(container);

        doc.html(container, {
          callback: function (renderedDoc) {
            try { document.body.removeChild(container); } catch (_) {}
            doSend(renderedDoc.output('datauristring').split(',')[1]);
          },
          x: 5,
          y: 5,
          width: 200,        // mm — fills A4 portrait with 5 mm margins
          windowWidth: 794,  // must match container px width
          autoPaging: 'text',
          margin: [5, 5, 5, 5],
          html2canvas: {
            scale: 2,          // retina quality
            useCORS: true,
            logging: false
          }
        });
        return; // async — doSend is called in the callback above
      } catch (htmlErr) {
        console.warn('[Payslips.sendEmail] jsPDF html() error, using fallback:', htmlErr.message);
        // fall through to structured fallback
      }
    }

    // ── Fallback PDF: structured jsPDF that mirrors the payslip exactly ──────
    // Used when jsPDF is absent or doc.html() throws (e.g. html2canvas missing).
    try {
      if (window.jspdf) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const pw  = doc.internal.pageSize.getWidth(); // 210 mm

        // Palette
        const C_INDIGO = [79, 70, 229];
        const C_SLATE  = [30, 41, 59];
        const C_GRAY   = [100, 116, 139];
        const C_RED    = [220, 38, 38];
        const C_WHITE  = [255, 255, 255];
        const C_LTGRAY = [226, 232, 240];
        const C_BGBLUE = [241, 245, 249];

        const fmt = (v) => window.formatCurrency(v);

        // Recalculate figures — mirrors generatePayslipHTML exactly
        const basic  = Number(line.basic   || 0);
        const paye   = Number(line.paye    || 0);
        const uif    = Number(line.uif     || 0);
        const med    = Number(line.medical || 0);
        const pen    = Number(line.pension || 0);
        const garn   = Number(line.garnishee || 0);
        const bonus  = Number(line.bonus   || 0);
        const sdl    = Number(line.sdl     || 0);

        const calcBV = (b) =>
          b.calc === 'Percentage'
            ? (Number(emp.basicSalary || 0) * parseFloat(b.value)) / 100
            : parseFloat(b.value) || 0;

        const customBens  = line.customBenefits || [];
        const custAllow   = customBens.filter(b => b.type === 'Allowance');
        const custDed     = customBens.filter(b => b.type === 'Deduction' || b.type === 'Reimbursement');
        const custAllowSum = custAllow.reduce((s, b) => s + calcBV(b), 0);
        const custDedSum   = custDed.reduce((s, b) => s + calcBV(b), 0);
        const otherAllow   = Math.max(0, Number(line.gross || basic) - basic - custAllowSum - bonus);
        const totalEarn    = basic + otherAllow + custAllowSum + bonus;
        const manualDed    = Math.max(0, Number(line.otherDeductions || 0) - custDedSum);
        const totalDed     = paye + uif + med + pen + garn + custDedSum + manualDed;
        const netPay       = totalEarn - totalDed;

        // ── Header bar ─────────────────────────────────────────────────────
        doc.setFillColor(...C_INDIGO);
        doc.rect(0, 0, pw, 24, 'F');
        doc.setTextColor(...C_WHITE);
        doc.setFontSize(18); doc.setFont('helvetica', 'bold');
        doc.text('PAYSLIP', 10, 10);
        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        doc.text(period, 10, 17);
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text(compName, pw - 10, 10, { align: 'right' });
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        if (comp.email) doc.text(comp.email, pw - 10, 17, { align: 'right' });
        doc.setFontSize(7); doc.setTextColor(...C_WHITE);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-ZA')}`, pw - 10, 22, { align: 'right' });

        // ── Employee / Banking info grid ────────────────────────────────────
        const infoY = 28;
        doc.setFillColor(...C_BGBLUE);
        doc.rect(10, infoY, pw - 20, 28, 'F');
        doc.setDrawColor(...C_LTGRAY);
        doc.line(pw / 2, infoY, pw / 2, infoY + 28); // centre divider

        const infoL = [
          ['Name',        `${emp.firstName} ${emp.lastName}`],
          ['ID Number',   emp.idNumber || '—'],
          ['Employee No.', emp.employeeNumber || String(emp.id)],
          ['Position',    emp.position || '—'],
          ['Department',  emp.department || '—'],
        ];
        const infoR = [
          ['Bank',         emp.bankName      || '—'],
          ['Account No.',  emp.accountNumber ? '****' + String(emp.accountNumber).slice(-4) : '—'],
          ['Branch Code',  emp.branchCode    || '—'],
          ['Account Type', emp.accountType   || '—'],
          ['Tax Number',   emp.taxNumber     || '—'],
        ];

        let iy = infoY + 6;
        doc.setFontSize(7);
        infoL.forEach(([lbl, val]) => {
          doc.setTextColor(...C_GRAY);  doc.setFont('helvetica', 'normal'); doc.text(lbl + ':', 13, iy);
          doc.setTextColor(...C_SLATE); doc.setFont('helvetica', 'bold');   doc.text(val, 42, iy);
          iy += 5;
        });
        iy = infoY + 6;
        infoR.forEach(([lbl, val]) => {
          doc.setTextColor(...C_GRAY);  doc.setFont('helvetica', 'normal'); doc.text(lbl + ':', pw / 2 + 4, iy);
          doc.setTextColor(...C_SLATE); doc.setFont('helvetica', 'bold');   doc.text(val, pw / 2 + 32, iy);
          iy += 5;
        });

        // ── Earnings & Deductions columns ───────────────────────────────────
        const tY   = infoY + 32;
        const colW = (pw - 24) / 2;   // two equal columns with gap
        const lX   = 10;
        const rX   = 10 + colW + 4;

        // Column headings
        doc.setFillColor(...C_INDIGO);
        doc.rect(lX, tY, colW, 7, 'F');
        doc.setTextColor(...C_WHITE); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
        doc.text('EARNINGS', lX + 3, tY + 5);
        doc.text('AMOUNT',   lX + colW - 3, tY + 5, { align: 'right' });

        doc.setFillColor(...C_RED);
        doc.rect(rX, tY, colW, 7, 'F');
        doc.text('DEDUCTIONS', rX + 3, tY + 5);
        doc.text('AMOUNT',     rX + colW - 3, tY + 5, { align: 'right' });

        const earnItems = [['Basic Salary', basic]];
        custAllow.forEach(b => earnItems.push([b.name, calcBV(b)]));
        if (otherAllow > 0.01) earnItems.push(['Other Allowances', otherAllow]);
        if (bonus > 0)         earnItems.push(['Bonus', bonus]);

        const dedItems = [['PAYE Tax', paye], ['UIF (Employee)', uif]];
        if (med > 0) dedItems.push(['Medical Aid', med]);
        if (pen > 0) dedItems.push(['Pension/Provident', pen]);
        custDed.forEach(b => dedItems.push([b.name, calcBV(b)]));
        if (garn > 0)        dedItems.push(['Garnishee', garn]);
        if (manualDed > 0.01) dedItems.push(['Other Deductions', manualDed]);

        let ey = tY + 13;
        doc.setFontSize(8);
        earnItems.forEach(([lbl, val], i) => {
          if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(lX, ey - 4.5, colW, 6, 'F'); }
          doc.setTextColor(...C_SLATE); doc.setFont('helvetica', 'normal'); doc.text(lbl, lX + 3, ey);
          doc.setFont('helvetica', 'bold'); doc.text(fmt(val), lX + colW - 3, ey, { align: 'right' });
          ey += 6;
        });
        // Earnings total row
        doc.setFillColor(...C_LTGRAY);
        doc.rect(lX, ey - 2, colW, 7, 'F');
        doc.setTextColor(...C_SLATE); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
        doc.text('TOTAL EARNINGS', lX + 3, ey + 3);
        doc.text(fmt(totalEarn), lX + colW - 3, ey + 3, { align: 'right' });
        ey += 10;

        let dy = tY + 13;
        doc.setFontSize(8);
        dedItems.forEach(([lbl, val], i) => {
          if (i % 2 === 0) { doc.setFillColor(255, 242, 242); doc.rect(rX, dy - 4.5, colW, 6, 'F'); }
          doc.setTextColor(...C_SLATE); doc.setFont('helvetica', 'normal'); doc.text(lbl, rX + 3, dy);
          doc.setTextColor(...C_RED); doc.setFont('helvetica', 'bold'); doc.text(fmt(val), rX + colW - 3, dy, { align: 'right' });
          dy += 6;
        });
        // Deductions total row
        doc.setFillColor(254, 226, 226);
        doc.rect(rX, dy - 2, colW, 7, 'F');
        doc.setTextColor(...C_RED); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
        doc.text('TOTAL DEDUCTIONS', rX + 3, dy + 3);
        doc.text(fmt(totalDed), rX + colW - 3, dy + 3, { align: 'right' });
        dy += 10;

        const bottomOfTable = Math.max(ey, dy);

        // ── Net Pay box (full width indigo) ─────────────────────────────────
        const netY = bottomOfTable + 4;
        doc.setFillColor(...C_INDIGO);
        doc.roundedRect(10, netY, pw - 20, 20, 3, 3, 'F');
        doc.setTextColor(...C_WHITE);
        // Left side: gross & period label
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.text('Gross Pay', 14, netY + 7);
        doc.setFontSize(11); doc.setFont('helvetica', 'bold');
        doc.text(fmt(totalEarn), 14, netY + 15);
        // Right side: net pay label & value
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.text('NET PAY TO ACCOUNT', pw - 14, netY + 7, { align: 'right' });
        doc.setFontSize(20); doc.setFont('helvetica', 'bold');
        doc.text(fmt(netPay), pw - 14, netY + 17, { align: 'right' });

        // ── Employer contributions & Tax Year ───────────────────────────────
        const contY = netY + 26;
        doc.setFillColor(...C_BGBLUE);
        doc.rect(10, contY, pw - 20, 16, 'F');
        doc.setTextColor(...C_GRAY); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
        doc.text('EMPLOYER CONTRIBUTIONS', 13, contY + 5);
        doc.text('TAX YEAR 2025/2026 (PROJECTED)', pw / 2 + 4, contY + 5);

        doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_SLATE);
        doc.text(`SDL: ${fmt(sdl)}`, 13, contY + 10);
        doc.text(`UIF (Employer): ${fmt(uif)}`, 45, contY + 10);
        doc.text(`Total CTC: ${fmt(totalEarn + sdl + uif)}`, 85, contY + 10);

        doc.text(`Taxable Income (Annual): ${fmt(totalEarn * 12)}`, pw / 2 + 4, contY + 10);
        doc.text(`Est. Annual Tax: ${fmt(paye * 12)}`, pw / 2 + 4, contY + 14);

        // ── Footer line ─────────────────────────────────────────────────────
        const footY = contY + 22;
        doc.setDrawColor(...C_LTGRAY);
        doc.line(10, footY, pw - 10, footY);
        doc.setTextColor(...C_GRAY); doc.setFontSize(7);
        doc.text(
          `Electronically generated by Nexa HR & Payroll  •  Ref: ${runId}`,
          pw / 2, footY + 5, { align: 'center' }
        );
        doc.text(
          `For queries contact HR at ${comp.email || 'hr@company.co.za'}`,
          pw / 2, footY + 10, { align: 'center' }
        );

        doSend(doc.output('datauristring').split(',')[1]);
        return;
      }
    } catch (fallbackErr) {
      console.warn('[Payslips.sendEmail] fallback PDF failed:', fallbackErr.message);
    }

    // No PDF — send email body only (still shows the exact payslip in the email)
    doSend(null);
  }