/* WealthLens – profiles.js */
'use strict';

const Profiles = (() => {

  function renderSelector(){
    const sel = document.getElementById('profile-select');
    if(!sel) return;
    const st = Storage.get();
    sel.innerHTML = '';
    if(st.profiles.length === 0){
      sel.innerHTML = '<option>No profiles</option>';
      return;
    }
    st.profiles.forEach(p => {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.name;
      if(p.id === st.activeProfileId) o.selected = true;
      sel.appendChild(o);
    });
  }

  function bind(){
    document.getElementById('profile-select').addEventListener('change', (e) => {
      Storage.setActive(e.target.value);
      App.refreshAll();
    });

    document.getElementById('add-profile-btn').addEventListener('click', () => {
      App.openModal({
        title: 'Add Person',
        fields: [
          {name:'name', label:'Name *', type:'text', required:true, placeholder:'e.g. Father'},
          {name:'age', label:'Age', type:'number'},
          {name:'occupation', label:'Occupation', type:'text'},
          {name:'email', label:'Email', type:'email'}
        ],
        onSubmit: (data) => {
          Storage.addProfile({ name:data.name, age:data.age, occupation:data.occupation, email:data.email });
          App.refreshAll();
          App.toast('Profile created', 'success');
        }
      });
    });

    document.getElementById('edit-profile-btn').addEventListener('click', () => {
      const p = Storage.getActive();
      if(!p) return;
      App.openModal({
        title: 'Edit Profile',
        fields: [
          {name:'name', label:'Name *', type:'text', required:true, value:p.name},
          {name:'age', label:'Age', type:'number', value:p.age},
          {name:'occupation', label:'Occupation', type:'text', value:p.occupation},
          {name:'email', label:'Email', type:'email', value:p.email}
        ],
        onSubmit: (data) => {
          Storage.updateProfile(p.id, data);
          App.refreshAll();
          App.toast('Profile updated', 'success');
        }
      });
    });

    document.getElementById('delete-profile-btn').addEventListener('click', () => {
      const p = Storage.getActive();
      if(!p) return;
      if(Storage.get().profiles.length <= 1){
        App.toast('Cannot delete the only profile', 'error');
        return;
      }
      if(!confirm(`Delete profile "${p.name}" and ALL its data? This cannot be undone.`)) return;
      Storage.deleteProfile(p.id);
      App.refreshAll();
      App.toast('Profile deleted');
    });
  }

  return { renderSelector, bind };
})();
