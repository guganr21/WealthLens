/* WealthLens – app.js
   Main controller: routing, modal system, quick-add, banking module,
   dashboard charts, event wiring, save indicator, toasts. */
'use strict';

const App = (() => {

  let charts = {};

  /* ---------- toast ---------- */
  function toast(msg, kind){
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast ' + (kind||'');
    el.classList.remove('hidden');
    clearTimeout(el._t);
    el._t = setTimeout(()=>el.classList.add('hidden'), 2600);
  }

  /* ---------- modal system ---------- */
  function openModal({ title, fields, onSubmit }){
    const modal = document.getElementById('modal');
    const form = document.getElementById('modal-form');
    document.getElementById('modal-title').textContent = title || 'Edit';
    form.innerHTML = '';
    fields.forEach(f => {
      const wrap = document.createElement('div');
      wrap.className = 'field';
      const label = document.createElement('label');
      label.textContent = f.label;
      wrap.appendChild(label);
      let input;
      if(f.type === 'select'){
        input = document.createElement('select');
        const opts = f.options || [];
        const empty = document.createElement('option');
        empty.value=''; empty.textContent='—';
        input.appendChild(empty);
        opts.forEach(o=>{
          const opt = document.createElement('option');
          opt.value = o;
          opt.textContent = (f.labels && f.labels[o]) || o;
          if(String(f.value) === String(o)) opt.selected = true;
          input.appendChild(opt);
        });
      } else {
        input = document.createElement('input');
        input.type = f.type || 'text';
        if(f.value !== undefined && f.value !== null) input.value = f.value;
        if(f.placeholder) input.placeholder = f.placeholder;
        if(f.required) input.required = true;
      }
      input.name = f.name;
      if(f.required) input.required = true;
      wrap.appendChild(input);
      form.appendChild(wrap);
    });

    modal.classList.remove('hidden');
    const firstInput = form.querySelector('input,select');
    if(firstInput) setTimeout(()=>firstInput.focus(), 30);

    const submitBtn = document.getElementById('modal-submit');

    // replace listener by cloning
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    const close = () => modal.classList.add('hidden');

    newForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const data = {};
      Array.from(newForm.elements).forEach(el=>{
        if(el.name) data[el.name] = el.value;
      });
      // basic required validation
      for(const f of fields){
        if(f.required && (!data[f.name] || String(data[f.name]).trim()==='')){
          toast('Please fill: ' + f.label, 'error');
          return;
        }
      }
      try{
        onSubmit(data);
        close();
      }catch(err){
        console.error(err);
        toast('Error: ' + err.message, 'error');
      }
    });

    modal.querySelectorAll('[data-close]').forEach(el=>{
      el.onclick = close;
    });
    submitBtn.onclick = () => newForm.requestSubmit();
  }

  /* ---------- Banking module ---------- */
  const Banking = (() => {
    const TYPES = ['Savings','Current','Salary','NRE','NRO','Other'];
    function fields(b){
      b = b || {};
      return [
        {name:'bankName', label:'Bank Name *', type:'text', required:true, value:b.bankName||''},
        {name:'accountType', label:'Account Type', type:'select', value:b.accountType||'Savings', options:TYPES},
        {name:'currentBalance', label:'Current Balance (₹)', type:'number', value:b.currentBalance||''},
        {name:'emergencyFund', label:'Emergency Fund Amount (₹)', type:'number', value:b.emergencyFund||''}
      ];
    }
    function render(){
      const p = Storage.getActive(); if(!p) return;
      const table = document.getElementById('table-banking');
      const empty = document.getElementById('empty-banking');
      const summary = document.getElementById('banking-summary');
      const list = p.banking;
      const total = Calc.bankingBalance(p);
      const ef = Calc.emergencyFund(p);
      const cov = Calc.emergencyFundCoverage(p);
      summary.innerHTML = `
        <div class="summary-tile"><div class="l">Total Bank Balance</div><div class="v pos">${Calc.fmt(total)}</div></div>
        <div class="summary-tile"><div class="l">Emergency Fund</div><div class="v">${Calc.fmt(ef)}</div></div>
        <div class="summary-tile"><div class="l">Coverage</div><div class="v">${cov===null?'—':cov.toFixed(1)+' months'}</div></div>`;
      if(list.length===0){ table.innerHTML=''; empty.classList.remove('hidden'); return; }
      empty.classList.add('hidden');
      table.innerHTML = `
        <thead><tr><th>Bank</th><th>Type</th><th>Balance</th><th>Emergency Fund</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>${list.map(b=>`
          <tr>
            <td>${esc(b.bankName)}</td>
            <td><span class="tag">${esc(b.accountType||'—')}</span></td>
            <td>${Calc.fmtFull(Calc.zeroIfNull(b.currentBalance))}</td>
            <td>${Calc.fmtFull(Calc.zeroIfNull(b.emergencyFund))}</td>
            <td><div class="cell-actions">
              <button class="mini-btn" data-edit-bank="${b.id}">Edit</button>
              <button class="mini-btn danger" data-del-bank="${b.id}">Delete</button>
            </div></td>
          </tr>`).join('')}</tbody>`;
      table.querySelectorAll('[data-edit-bank]').forEach(x=>x.addEventListener('click',()=>openEdit(x.dataset.editBank)));
      table.querySelectorAll('[data-del-bank]').forEach(x=>x.addEventListener('click',()=>del(x.dataset.delBank)));
    }
    function openAdd(){
      openModal({ title:'Add Bank Account', fields: fields(),
        onSubmit:(data)=>{ Storage.addItem(Storage.getActive(),'banking',data); render(); refreshDashboard(); toast('Bank account added','success'); }
      });
    }
    function openEdit(id){
      const p = Storage.getActive(); const it = p.banking.find(x=>x.id===id); if(!it) return;
      openModal({ title:'Edit Bank Account', fields: fields(it),
        onSubmit:(data)=>{ Storage.updateItem(p,'banking',id,data); render(); refreshDashboard(); toast('Updated','success'); }
      });
    }
    function del(id){
      if(!confirm('Delete this bank account?')) return;
      Storage.removeItem(Storage.getActive(),'banking',id); render(); refreshDashboard(); toast('Deleted');
    }
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    return { render, openAdd };
  })();

  /* ---------- Dashboard ---------- */
  function refreshDashboard(){
    const p = Storage.getActive();
    if(!p) return;

    const monthlyIncome = Calc.monthlyIncome(p);
    const monthlyExp = Calc.monthlyExpenses(p);
    const savings = Calc.monthlySavings(p);
    const sr = Calc.savingsRate(p);
    const totalAssets = Calc.totalAssets(p);
    const totalInvest = Calc.investmentsTotal(p);
    const totalLiab = Calc.totalLiabilities(p);
    const emi = Calc.monthlyEMI(p);
    const nw = Calc.netWorth(p);
    const efc = Calc.emergencyFundCoverage(p);

    document.getElementById('topbar-networth').textContent = 'Net worth: ' + Calc.fmt(nw);

    const kpiGrid = document.getElementById('kpi-grid');
    const kpis = [
      ['Total Assets', Calc.fmt(totalAssets + totalInvest + Calc.bankingBalance(p)), ''],
      ['Total Liabilities', Calc.fmt(totalLiab), 'kpi-red'],
      ['Net Worth', Calc.fmt(nw), nw>=0?'kpi-green':'kpi-red'],
      ['Monthly Income', Calc.fmt(monthlyIncome), 'kpi-green'],
      ['Monthly Expenses', Calc.fmt(monthlyExp), 'kpi-red'],
      ['Monthly Savings', Calc.fmt(savings), savings>=0?'kpi-green':'kpi-red'],
      ['Savings Rate', sr===null?'—':sr.toFixed(1)+'%', sr===null?'':(sr>=20?'kpi-green':'kpi-amber')],
      ['Total Investments', Calc.fmt(totalInvest), 'kpi-green'],
      ['Outstanding Loans', Calc.fmt(totalLiab), 'kpi-red'],
      ['Monthly EMI', Calc.fmt(emi), 'kpi-amber'],
      ['Emergency Fund Coverage', efc===null?'—':efc.toFixed(1)+' months', 'kpi-amber']
    ];
    kpiGrid.innerHTML = kpis.map(([l,v,c])=>`
      <div class="kpi ${c}"><div class="kpi-label">${l}</div><div class="kpi-value">${v}</div></div>`).join('');

    renderCharts(p);
  }

  function renderCharts(p){
    const monthNames = [];
    // Income vs expenses (single bar pair - current month) — enhance with category split
    destroy('incomeExpense');
    const iCtx = document.getElementById('chart-income-expense');
    charts.incomeExpense = new Chart(iCtx, {
      type:'bar',
      data:{
        labels:['Monthly','Annual'],
        datasets:[
          { label:'Income', data:[Calc.monthlyIncome(p), Calc.totalAnnualIncome(p)], backgroundColor:'#10b981' },
          { label:'Expenses', data:[Calc.monthlyExpenses(p), Calc.annualExpenses(p)], backgroundColor:'#ef4444' }
        ]
      },
      options: chartOpts()
    });

    destroy('assetsLiab');
    charts.assetsLiab = new Chart(document.getElementById('chart-assets-liabilities'), {
      type:'doughnut',
      data:{
        labels:['Assets','Investments','Bank Balance','Liabilities'],
        datasets:[{
          data:[
            Calc.totalAssets(p),
            Calc.investmentsTotal(p),
            Calc.bankingBalance(p),
            Calc.totalLiabilities(p)
          ],
          backgroundColor:['#3b82f6','#10b981','#8b5cf6','#ef4444'],
          borderColor:'#131c31', borderWidth:2
        }]
      },
      options: doughnutOpts()
    });

    destroy('investments');
    const byType = {};
    p.investments.forEach(i=>{
      const t = i.type || 'Other';
      byType[t] = (byType[t]||0) + Calc.zeroIfNull(i.currentValue);
    });
    const iTypes = Object.keys(byType);
    charts.investments = new Chart(document.getElementById('chart-investments'), {
      type:'pie',
      data:{
        labels: iTypes.length ? iTypes : ['No investments'],
        datasets:[{
          data: iTypes.length ? Object.values(byType) : [1],
          backgroundColor:['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#22d3ee','#a3e635','#f472b6','#c084fc','#facc15','#4ade80'],
          borderColor:'#131c31', borderWidth:2
        }]
      },
      options: doughnutOpts()
    });

    destroy('expenses');
    const byCat = {};
    p.expenses.forEach(e=>{
      const c = e.category || 'Other';
      byCat[c] = (byCat[c]||0) + Calc.zeroIfNull(e.amount);
    });
    const cats = Object.keys(byCat);
    charts.expenses = new Chart(document.getElementById('chart-expenses'), {
      type:'bar',
      data:{
        labels: cats.length ? cats : ['No expenses'],
        datasets:[{
          label:'Expense',
          data: cats.length ? Object.values(byCat) : [0],
          backgroundColor:'#f59e0b'
        }]
      },
      options: chartOpts()
    });

    destroy('networth');
    // Synthetic 6-point net-worth trend based on current composition
    const base = Calc.netWorth(p);
    const nw = [base*0.6, base*0.7, base*0.78, base*0.86, base*0.94, base];
    charts.networth = new Chart(document.getElementById('chart-networth'), {
      type:'line',
      data:{
        labels:['6m ago','5m ago','4m ago','3m ago','2m ago','Now'],
        datasets:[{
          label:'Net Worth',
          data: nw,
          borderColor:'#3b82f6',
          backgroundColor:'rgba(59,130,246,.15)',
          fill:true, tension:.35, pointRadius:4, pointBackgroundColor:'#3b82f6'
        }]
      },
      options: chartOpts(true)
    });
  }

  function destroy(key){
    if(charts[key]){ charts[key].destroy(); charts[key] = null; }
  }
  function chartOpts(isLine){
    return {
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{ labels:{ color:'#8b98b8' } },
        tooltip:{ backgroundColor:'#0b1424', borderColor:'#2a3a5f', borderWidth:1, titleColor:'#eef2fb', bodyColor:'#eef2fb' }
      },
      scales: isLine ? {
        x:{ ticks:{ color:'#8b98b8' }, grid:{ color:'#1f2b47' } },
        y:{ ticks:{ color:'#8b98b8' }, grid:{ color:'#1f2b47' } }
      } : {
        x:{ ticks:{ color:'#8b98b8' }, grid:{ color:'#1f2b47' } },
        y:{ ticks:{ color:'#8b98b8' }, grid:{ color:'#1f2b47' } }
      }
    };
  }
  function doughnutOpts(){
    return {
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{ position:'bottom', labels:{ color:'#8b98b8', padding:12 } },
        tooltip:{ backgroundColor:'#0b1424', borderColor:'#2a3a5f', borderWidth:1, titleColor:'#eef2fb', bodyColor:'#eef2fb' }
      }
    };
  }

  /* ---------- Global refresh ---------- */
  function refreshAll(){
    Profiles.renderSelector();
    const p = Storage.getActive();
    if(!p){ showOnboarding(); return; }
    Family.render();
    Income.render();
    Expenses.render();
    Assets.render();
    Investments.render();
    Loans.render();
    Insurance.render();
    Banking.render();
    Retirement.fillInputs();
    Retirement.render();
    FinancialScore.render();
    refreshDashboard();
    showApp();
  }

  /* ---------- views / routing ---------- */
  const VIEW_TITLES = {
    dashboard:'Dashboard', family:'Family', income:'Income', expenses:'Expenses',
    assets:'Assets', investments:'Investments', loans:'Loans', insurance:'Insurance',
    banking:'Banking', retirement:'Retirement', score:'Health Score', report:'Report', settings:'Settings'
  };

  function switchView(name){
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    const target = document.getElementById('view-' + name);
    if(target) target.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(n=>n.classList.toggle('active', n.dataset.view === name));
    document.getElementById('view-title').textContent = VIEW_TITLES[name] || 'Dashboard';
    if(name === 'retirement') Retirement.render();
    if(name === 'score') FinancialScore.render();
    if(name === 'dashboard') refreshDashboard();
    // close mobile sidebar
    document.getElementById('sidebar').classList.remove('mobile-open');
  }

  function showOnboarding(){
    document.getElementById('onboarding').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  }
  function showApp(){
    document.getElementById('onboarding').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
  }

  /* ---------- onboarding ---------- */
  function bindOnboarding(){
    document.getElementById('onboarding-form').addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = document.getElementById('ob-name').value.trim();
      if(!name){ toast('Name is required','error'); return; }
      Storage.addProfile({
        name,
        age: document.getElementById('ob-age').value,
        occupation: document.getElementById('ob-occupation').value,
        email: document.getElementById('ob-email').value
      });
      refreshAll();
      toast('Welcome to WealthLens, ' + name + '!', 'success');
    });
  }

  /* ---------- quick add ---------- */
  function bindQuickAdd(){
    const modal = document.getElementById('quick-add-modal');
    document.getElementById('quick-add-btn').addEventListener('click', ()=>{
      openModal({
        title:'Quick Add',
        fields:[
          {name:'type', label:'What to add?', type:'select', value:'income', options:['income','expense','asset','investment','loan','insurance','family']}
        ],
        onSubmit: (data)=>{
          switch(data.type){
            case 'income': Income.openAdd(); break;
            case 'expense': Expenses.openAdd(); break;
            case 'asset': Assets.openAdd(); break;
            case 'investment': Investments.openAdd(); break;
            case 'loan': Loans.openAdd(); break;
            case 'insurance': Insurance.openAdd(); break;
            case 'family': Family.openAdd(); break;
          }
        }
      });
    });
  }

  /* ---------- data add buttons ---------- */
  function bindDataButtons(){
    document.querySelectorAll('[data-add]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const k = btn.dataset.add;
        if(k==='family') Family.openAdd();
        else if(k==='income') Income.openAdd();
        else if(k==='expense') Expenses.openAdd();
        else if(k==='asset') Assets.openAdd();
        else if(k==='investment') Investments.openAdd();
        else if(k==='loan') Loans.openAdd();
        else if(k==='insurance') Insurance.openAdd();
        else if(k==='bank') Banking.openAdd();
      });
    });
  }

  /* ---------- settings ---------- */
  function bindSettings(){
    document.getElementById('export-json-btn').addEventListener('click', ()=>{
      const blob = new Blob([Storage.exportJSON()], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wealthlens-backup-' + new Date().toISOString().slice(0,10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
      toast('Backup exported','success');
    });

    document.getElementById('import-json-input').addEventListener('change', (e)=>{
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try{
          Storage.importJSON(reader.result);
          refreshAll();
          toast('Backup imported successfully','success');
        }catch(err){
          toast('Import failed: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    document.getElementById('reset-all-btn').addEventListener('click', ()=>{
      if(!confirm('Reset ALL data (all profiles and everything)? This cannot be undone.')) return;
      if(!confirm('Are you absolutely sure? This will delete every profile and all financial records.')) return;
      Storage.resetAll();
      refreshAll();
      showOnboarding();
      toast('All data reset');
    });
  }

  /* ---------- sidebar ---------- */
  function bindSidebar(){
    document.getElementById('sidebar-collapse').addEventListener('click', ()=>{
      const sb = document.getElementById('sidebar');
      sb.classList.toggle('collapsed');
      document.getElementById('sidebar-collapse').textContent = sb.classList.contains('collapsed') ? '»' : '«';
    });
    document.getElementById('menu-toggle').addEventListener('click', ()=>{
      document.getElementById('sidebar').classList.toggle('mobile-open');
    });
    document.querySelectorAll('.nav-link').forEach(link=>{
      link.addEventListener('click', (e)=>{
        e.preventDefault();
        switchView(link.dataset.view);
      });
    });
  }

  /* ---------- save indicator ---------- */
  function bindSaveIndicator(){
    Storage.onSave(()=>{
      const el = document.getElementById('save-indicator');
      if(!el) return;
      el.textContent = '● Saving…';
      el.style.color = 'var(--amber)';
      clearTimeout(el._t);
      el._t = setTimeout(()=>{
        el.textContent = '● Saved';
        el.style.color = 'var(--green-2)';
      }, 350);
    });
  }

  /* ---------- init ---------- */
  function init(){
    Storage.load();
    bindSaveIndicator();
    bindSidebar();
    bindOnboarding();
    bindDataButtons();
    bindQuickAdd();
    bindSettings();
    Profiles.bind();
    Retirement.bind();
    Report.bind();

    if(Storage.get().profiles.length === 0){
      showOnboarding();
    }else{
      // restore last selected profile
      if(!Storage.get().activeProfileId && Storage.get().profiles[0]){
        Storage.setActive(Storage.get().profiles[0].id);
      }
      refreshAll();
    }

    window.addEventListener('resize', ()=>{
      // charts auto-resize
    });
  }

  return { init, refreshAll, refreshDashboard, openModal, toast, switchView };
})();

document.addEventListener('DOMContentLoaded', () => App.init());/* WealthLens – app.js
   Main controller: routing, modal system, quick-add, banking module,
   dashboard charts, event wiring, save indicator, toasts. */
'use strict';




