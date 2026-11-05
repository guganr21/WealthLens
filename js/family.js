/* WealthLens – family.js */
'use strict';

const Family = (() => {

  function fields(member){
    member = member || {};
    return [
      {name:'name', label:'Name *', type:'text', required:true, value:member.name||''},
      {name:'relationship', label:'Relationship', type:'select', value:member.relationship||'', options:['Spouse','Father','Mother','Son','Daughter','Brother','Sister','Grandparent','Other']},
      {name:'age', label:'Age', type:'number', value:member.age||''},
      {name:'employment', label:'Employment Status', type:'select', value:member.employment||'', options:['Employed','Self-employed','Student','Retired','Unemployed','Homemaker','Other']},
      {name:'monthlyIncome', label:'Monthly Income (₹)', type:'number', value:member.monthlyIncome||''},
      {name:'dependency', label:'Financial Dependency', type:'select', value:member.dependency||'', options:['Independent','Dependent','Partially Dependent']}
    ];
  }

  function render(){
    const p = Storage.getActive();
    const table = document.getElementById('table-family');
    const empty = document.getElementById('empty-family');
    if(!p) return;
    const list = p.family;
    if(list.length === 0){
      table.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    table.innerHTML = `
      <thead><tr>
        <th>Name</th><th>Relationship</th><th>Age</th><th>Employment</th>
        <th>Monthly Income</th><th>Dependency</th><th style="text-align:right">Actions</th>
      </tr></thead>
      <tbody>
        ${list.map(m=>`
          <tr>
            <td>${esc(m.name)}</td>
            <td><span class="tag">${esc(m.relationship||'—')}</span></td>
            <td>${esc(m.age||'—')}</td>
            <td>${esc(m.employment||'—')}</td>
            <td>${Calc.fmtFull(Calc.zeroIfNull(m.monthlyIncome))}</td>
            <td>${esc(m.dependency||'—')}</td>
            <td><div class="cell-actions">
              <button class="mini-btn" data-edit-family="${m.id}">Edit</button>
              <button class="mini-btn danger" data-del-family="${m.id}">Delete</button>
            </div></td>
          </tr>`).join('')}
      </tbody>`;
    table.querySelectorAll('[data-edit-family]').forEach(b=>b.addEventListener('click',()=>openEdit(b.dataset.editFamily)));
    table.querySelectorAll('[data-del-family]').forEach(b=>b.addEventListener('click',()=>del(b.dataset.delFamily)));
  }

  function openAdd(){
    App.openModal({
      title:'Add Family Member',
      fields: fields(),
      onSubmit: (data) => {
        const p = Storage.getActive();
        Storage.addItem(p,'family', data);
        render();
        App.toast('Family member added','success');
        App.refreshDashboard();
      }
    });
  }
  function openEdit(id){
    const p = Storage.getActive();
    const m = p.family.find(x=>x.id===id);
    if(!m) return;
    App.openModal({
      title:'Edit Family Member',
      fields: fields(m),
      onSubmit:(data)=>{ Storage.updateItem(p,'family',id,data); render(); App.toast('Updated','success'); App.refreshDashboard(); }
    });
  }
  function del(id){
    if(!confirm('Delete this family member?')) return;
    const p = Storage.getActive();
    Storage.removeItem(p,'family',id);
    render();
    App.toast('Deleted');
    App.refreshDashboard();
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  return { render, openAdd };
})();
