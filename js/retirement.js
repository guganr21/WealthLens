/* WealthLens – retirement.js */
'use strict';

const Retirement = (() => {

  function fillInputs(){
    const p = Storage.getActive(); if(!p) return;
    const r = p.retirement || {};
    document.getElementById('ret-age').value = r.currentAge ?? '';
    document.getElementById('ret-savings').value = r.savings ?? '';
    document.getElementById('ret-expenses').value = r.monthlyExpenses ?? '';
    document.getElementById('ret-inflation').value = r.inflation ?? 6;
    document.getElementById('ret-return').value = r.return ?? 10;
    document.getElementById('ret-life').value = r.lifeExpectancy ?? 85;
  }

  function saveInputs(){
    const p = Storage.getActive(); if(!p) return;
    p.retirement = {
      ...p.retirement,
      currentAge: document.getElementById('ret-age').value,
      savings: document.getElementById('ret-savings').value,
      monthlyExpenses: document.getElementById('ret-expenses').value,
      inflation: document.getElementById('ret-inflation').value,
      return: document.getElementById('ret-return').value,
      lifeExpectancy: document.getElementById('ret-life').value
    };
    Storage.save();
    render();
  }

  function render(){
    const p = Storage.getActive(); if(!p) return;

    const base = Calc.retirementProjection(p);
    const summary = document.getElementById('retirement-summary');
    const hint = document.getElementById('ret-incomplete-hint');
    const table = document.getElementById('table-retirement');
    const assumptions = document.getElementById('retirement-assumptions');

    if(!base.complete){
      hint.textContent = base.reason || 'Fill in the required fields to see retirement projections.';
      hint.classList.remove('hidden');
      summary.innerHTML = '';
      table.innerHTML = '';
      assumptions.innerHTML = '';
      return;
    }
    hint.classList.add('hidden');

    summary.innerHTML = `
      <div class="summary-tile"><div class="l">Years to Retirement</div><div class="v">${base.yearsToRet}</div></div>
      <div class="summary-tile"><div class="l">Future Monthly Expenses</div><div class="v">${Calc.fmt(base.futureMonthlyExp)}</div></div>
      <div class="summary-tile"><div class="l">Required Corpus</div><div class="v">${Calc.fmt(base.requiredCorpus)}</div></div>
      <div class="summary-tile"><div class="l">Projected Wealth</div><div class="v">${Calc.fmt(base.projectedWealth)}</div></div>
      <div class="summary-tile"><div class="l">Savings Gap</div><div class="v ${base.gap>0?'neg':'pos'}">${Calc.fmt(base.gap)}</div></div>
      <div class="summary-tile"><div class="l">Required Monthly SIP</div><div class="v">${Calc.fmt(base.monthlySIP)}</div></div>
      <div class="summary-tile"><div class="l">Readiness</div><div class="v ${base.readiness>=100?'pos':(base.readiness>=60?'':'neg')}">${Calc.pct(base.readiness)}</div></div>`;

    const scenarios = Calc.retirementScenarios(p);
    table.innerHTML = `
      <thead><tr><th>Retire Age</th><th>Years to Retire</th><th>Future Monthly Exp.</th><th>Required Corpus</th><th>Projected Wealth</th><th>Gap</th><th>Required SIP</th><th>Readiness</th></tr></thead>
      <tbody>${scenarios.map(s=>{
        if(!s.complete){
          return `<tr><td>${s.age}</td><td colspan="7" style="color:var(--muted)">${esc(s.reason||'—')}</td></tr>`;
        }
        return `<tr>
          <td><span class="tag">${s.age}</span></td>
          <td>${s.yearsToRet}</td>
          <td>${Calc.fmt(s.futureMonthlyExp)}</td>
          <td>${Calc.fmt(s.requiredCorpus)}</td>
          <td>${Calc.fmt(s.projectedWealth)}</td>
          <td class="${s.gap>0?'neg':'pos'}">${Calc.fmt(s.gap)}</td>
          <td>${Calc.fmt(s.monthlySIP)}</td>
          <td>${Calc.pct(s.readiness)}</td>
        </tr>`;
      }).join('')}</tbody>`;

    assumptions.innerHTML = `
      <li>Retirement corpus is computed as the present value, at retirement age, of future living expenses inflated by <strong>${base.assumptions.inflation}%</strong> per year and discounted by the effective real return during retirement (real return = ${Calc.pct(base.assumptions.realReturnDuringRetirement*100)}).</li>
      <li>Projected retirement wealth grows current savings of ${Calc.fmtFull(base.assumptions.currentSavings)} at <strong>${base.assumptions.return}%</strong> per year until retirement age.</li>
      <li>Required monthly SIP assumes the same <strong>${base.assumptions.return}%</strong> annual return and contributes monthly until retirement.</li>
      <li>Life expectancy assumption: <strong>${base.lifeExp}</strong> years.</li>
      <li>These are projections, not guarantees. Actual inflation, returns and expenses will vary.</li>`;

    // persist retirement input state on save indicator via Storage.save() above
  }

  function bind(){
    ['ret-age','ret-savings','ret-expenses','ret-inflation','ret-return','ret-life'].forEach(id=>{
      document.getElementById(id).addEventListener('input', saveInputs);
    });
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return { render, bind, fillInputs };
})();
