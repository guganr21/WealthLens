/* WealthLens – insurance.js */
'use strict';

const Insurance = (() => {
  const TYPES = ['Life Insurance','Health Insurance','Term Insurance','Vehicle Insurance','Custom'];

  function fields(item){
    item = item || {};
    return [
      {name:'name', label:'Policy Name *', type:'text', required:true, value:item.name||''},
      {name:'type', label:'Insurance Type', type:'select', value:item.type||'Life Insurance', options:TYPES},
      {name:'coverageAmount', label:'Coverage Amount (₹)', type:'number', value:item.coverageAmount||''},
      {name:'premiumAmount', label:'Premium Amount (₹)', type:'number', value:item.premiumAmount||''},
      {name:'premiumFrequency', label:'Premium Frequency', type:'select', value:item.premiumFrequency||'yearly', options:['monthly','quarterly','yearly','one-time']},
      {name:'renewalDate', label:'Renewal Date', type:'date', value:item.renewalDate||''},
      {name:'notes', label:'Notes', type:'text', value:item.notes||''}
    ];
  }

  function render(){
    const p = Storage.getActive(); if(!p) return;
    const table = document.getElementById('table-insurance');
    const empty = document.getElementById('empty-insurance');
    const summary = document.getElementById('insurance-summary');
    const list = p.insurance;
    const totalCoverage = list.reduce((s,i)=>s+Calc.zeroIfNull(i.coverageAmount),0);
    const annualPremium = list.reduce((s,i)=>{
      const pr = Calc.zeroIfNull(i.premiumAmount);
      const f = i.premiumFrequency||'yearly';
      return s + (f==='monthly'? pr*12 : f==='quarterly'? pr*4 : pr);
    },0);
    summary.innerHTML = `
      <div class="summary-tile"><div class="l">Total Coverage</div><div class="v pos">${Calc.fmt(totalCoverage)}</div></div>
      <div class="summary-tile"><div class="l">Annual Premium</div><div class="v neg">${Calc.fmt(annualPremium)}</div></div>
      <div class="summary-tile"><div class="l">Policies</div><div class="v">${list.length}</div></div>`;

    if(list.length===0){ table.innerHTML=''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    table.innerHTML = `
      <thead><tr><th>Policy</th><th>Type</th><th>Coverage</th><th>Premium</th><th>Frequency</th><th>Renewal</th><th style="text-align:right">Actions</th></tr></thead>
      <tbody>${list.map(i=>`
        <tr>
          <td>${esc(i.name)}</td>
          <td><span class="tag green">${esc(i.type||'—')}</span></td>
          <td>${Calc.fmtFull(Calc.zeroIfNull(i.coverageAmount))}</td>
          <td>${Calc.fmtFull(Calc.zeroIfNull(i.premiumAmount))}</td>
          <td>${esc(i.premiumFrequency||'yearly')}</td>
          <td>${esc(i.renewalDate||'—')}</td>
          <td><div class="cell-actions">
            <button class="mini-btn" data-edit-ins="${i.id}">Edit</button>
            <button class="mini-btn danger" data-del-ins="${i.id}">Delete</button>
          </div></td>
        </tr>`).join('')}</tbody>`;
    table.querySelectorAll('[data-edit-ins]').forEach(b=>b.addEventListener('click',()=>openEdit(b.dataset.editIns)));
    table.querySelectorAll('[data-del-ins]').forEach(b=>b.addEventListener('click',()=>del(b.dataset.delIns)));
  }

  function openAdd(){
    App.openModal({ title:'Add Insurance Policy', fields: fields(),
      onSubmit:(data)=>{ Storage.addItem(Storage.getActive(),'insurance',data); render(); App.refreshDashboard(); App.toast('Policy added','success'); }
    });
  }
  function openEdit(id){
    const p = Storage.getActive(); const it = p.insurance.find(x=>x.id===id); if(!it) return;
    App.openModal({ title:'Edit Insurance Policy', fields: fields(it),
      onSubmit:(data)=>{ Storage.updateItem(p,'insurance',id,data); render(); App.refreshDashboard(); App.toast('Updated','success'); }
    });
  }
  function del(id){
    if(!confirm('Delete this policy?')) return;
    Storage.removeItem(Storage.getActive(),'insurance',id); render(); App.refreshDashboard(); App.toast('Deleted');
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return { render, openAdd };
})();
