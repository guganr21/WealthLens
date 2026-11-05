/* WealthLens – report.js
   Generates a complete dark-themed PDF financial report using jsPDF. */
'use strict';

const Report = (() => {

  const DARK = [15, 23, 42];
  const DARKER = [11, 17, 32];
  const CARD = [19, 28, 49];
  const TEXT = [238, 242, 251];
  const MUTED = [139, 152, 184];
  const BLUE = [59, 130, 246];
  const GREEN = [16, 185, 129];
  const RED = [239, 68, 68];

  function money(n){ return n===null||n===undefined||Number.isNaN(n) ? '—' : '₹' + Number(n).toLocaleString('en-IN', {maximumFractionDigits:2}); }

  function generate(){
    const p = Storage.getActive();
    if(!p){ alert('No active profile.'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'pt', format:'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    let y = 0;

    function newPage(){
      doc.addPage();
      paintBackground();
      y = margin;
    }
    function paintBackground(){
      doc.setFillColor(...DARKER);
      doc.rect(0,0,pageW,pageH,'F');
      // subtle top band
      doc.setFillColor(...DARK);
      doc.rect(0,0,pageW,90,'F');
      doc.setFillColor(...BLUE);
      doc.rect(0,88,pageW,2,'F');
    }
    function ensure(space){
      if(y + space > pageH - margin){ newPage(); }
    }
    function title(){
      doc.setTextColor(...TEXT);
      doc.setFont('helvetica','bold');
      doc.setFontSize(22);
      doc.text('WealthLens', margin, 50);
      doc.setFontSize(10);
      doc.setTextColor(...MUTED);
      doc.setFont('helvetica','normal');
      doc.text('Personal & Family Financial Report', margin, 66);
      doc.text('Generated: ' + new Date().toLocaleString(), pageW - margin, 50, { align:'right' });
      doc.text('Profile: ' + p.name, pageW - margin, 66, { align:'right' });
    }
    function heading(text){
      ensure(40);
      doc.setTextColor(...BLUE);
      doc.setFont('helvetica','bold');
      doc.setFontSize(13);
      doc.text(text, margin, y);
      doc.setDrawColor(...BLUE);
      doc.setLineWidth(0.8);
      doc.line(margin, y+4, pageW - margin, y+4);
      y += 18;
    }
    function kv(rows){
      doc.setFont('helvetica','normal');
      doc.setFontSize(10);
      rows.forEach(([k,v])=>{
        ensure(16);
        doc.setTextColor(...MUTED);
        doc.text(String(k), margin, y);
        doc.setTextColor(...TEXT);
        doc.text(String(v), pageW - margin, y, { align:'right' });
        y += 16;
      });
      y += 4;
    }
    function table(head, rows){
      ensure(40);
      if(!rows.length){
        doc.setTextColor(...MUTED);
        doc.setFontSize(10);
        doc.text('No records.', margin, y);
        y += 18;
        return;
      }
      const colW = (pageW - margin*2) / head.length;
      // header
      doc.setFillColor(...CARD);
      doc.rect(margin, y-12, pageW - margin*2, 20, 'F');
      doc.setTextColor(...MUTED);
      doc.setFont('helvetica','bold');
      doc.setFontSize(9);
      head.forEach((h,i)=>doc.text(String(h), margin + i*colW + 4, y+2));
      y += 18;
      doc.setFont('helvetica','normal');
      doc.setFontSize(9);
      doc.setTextColor(...TEXT);
      rows.forEach((r,idx)=>{
        ensure(16);
        if(idx%2===0){
          doc.setFillColor(...DARK);
          doc.rect(margin, y-10, pageW - margin*2, 16, 'F');
        }
        r.forEach((c,i)=>{
          const s = String(c);
          const clipped = doc.splitTextToSize(s, colW - 8)[0] || '';
          doc.text(clipped, margin + i*colW + 4, y+1);
        });
        y += 16;
      });
      y += 8;
    }
    function paragraph(text, color){
      ensure(20);
      doc.setTextColor(...(color||MUTED));
      doc.setFont('helvetica','normal');
      doc.setFontSize(9.5);
      const lines = doc.splitTextToSize(text, pageW - margin*2);
      lines.forEach(line=>{ ensure(14); doc.text(line, margin, y); y += 13; });
      y += 4;
    }
    function bullets(arr){
      doc.setFontSize(9.5);
      arr.forEach(txt=>{
        ensure(16);
        doc.setTextColor(...GREEN);
        doc.text('•', margin, y);
        doc.setTextColor(...TEXT);
        const lines = doc.splitTextToSize(txt, pageW - margin*2 - 14);
        lines.forEach((line,i)=>{ if(i>0) ensure(13); doc.text(line, margin+14, y); y += 13; });
        y += 2;
      });
      y += 6;
    }

    // ---- Build ----
    paintBackground();
    title();
    y = 110;

    // Personal
    heading('Personal Information');
    kv([
      ['Name', p.name || '—'],
      ['Age', p.age || '—'],
      ['Occupation', p.occupation || '—'],
      ['Email', p.email || '—']
    ]);

    // Family
    heading('Family Members');
    table(['Name','Relationship','Age','Employment','Monthly Income','Dependency'],
      p.family.map(m=>[m.name||'—', m.relationship||'—', m.age||'—', m.employment||'—', money(Calc.zeroIfNull(m.monthlyIncome)), m.dependency||'—']));

    // Summary
    const monthlyIncome = Calc.monthlyIncome(p);
    const annualIncome = Calc.totalAnnualIncome(p);
    const monthlyExp = Calc.monthlyExpenses(p);
    const annualExp = Calc.annualExpenses(p);
    const savings = Calc.monthlySavings(p);
    const sr = Calc.savingsRate(p);

    heading('Income & Expenses Summary');
    kv([
      ['Monthly Income', money(monthlyIncome)],
      ['Annual Income', money(annualIncome)],
      ['Monthly Expenses', money(monthlyExp)],
      ['Annual Expenses', money(annualExp)],
      ['Monthly Savings', money(savings)],
      ['Savings Rate', sr===null?'—':sr.toFixed(1)+'%']
    ]);

    // Income detail
    heading('Income Sources');
    table(['Source','Category','Amount','Frequency'],
      p.income.map(i=>[i.source||'—', i.category||'—', money(Calc.zeroIfNull(i.amount)), i.frequency||'monthly']));

    // Expense detail
    heading('Expenses');
    table(['Name','Category','Amount','Frequency'],
      p.expenses.map(i=>[i.name||'—', i.category||'—', money(Calc.zeroIfNull(i.amount)), i.frequency||'monthly']));

    // Assets
    heading('Assets');
    table(['Asset','Category','Purchase Price','Current Value'],
      p.assets.map(a=>[a.name||'—', a.category||'—', a.purchasePrice===''?'—':money(Calc.zeroIfNull(a.purchasePrice)), money(Calc.zeroIfNull(a.currentValue))]));

    // Investments
    heading('Investments');
    table(['Name','Type','Invested','Current'],
      p.investments.map(i=>[i.name||'—', i.type||'—', money(Calc.zeroIfNull(i.investedAmount)), money(Calc.zeroIfNull(i.currentValue))]));

    // Loans
    heading('Loans & Liabilities');
    table(['Loan','Type','Outstanding','EMI','Rate','Tenure (mo)'],
      p.loans.map(l=>[l.name||'—', l.type||'—', money(Calc.zeroIfNull(l.outstanding)), money(Calc.zeroIfNull(l.monthlyEMI)), l.interestRate?l.interestRate+'%':'—', l.remainingTenure||'—']));

    // Insurance
    heading('Insurance');
    table(['Policy','Type','Coverage','Premium','Frequency','Renewal'],
      p.insurance.map(i=>[i.name||'—', i.type||'—', money(Calc.zeroIfNull(i.coverageAmount)), money(Calc.zeroIfNull(i.premiumAmount)), i.premiumFrequency||'yearly', i.renewalDate||'—']));

    // Banking
    heading('Bank Accounts & Emergency Fund');
    table(['Bank','Type','Balance','Emergency Fund'],
      p.banking.map(b=>[b.bankName||'—', b.accountType||'—', money(Calc.zeroIfNull(b.currentBalance)), money(Calc.zeroIfNull(b.emergencyFund))]));
    const efc = Calc.emergencyFundCoverage(p);
    paragraph('Emergency fund coverage: ' + (efc===null?'Not computable (no expenses)':efc.toFixed(1)+' months'));

    // Net worth
    heading('Net Worth Summary');
    const totalAssets = Calc.totalAssets(p);
    const totalInvest = Calc.investmentsTotal(p);
    const totalLiab = Calc.totalLiabilities(p);
    const bankBal = Calc.bankingBalance(p);
    const nw = Calc.netWorth(p);
    kv([
      ['Total Assets (non-investment)', money(totalAssets)],
      ['Total Investments', money(totalInvest)],
      ['Bank Balances', money(bankBal)],
      ['Total Liabilities', money(totalLiab)],
      ['Net Worth', money(nw)]
    ]);

    // Retirement
    heading('Retirement Projections');
    const rp = Calc.retirementProjection(p);
    if(!rp.complete){
      paragraph('Retirement projections unavailable: ' + (rp.reason||'incomplete inputs.'));
    }else{
      kv([
        ['Current Age', rp.currentAge],
        ['Retirement Age', rp.retAge],
        ['Life Expectancy', rp.lifeExp],
        ['Years to Retirement', rp.yearsToRet],
        ['Future Monthly Expenses', money(rp.futureMonthlyExp)],
        ['Required Retirement Corpus', money(rp.requiredCorpus)],
        ['Projected Retirement Wealth', money(rp.projectedWealth)],
        ['Retirement Savings Gap', money(rp.gap)],
        ['Required Monthly SIP', money(rp.monthlySIP)],
        ['Retirement Readiness', rp.readiness.toFixed(1)+'%']
      ]);
      heading('Retirement Scenarios');
      const scenarios = Calc.retirementScenarios(p);
      table(['Retire Age','Years','Future Monthly Exp.','Required Corpus','Projected Wealth','Gap','Required SIP','Readiness'],
        scenarios.map(s=>s.complete ? [s.age, s.yearsToRet, money(s.futureMonthlyExp), money(s.requiredCorpus), money(s.projectedWealth), money(s.gap), money(s.monthlySIP), s.readiness.toFixed(1)+'%'] : [s.age,'—','—','—','—','—','—','—']));
      paragraph('Assumptions: inflation ' + rp.assumptions.inflation + '% / year; expected return ' + rp.assumptions.return + '% / year; real return during retirement ' + (rp.assumptions.realReturnDuringRetirement*100).toFixed(2) + '%.');
    }

    // Financial Health Score
    heading('Financial Health Score');
    const score = FinancialScore.evaluate(p);
    if(score.overall === null){
      paragraph('Score could not be computed. Missing information: ' + score.missing.join('; '), RED);
    }else{
      kv([['Overall Score', Math.round(score.overall) + ' / 100'], ['Status', score.status]]);
      table(['Category','Score','Max','Note'],
        score.categories.map(c=>[c.name, c.score===null?'—':c.score.toFixed(1), c.weight, c.note]));
      if(score.strengths.length){ heading('Strengths'); bullets(score.strengths); }
      if(score.weaknesses.length){ heading('Weaknesses'); bullets(score.weaknesses); }
      if(score.recommendations.length){ heading('Recommendations'); bullets(score.recommendations); }
      if(score.missing.length){ heading('Missing Information'); bullets(score.missing); }
    }

    // Calculation assumptions & disclaimer
    heading('Calculation Assumptions');
    bullets([
      'All monetary values are in Indian Rupees (₹) unless otherwise specified.',
      'Income and expense values are normalized to monthly figures using their declared frequency.',
      'Retirement corpus is computed using the present value of inflation-adjusted future expenses discounted by the effective real return during retirement.',
      'Financial Health Score is computed only from categories where sufficient data exists; missing information is not treated as zero.',
      'Emergency fund coverage = emergency fund / monthly expenses.'
    ]);
    heading('Disclaimer');
    paragraph('This report is generated from data entered by the user in WealthLens. All projections, scores and recommendations are estimates for informational purposes only and are not guaranteed financial outcomes. WealthLens does not provide regulated financial advice. Please consult a qualified financial professional before making major financial decisions.', MUTED);

    // Footer on each page
    const totalPages = doc.internal.getNumberOfPages();
    for(let i=1;i<=totalPages;i++){
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text('WealthLens — confidential, locally generated', margin, pageH - 20);
      doc.text('Page ' + i + ' / ' + totalPages, pageW - margin, pageH - 20, { align:'right' });
    }

    const safeName = (p.name || 'profile').replace(/[^a-z0-9-_]/gi, '_');
    doc.save('WealthLens_Report_' + safeName + '_' + new Date().toISOString().slice(0,10) + '.pdf');
  }

  function bind(){
    document.getElementById('download-report-btn').addEventListener('click', generate);
  }
  return { generate, bind };
})();
