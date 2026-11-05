/* WealthLens – assets.js */
'use strict';

const Assets = (() => {
  const CATEGORIES = ['liquid','investment','household'];
  const CAT_LABEL = { liquid:'Liquid', investment:'Investment', household:'Household / Personal Use' };

  function fields(item){
    item = item || {};
    return [
      {name:'name', label:'Asset Name * (free text)', type:'text', required:true, value:item.name||'', placeholder:'e.g. iPhone, Laptop, Gold, Land'},
      {name:'category', label:'Asset Category', type:'select', value:item.category||'household', options:CATEGORIES, labels:CAT_LABEL},
      {name:'purchasePrice', label:'Purchase Price (₹) — optional', type:'number', value:item.purchasePrice||''},
      {name:'currentValue', label:'Current Estimated Value (₹)', type:'number', value:item.currentValue||''},
      {name:'purchaseDate', label:'Purchase Date — optional', type:'date', value:item.purchaseDate||''},
      {name:'notes', label:'Notes — optional', type:'text', value:item.notes||''}
    ];
  }

  function render(){
    const p = Storage.getActive(); if(!p) return;
    const table = document.getElementById('table-assets');
    const empty = document.getElementById('empty-assets');
    const summary = document.getElementById('asset-summary');
    const list = p.assets;

    const total = Calc.totalAssets(p);
    const liquid = Calc.liquidAssets(p);
    summary.innerHTML = `
      <div class="summary-tile"><div class="l">Total Assets</div><div class="v pos">${Calc.fmt(total)}</div></div>
      <div class="summary-tile"><div class="l">Liquid Assets</div><div class="v">${Calc.fmt(liquid)}</div></div>
      <div class="summary-tile"><div class="l">Items</div><div class="v">${list.length}</div></div>`;

    if(list.length===0){ table.innerHTML=''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    table.innerHTML = `
      <thead><tr><th>Asset</th><th>Category</th><th>Purchase Price</th><th>Current Value</th><th>Purchase Date</th><th>Notes</th><th style="text-align:right">Actions</th></tr></thead>
      <tbody>${list.map(i=>`
        <tr>
          <td>${esc(i.name)}</td>
          <td><span class="tag violet">${esc(CAT_LABEL[i.category]||'—')}</span></td>
          <td>${Calc.fmtFull(i.purchasePrice === '' ? null : Calc.zeroIfNull(i.purchasePrice))}</td>
          <td>${Calc.fmtFull(Calc.zeroIfNull(i.currentValue))}</td>
          <td>${esc(i.purchaseDate||'—')}</td>
          <td>${esc(i.notes||'—')}</td>
          <td><div class="cell-actions">
            <button class="mini-btn" data-edit-asset="${i.id}">Edit</button>
            <button class="mini-btn danger" data-del-asset="${i.id}">Delete</button>
          </div></td>
        </tr>`).join('')}</tbody>`;
    table.querySelectorAll('[data-edit-asset]').forEach(b=>b.addEventListener('click',()=>openEdit(b.dataset.editAsset)));
    table.querySelectorAll('[data-del-asset]').forEach(b=>b.addEventListener('click',()=>del(b.dataset.delAsset)));
  }

  function openAdd(){
    App.openModal({ title:'Add Asset', fields: fields(),
      onSubmit:(data)=>{ Storage.addItem(Storage.getActive(),'assets',data); render(); App.refreshDashboard(); App.toast('Asset added','success'); }
    });
  }
  function openEdit(id){
    const p = Storage.getActive(); const it = p.assets.find(x=>x.id===id); if(!it) return;
    App.openModal({ title:'Edit Asset', fields: fields(it),
      onSubmit:(data)=>{ Storage.updateItem(p,'assets',id,data); render(); App.refreshDashboard(); App.toast('Updated','success'); }
    });
  }
  function del(id){
    if(!confirm('Delete this asset?')) return;
    Storage.removeItem(Storage.getActive(),'assets',id); render(); App.refreshDashboard(); App.toast('Deleted');
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return { render, openAdd };
})();
