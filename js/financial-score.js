/* WealthLens – financial-score.js
   Transparent 0–100 score with category breakdown. Distinguishes
   missing information from confirmed zero. */
'use strict';

const FinancialScore = (() => {

  function evaluate(profile){
    const categories = [];
    const strengths = [];
    const weaknesses = [];
    const recommendations = [];
    const missing = [];

    // 1) Savings rate (max 20)
    const sr = Calc.savingsRate(profile);
    {
      const weight = 20;
      if(sr === null){
        missing.push('Savings rate (no income recorded)');
        categories.push({ name:'Savings Rate', score:null, weight, note:'No income recorded' });
      } else {
        const score = Math.max(0, Math.min(weight, (sr/30)*weight)); // 30%+ = full
        categories.push({ name:'Savings Rate', score, weight, note:`${Calc.pct(sr)} savings rate` });
        if(sr >= 30) strengths.push(`Excellent savings rate of ${Calc.pct(sr)}.`);
        else if(sr < 15) { weaknesses.push(`Low savings rate of ${Calc.pct(sr)}.`); recommendations.push('Aim to save at least 20–30% of monthly income.'); }
        else strengths.push(`Healthy savings rate of ${Calc.pct(sr)}.`);
      }
    }

    // 2) Debt-to-income (max 15) — lower is better
    const dti = Calc.debtToIncome(profile);
    {
      const weight = 15;
      if(dti === null){
        missing.push('Debt-to-income ratio (no income recorded)');
        categories.push({ name:'Debt-to-Income', score:null, weight, note:'No income recorded' });
      } else {
        let score;
        if(dti <= 20) score = weight;
        else if(dti <= 36) score = weight * 0.75;
        else if(dti <= 50) score = weight * 0.45;
        else score = Math.max(0, weight * (1 - Math.min(1, (dti-50)/50)));
        categories.push({ name:'Debt-to-Income', score, weight, note:`${Calc.pct(dti)} DTI` });
        if(dti <= 20) strengths.push(`Very low debt-to-income ratio of ${Calc.pct(dti)}.`);
        else if(dti > 40) { weaknesses.push(`High debt-to-income ratio of ${Calc.pct(dti)}.`); recommendations.push('Reduce EMIs and avoid new debt to bring DTI below 36%.'); }
      }
    }

    // 3) Emergency fund (max 15) — 6+ months full
    const efc = Calc.emergencyFundCoverage(profile);
    {
      const weight = 15;
      if(efc === null){
        missing.push('Emergency fund coverage (no expenses recorded)');
        categories.push({ name:'Emergency Fund', score:null, weight, note:'No expenses recorded' });
      } else {
        const score = Math.max(0, Math.min(weight, (efc/6)*weight));
        categories.push({ name:'Emergency Fund', score, weight, note:`${efc.toFixed(1)} months` });
        if(efc >= 6) strengths.push(`Emergency fund covers ${efc.toFixed(1)} months of expenses.`);
        else { weaknesses.push(`Emergency fund covers only ${efc.toFixed(1)} months.`); recommendations.push('Build an emergency fund covering 6 months of expenses.'); }
      }
    }

    // 4) Insurance (max 15) — coverage vs annual income
    {
      const weight = 15;
      const annualIncome = Calc.totalAnnualIncome(profile);
      const totalCoverage = profile.insurance.reduce((s,i)=>s+Calc.zeroIfNull(i.coverageAmount),0);
      if(profile.insurance.length === 0){
        missing.push('Insurance policies');
        categories.push({ name:'Insurance', score:null, weight, note:'No policies recorded' });
        recommendations.push('Add life/health insurance policies.');
      } else if(annualIncome <= 0){
        missing.push('Insurance coverage assessment (no annual income)');
        categories.push({ name:'Insurance', score:null, weight, note:'Annual income required to assess' });
      } else {
        const mult = totalCoverage / annualIncome;
        const score = Math.max(0, Math.min(weight, (mult/10)*weight)); // 10x = full
        categories.push({ name:'Insurance', score, weight, note:`${mult.toFixed(1)}× annual income` });
        if(mult >= 10) strengths.push(`Insurance coverage is ${mult.toFixed(1)}× annual income.`);
        else { weaknesses.push(`Insurance coverage is only ${mult.toFixed(1)}× annual income.`); recommendations.push('Increase life/health coverage toward 10× annual income.'); }
      }
    }

    // 5) Investment diversification (max 15) — count distinct types
    {
      const weight = 15;
      const types = new Set(profile.investments.map(i=>i.type).filter(Boolean));
      if(profile.investments.length === 0){
        missing.push('Investments');
        categories.push({ name:'Investment Diversification', score:null, weight, note:'No investments recorded' });
        recommendations.push('Start investing across diversified asset classes.');
      } else {
        const score = Math.max(0, Math.min(weight, (types.size/5)*weight)); // 5+ types = full
        categories.push({ name:'Investment Diversification', score, weight, note:`${types.size} types` });
        if(types.size >= 4) strengths.push(`Diversified across ${types.size} investment types.`);
        else { weaknesses.push(`Only ${types.size} investment type(s).`); recommendations.push('Diversify across mutual funds, equity, debt and gold.'); }
      }
    }

    // 6) Net worth (max 10) — positive and growing
    {
      const weight = 10;
      const nw = Calc.netWorth(profile);
      const hasAny = profile.assets.length + profile.investments.length + profile.banking.length + profile.loans.length > 0;
      if(!hasAny){
        missing.push('Net worth (no financial records)');
        categories.push({ name:'Net Worth', score:null, weight, note:'No data' });
      } else {
        const score = nw > 0 ? weight : (nw === 0 ? weight*0.5 : 0);
        categories.push({ name:'Net Worth', score, weight, note:Calc.fmt(nw) });
        if(nw > 0) strengths.push('Positive net worth.');
        else if(nw < 0) { weaknesses.push('Negative net worth.'); recommendations.push('Focus on reducing liabilities and growing assets.'); }
      }
    }

    // 7) Retirement readiness (max 10)
    {
      const weight = 10;
      const proj = Calc.retirementProjection(profile);
      if(!proj.complete){
        missing.push('Retirement readiness (inputs incomplete)');
        categories.push({ name:'Retirement Readiness', score:null, weight, note:proj.reason||'Incomplete' });
      } else {
        const score = Math.max(0, Math.min(weight, (proj.readiness/100)*weight));
        categories.push({ name:'Retirement Readiness', score, weight, note:Calc.pct(proj.readiness)+' ready' });
        if(proj.readiness >= 90) strengths.push('Retirement plan is on track.');
        else if(proj.readiness < 50) { weaknesses.push(`Retirement readiness is ${Calc.pct(proj.readiness)}.`); recommendations.push('Increase monthly retirement SIP contributions.'); }
      }
    }

    // Overall — average of available categories, scaled to 100
    const available = categories.filter(c=>c.score !== null);
    const totalWeightAvailable = available.reduce((s,c)=>s+c.weight,0);
    const totalScore = available.reduce((s,c)=>s+(c.score||0),0);
    const overall = totalWeightAvailable > 0 ? (totalScore/totalWeightAvailable)*100 : null;

    let status;
    if(overall === null) status = 'Incomplete — add financial data to generate a score.';
    else if(overall >= 80) status = 'Excellent';
    else if(overall >= 65) status = 'Good';
    else if(overall >= 50) status = 'Fair';
    else status = 'Needs Improvement';

    return { overall, categories, strengths, weaknesses, recommendations, missing, status };
  }

  function render(){
    const p = Storage.getActive(); if(!p) return;
    const r = evaluate(p);
    const hero = document.getElementById('score-hero');

    const score = r.overall === null ? 0 : Math.round(r.overall);
    const color = r.overall === null ? 'var(--muted)' : (score>=80?'var(--green)':score>=60?'var(--blue)':score>=40?'var(--amber)':'var(--red)');
    hero.innerHTML = `
      <div class="score-ring" style="--pct:${score};--col:${color}"><span>${r.overall===null?'—':score}</span></div>
      <div class="score-meta">
        <h3>${r.status}</h3>
        <p class="hint">${r.overall===null ? 'Score cannot be computed until key data is provided.' : 'Score out of 100 based on available categories.'}</p>
        ${r.missing.length ? `<p class="hint">⚠ Missing information: ${r.missing.join('; ')}.</p>` : ''}
      </div>`;

    const cats = document.getElementById('score-cats');
    cats.innerHTML = r.categories.map(c=>{
      if(c.score === null){
        return `<div class="score-cat">
          <div class="top"><span>${esc(c.name)}</span><span>—</span></div>
          <div class="bar"><i style="width:0%"></i></div>
          <p class="hint" style="margin-top:6px">${esc(c.note)}</p>
        </div>`;
      }
      const pctVal = (c.score / c.weight) * 100;
      const warn = pctVal < 50 ? 'warn' : '';
      return `<div class="score-cat">
        <div class="top"><span>${esc(c.name)}</span><span>${c.score.toFixed(1)} / ${c.weight}</span></div>
        <div class="bar ${warn}"><i style="width:${pctVal}%"></i></div>
        <p class="hint" style="margin-top:6px">${esc(c.note)}</p>
      </div>`;
    }).join('');

    const ul = (id, arr, emptyTxt) => {
      const el = document.getElementById(id);
      el.innerHTML = arr.length ? arr.map(x=>`<li>${esc(x)}</li>`).join('') : `<li>${emptyTxt}</li>`;
    };
    ul('score-strengths', r.strengths, 'No strengths identified yet.');
    ul('score-weaknesses', r.weaknesses, 'No weaknesses identified.');
    ul('score-recommendations', r.recommendations, 'No recommendations — keep it up!');
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return { evaluate, render };
})();
