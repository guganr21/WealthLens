/* WealthLens – income.js */
'use strict';

const Income = (() => {

  const CATEGORIES = ['Salary','Business','Freelancing','Rental','Interest','Custom'];

  function fields(item){
    item = item || {};
    return [
      {name:'source', label:'Source / Name *', type:'text', required:true, value:item.source||''},
      {name:'category', label:'Category', type:'select', value:item.category||'Salary', options:CATEGORIES},
      {name:'amount', label:'Amount (₹) *', type:'number', required:true, value:item.amount||''},
      {name:'frequency', label:'Frequency', type:'select', value:item.frequency||'monthly', options:['monthly','quarterly','annual','weekly']},
      {name:'notes', label:'Notes', type:'text', value:item.notes||''}
    ];
  }

  function render(){
    const p = Storage.getActive();
    if(!p) return;
    const table = document.getElementById('table-income');
    const empty = document.getElementById('empty-income');
    const summary = document.getElementById('income-summary');
    const list = p.income;

    const monthly = Calc.monthlyIncome(p);
    const annual = Calc.totalAnnualIncome(p);
    summary.innerHTML = `
      <div class="summary-tile"><div class="l">Monthly Income</div><div class="v pos">${Calc.fmt(monthly)}</div></div>
      <div class="summary-tile"><div class="l">Annual Income</div><div class="v pos">${Calc.fmt(annual)}</div></div>
      <div class="summary-tile"><div class="l">Sources</div><div class="v">${list.length}</div></div>`;

    if(list.length===0){ table.innerHTML=''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    table.innerHTML = `
      <thead><tr><th>Source</th><th>Category</th><th>Amount</th><th>Frequency</th><th>Notes</th><th style="text-align:right">Actions</th></tr></thead>
      <tbody>${list.map(i=>`
        <tr>
          <td>${esc(i.source)}</td>
          <td><span class="tag green">${esc(i.category||'—')}</span></td>
          <td>${Calc.fmtFull(Calc.zeroIfNull(i.amount))}</td>
          <td>${esc(i.frequency||'monthly')}</td>
          <td>${esc(i.notes||'—')}</td>
          <td><div class="cell-actions">
            <button class="mini-btn" data-edit-income="${i.id}">Edit</button>
            <button class="mini-btn danger" data-del-income="${i.id}">Delete</button>
          </div></td>
        </tr>`).join('')}</tbody>`;
    table.querySelectorAll('[data-edit-income]').forEach(b=>b.addEventListener('click',()=>openEdit(b.dataset.editIncome)));
    table.querySelectorAll('[data-del-income]').forEach(b=>b.addEventListener('click',()=>del(b.dataset.delIncome)));
  }

  function openAdd(){
    App.openModal({
      title:'Add Income', fields: fields(),
      onSubmit:(data)=>{ Storage.addItem(Storage.getActive(),'income',data); render(); App.refreshDashboard(); App.toast('Income added','success'); }
    });
  }
  function openEdit(id){
    const p = Storage.getActive();
    const it = p.income.find(x=>x.id===id);
    if(!it) return;
    App.openModal({
      title:'Edit Income', fields: fields(it),
      onSubmit:(data)=>{ Storage.updateItem(p,'income',id,data); render(); App.refreshDashboard(); App.toast('Updated','success'); }
    });
  }
  function del(id){
    if(!confirm('Delete this income entry?')) return;
    Storage.removeItem(Storage.getActive(),'income',id);
    render(); App.refreshDashboard(); App.toast('Deleted');
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return { render, openAdd };
})();
