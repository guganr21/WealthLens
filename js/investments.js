/* WealthLens – investments.js */
'use strict';

const Investments = (() => {
  const TYPES = ['Fixed Deposit','Recurring Deposit','Mutual Fund','Stocks','ETF','PPF','EPF','NPS','Gold','Savings Account','Custom'];

  function fields(item){
    item = item || {};
    return [
      {name:'name', label:'Investment Name *', type:'text', required:true, value:item.name||''},
      {name:'type', label:'Type', type:'select', value:item.type||'Mutual Fund', options:TYPES},
      {name:'investedAmount', label:'Invested Amount (₹)', type:'number', value:item.investedAmount||''},
      {name:'currentValue', label:'Current Value (₹) *', type:'number', required:true, value:item.currentValue||''},
      {name:'notes', label:'Notes', type:'text', value:item.notes||''}
    ];
  }

  function render(){
    const p = Storage.getActive(); if(!p) return;
    const table = document.getElementById('table-investments');
    const empty = document.getElementById('empty-investments');
    const summary = document.getElementById('investment-summary');
    const list = p.investments;
    const total = Calc.investmentsTotal(p);
    const totalInvested = list.reduce((s,i)=>s+Calc.zeroIfNull(i.investedAmount),0);
    const gain = total - totalInvested;
    summary.innerHTML = `
      <div class="summary-tile"><div class="l">Current Value</div><div class="v pos">${Calc.fmt(total)}</div></div>
      <div class="summary-tile"><div class="l">Total Invested</div><div class="v">${Calc.fmt(totalInvested)}</div></div>
      <div class="summary-tile"><div class="l">Gain / Loss</div><div class="v ${gain>=0?'pos':'neg'}">${Calc.fmt(gain)}</div></div>`;

    if(list.length===0){ table.innerHTML=''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    table.innerHTML = `
      <thead><tr><th>Name</th><th>Type</th><th>Invested</th><th>Current</th><th>Notes</th><th style="text-align:right">Actions</th></tr></thead>
      <tbody>${list.map(i=>`
        <tr>
          <td>${esc(i.name)}</td>
          <td><span class="tag">${esc(i.type||'—')}</span></td>
          <td>${Calc.fmtFull(Calc.zeroIfNull(i.investedAmount))}</td>
          <td>${Calc.fmtFull(Calc.zeroIfNull(i.currentValue))}</td>
          <td>${esc(i.notes||'—')}</td>
          <td><div class="cell-actions">
            <button class="mini-btn" data-edit-inv="${i.id}">Edit</button>
            <button class="mini-btn danger" data-del-inv="${i.id}">Delete</button>
          </div></td>
        </tr>`).join('')}</tbody>`;
    table.querySelectorAll('[data-edit-inv]').forEach(b=>b.addEventListener('click',()=>openEdit(b.dataset.editInv)));
    table.querySelectorAll('[data-del-inv]').forEach(b=>b.addEventListener('click',()=>del(b.dataset.delInv)));
  }

  function openAdd(){
    App.openModal({ title:'Add Investment', fields: fields(),
      onSubmit:(data)=>{ Storage.addItem(Storage.getActive(),'investments',data); render(); App.refreshDashboard(); App.toast('Investment added','success'); }
    });
  }
  function openEdit(id){
    const p = Storage.getActive(); const it = p.investments.find(x=>x.id===id); if(!it) return;
    App.openModal({ title:'Edit Investment', fields: fields(it),
      onSubmit:(data)=>{ Storage.updateItem(p,'investments',id,data); render(); App.refreshDashboard(); App.toast('Updated','success'); }
    });
  }
  function del(id){
    if(!confirm('Delete this investment?')) return;
    Storage.removeItem(Storage.getActive(),'investments',id); render(); App.refreshDashboard(); App.toast('Deleted');
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return { render, openAdd };
})();
