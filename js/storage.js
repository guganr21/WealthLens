/* WealthLens – storage.js
   Central LocalStorage persistence layer */
'use strict';

const WL_KEY = 'wealthlens_v1';

const Storage = (() => {

  let state = null;
  const listeners = new Set();

  const DEFAULT_STATE = {
    profiles: [],
    activeProfileId: null,
    version: 1
  };

  function blankProfile(name){
    return {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
      name: name || 'Myself',
      age: '',
      occupation: '',
      email: '',
      createdAt: new Date().toISOString(),
      family: [],
      income: [],
      expenses: [],
      assets: [],
      investments: [],
      loans: [],
      insurance: [],
      banking: [],
      retirement: {
        currentAge: '',
        retirementAge: '',
        savings: '',
        monthlyExpenses: '',
        inflation: 6,
        return: 10,
        lifeExpectancy: 85
      }
    };
  }

  function load(){
    try{
      const raw = localStorage.getItem(WL_KEY);
      if(!raw){ state = structuredClone(DEFAULT_STATE); return state; }
      const parsed = JSON.parse(raw);
      state = Object.assign(structuredClone(DEFAULT_STATE), parsed);
      if(!Array.isArray(state.profiles)) state.profiles = [];
      // ensure each profile has all fields
      state.profiles.forEach(p => {
        ['family','income','expenses','assets','investments','loans','insurance','banking'].forEach(k=>{
          if(!Array.isArray(p[k])) p[k] = [];
        });
        if(!p.retirement) p.retirement = { currentAge:'',retirementAge:'',savings:'',monthlyExpenses:'',inflation:6,return:10,lifeExpectancy:85 };
      });
      return state;
    }catch(e){
      console.error('WealthLens: failed to load storage', e);
      state = structuredClone(DEFAULT_STATE);
      return state;
    }
  }

  function save(){
    try{
      localStorage.setItem(WL_KEY, JSON.stringify(state));
      listeners.forEach(fn => { try{fn();}catch(e){console.error(e);} });
      return true;
    }catch(e){
      console.error('WealthLens: failed to save', e);
      return false;
    }
  }

  function get(){ if(!state) load(); return state; }

  function setActive(id){
    state.activeProfileId = id;
    save();
  }

  function getActive(){
    if(!state) load();
    return state.profiles.find(p => p.id === state.activeProfileId) || null;
  }

  function addProfile(data){
    const p = blankProfile(data.name);
    Object.assign(p, data);
    state.profiles.push(p);
    state.activeProfileId = p.id;
    save();
    return p;
  }

  function updateProfile(id, patch){
    const p = state.profiles.find(x=>x.id===id);
    if(!p) return null;
    Object.assign(p, patch);
    save();
    return p;
  }

  function deleteProfile(id){
    state.profiles = state.profiles.filter(p=>p.id!==id);
    if(state.activeProfileId === id){
      state.activeProfileId = state.profiles[0] ? state.profiles[0].id : null;
    }
    save();
  }

  function onSave(fn){ listeners.add(fn); }
  function offSave(fn){ listeners.delete(fn); }

  function exportJSON(){
    return JSON.stringify(state, null, 2);
  }

  function importJSON(text){
    const parsed = JSON.parse(text);
    if(!parsed || !Array.isArray(parsed.profiles)) throw new Error('Invalid WealthLens backup file.');
    state = parsed;
    save();
  }

  function resetAll(){
    state = structuredClone(DEFAULT_STATE);
    save();
  }

  // Generic collection helpers (family/income/…)
  function addItem(profile, key, item){
    item.id = item.id || 'i_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
    profile[key].push(item);
    save();
    return item;
  }
  function updateItem(profile, key, id, patch){
    const it = profile[key].find(x=>x.id===id);
    if(!it) return null;
    Object.assign(it, patch);
    save();
    return it;
  }
  function removeItem(profile, key, id){
    profile[key] = profile[key].filter(x=>x.id!==id);
    save();
  }

  return {
    load, save, get, getActive, setActive,
    addProfile, updateProfile, deleteProfile,
    onSave, offSave,
    exportJSON, importJSON, resetAll,
    addItem, updateItem, removeItem,
    blankProfile
  };
})();
