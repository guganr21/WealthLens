/* WealthLens – loans.js */
'use strict';

const Loans = (() => {
  const TYPES = ['Home Loan','Personal Loan','Education Loan','Vehicle Loan','Credit Card','Other'];

  function fields(item){
    item = item || {};
    return [
      {name:'name', label:'Loan Name *', type:'text', required:true, value:item.name||''},
      {name:'type', label:'Type', type:'select', value:item.type||'Personal Loan', options:TYPES},
      {name:'originalAmount', label:'Original Amount (₹)', type:'number', value:item.originalAmount||''},
      {name:'outstanding', label:'Outstanding Balance (₹) *', type:'number', required:true, value:item.outstanding||''},
      {name:'monthlyEMI', label:'Monthly EMI (₹)', type:'number', value:item.monthlyEMI||''},
      {name:'interestRate', label:'Interest Rate (%)', type:'number', value:item.interestRate||''},
      {name:'remainingTenure', label:'Remaining Tenure (months)', type:'number', value:item.remainingTenure||''}
    ];
  }

  function render(){
    const p = Storage.getActive(); if(!p) return;
    const table = document.getElementById('table-loans');
    const empty = document.getElementById('empty-loans');
    const summary = document.getElementById('loan-summary');
    const list = p.loans;
    const total = Calc.totalLiabilities(p);
    const emi = Calc.monthlyEMI(p);
    summary.innerHTML = `
      <div class="summary-tile"><div class="l">Total Liabilities</div><div class="v neg">${Calc.fmt(total)}</div></div>
      <div class="summary-tile"><div class="l">Monthly EMI</div><div class="v neg">${Calc.fmt(emi)}</div></div>
      <div class="summary-tile"><div class="l">Loans</div><div class="v">${list.length}</div></div>`;

    if(list.length===0){ table.innerHTML=''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    table.innerHTML = `
      <thead><tr><th>Name</th><th>Type</th><th>Original</th><th>Outstanding</th><th>EMI</th><th>Rate</th><th>Tenure (mo)</th><th style="text-align:right">Actions</th></tr></thead>
      <tbody>${list.map(i=>`
        <tr>
          <td>${esc(i.name)}</td>
          <td><span class="tag amber">${esc(i.type||'—')}</span></td>
          <td>${Calc.fmtFull(Calc.zeroIfNull(i.originalAmount))}</td>
          <td>${Calc.fmtFull(Calc.zeroIfNull(i.outstanding))}</td>
          <td>${Calc.fmtFull(Calc.zeroIfNull(i.monthlyEMI))}</td>
          <td>${i.interestRate?esc(i.interestRate)+'%':'—'}</td>
          <td>${esc(i.remainingTenure||'—')}</td>
          <td><div class="cell-actions">
            <button class="mini-btn" data-edit-loan="${i.id}">Edit</button>
            <button class="mini-btn danger" data-del-loan="${i.id}">Delete</button>
          </div></td>
        </tr>`).join('')}</tbody>`;
    table.querySelectorAll('[data-edit-loan]').forEach(b=>b.addEventListener('click',()=>openEdit(b.dataset.editLoan)));
    table.querySelectorAll('[data-del-loan]').forEach(b=>b.addEventListener('click',()=>del(b.dataset.delLoan)));
  }

  function openAdd(){
    App.openModal({ title:'Add Loan', fields: fields(),
      onSubmit:(data)=>{ Storage.addItem(Storage.getActive(),'loans',data); render(); App.refreshDashboard(); App.toast('Loan added','success'); }
    });
  }
  function openEdit(id){
    const p = Storage.getActive(); const it = p.loans.find(x=>x.id===id); if(!it) return;
    App.openModal({ title:'Edit Loan', fields: fields(it),
      onSubmit:(data)=>{ Storage.updateItem(p,'loans',id,data); render(); App.refreshDashboard(); App.toast('Updated','success'); }
    });
  }
  function del(id){
    if(!confirm('Delete this loan?')) return;
    Storage.removeItem(Storage.getActive(),'loans',id); render(); App.refreshDashboard(); App.toast('Deleted');
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return { render, openAdd };
})();
