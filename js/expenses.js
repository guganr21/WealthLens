/* WealthLens – expenses.js */
'use strict';

const Expenses = (() => {
  const CATEGORIES = ['Food','Rent','Electricity','Transportation','Education','Healthcare','Shopping','Entertainment','EMI','Custom'];

  function fields(item){
    item = item || {};
    return [
      {name:'name', label:'Expense Name *', type:'text', required:true, value:item.name||''},
      {name:'category', label:'Category', type:'select', value:item.category||'Food', options:CATEGORIES},
      {name:'amount', label:'Amount (₹) *', type:'number', required:true, value:item.amount||''},
      {name:'frequency', label:'Frequency', type:'select', value:item.frequency||'monthly', options:['monthly','quarterly','annual','weekly']},
      {name:'notes', label:'Notes', type:'text', value:item.notes||''}
    ];
  }

  function render(){
    const p = Storage.getActive(); if(!p) return;
    const table = document.getElementById('table-expenses');
    const empty = document.getElementById('empty-expenses');
    const summary = document.getElementById('expense-summary');
    const list = p.expenses;
    const monthly = Calc.monthlyExpenses(p);
    const annual = Calc.annualExpenses(p);
    summary.innerHTML = `
      <div class="summary-tile"><div class="l">Monthly Expenses</div><div class="v neg">${Calc.fmt(monthly)}</div></div>
      <div class="summary-tile"><div class="l">Annual Expenses</div><div class="v neg">${Calc.fmt(annual)}</div></div>
      <div class="summary-tile"><div class="l">Entries</div><div class="v">${list.length}</div></div>`;

    if(list.length===0){ table.innerHTML=''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    table.innerHTML = `
      <thead><tr><th>Name</th><th>Category</th><th>Amount</th><th>Frequency</th><th>Notes</th><th style="text-align:right">Actions</th></tr></thead>
      <tbody>${list.map(i=>`
        <tr>
          <td>${esc(i.name)}</td>
          <td><span class="tag amber">${esc(i.category||'—')}</span></td>
          <td>${Calc.fmtFull(Calc.zeroIfNull(i.amount))}</td>
          <td>${esc(i.frequency||'monthly')}</td>
          <td>${esc(i.notes||'—')}</td>
          <td><div class="cell-actions">
            <button class="mini-btn" data-edit-expense="${i.id}">Edit</button>
            <button class="mini-btn danger" data-del-expense="${i.id}">Delete</button>
          </div></td>
        </tr>`).join('')}</tbody>`;
    table.querySelectorAll('[data-edit-expense]').forEach(b=>b.addEventListener('click',()=>openEdit(b.dataset.editExpense)));
    table.querySelectorAll('[data-del-expense]').forEach(b=>b.addEventListener('click',()=>del(b.dataset.delExpense)));
  }

  function openAdd(){
    App.openModal({ title:'Add Expense', fields: fields(),
      onSubmit:(data)=>{ Storage.addItem(Storage.getActive(),'expenses',data); render(); App.refreshDashboard(); App.toast('Expense added','success'); }
    });
  }
  function openEdit(id){
    const p = Storage.getActive(); const it = p.expenses.find(x=>x.id===id); if(!it) return;
    App.openModal({ title:'Edit Expense', fields: fields(it),
      onSubmit:(data)=>{ Storage.updateItem(p,'expenses',id,data); render(); App.refreshDashboard(); App.toast('Updated','success'); }
    });
  }
  function del(id){
    if(!confirm('Delete this expense?')) return;
    Storage.removeItem(Storage.getActive(),'expenses',id); render(); App.refreshDashboard(); App.toast('Deleted');
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return { render, openAdd };
})();
