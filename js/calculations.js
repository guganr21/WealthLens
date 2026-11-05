/* WealthLens – calculations.js
   Pure financial calculation helpers. All functions are deterministic and
   distinguish missing (null / '') from confirmed zero. */
'use strict';

const Calc = (() => {

  const num = (v) => {
    if(v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const zeroIfNull = (v) => { const n = num(v); return n === null ? 0 : n; };

  const fmt = (n, symbol='₹') => {
    if(n === null || n === undefined || Number.isNaN(n)) return '—';
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    if(abs >= 1e7) return sign + symbol + (abs/1e7).toFixed(2) + ' Cr';
    if(abs >= 1e5) return sign + symbol + (abs/1e5).toFixed(2) + ' L';
    if(abs >= 1e3) return sign + symbol + (abs/1e3).toFixed(1) + 'K';
    return sign + symbol + abs.toFixed(0);
  };
  const fmtFull = (n, symbol='₹') => {
    if(n === null || n === undefined || Number.isNaN(n)) return '—';
    return symbol + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };
  const pct = (n) => (n===null||n===undefined||Number.isNaN(n))?'—':(n.toFixed(1)+'%');

  // ---- AGGREGATES ----
  function totalMonthlyIncome(profile){
    // salary,business,freelancing,rental,interest,custom
    return profile.income.reduce((s,i)=>s+zeroIfNull(i.amount),0);
  }
  function totalAnnualIncome(profile){
    return profile.income.reduce((s,i)=>{
      const a = zeroIfNull(i.amount);
      const freq = i.frequency || 'monthly';
      return s + (freq==='annual'? a : freq==='quarterly'? a*4 : freq==='yearly'? a : a*12);
    },0);
  }
  function monthlyIncome(profile){
    // normalized per month
    return profile.income.reduce((s,i)=>{
      const a = zeroIfNull(i.amount);
      const freq = i.frequency || 'monthly';
      return s + (freq==='annual'? a/12 : freq==='yearly'? a/12 : freq==='quarterly'? a/3 : freq==='weekly'? a*4.345 : a);
    },0);
  }

  function monthlyExpenses(profile){
    return profile.expenses.reduce((s,e)=>{
      const a = zeroIfNull(e.amount);
      const freq = e.frequency || 'monthly';
      return s + (freq==='annual'? a/12 : freq==='yearly'? a/12 : freq==='quarterly'? a/3 : freq==='weekly'? a*4.345 : a);
    },0);
  }
  function annualExpenses(profile){
    return profile.expenses.reduce((s,e)=>{
      const a = zeroIfNull(e.amount);
      const freq = e.frequency || 'monthly';
      return s + (freq==='annual' || freq==='yearly'? a : freq==='quarterly'? a*4 : freq==='weekly'? a*52 : a*12);
    },0);
  }

  function totalAssets(profile){
    return profile.assets.reduce((s,a)=>s+zeroIfNull(a.currentValue),0);
  }
  function liquidAssets(profile){
    return profile.assets.filter(a=>a.category==='liquid').reduce((s,a)=>s+zeroIfNull(a.currentValue),0);
  }
  function investmentsTotal(profile){
    return profile.investments.reduce((s,i)=>s+zeroIfNull(i.currentValue),0);
  }
  function totalInvestments(profile){
    return investmentsTotal(profile);
  }
  function totalLiabilities(profile){
    return profile.loans.reduce((s,l)=>s+zeroIfNull(l.outstanding),0);
  }
  function monthlyEMI(profile){
    return profile.loans.reduce((s,l)=>s+zeroIfNull(l.monthlyEMI),0);
  }

  function netWorth(profile){
    return totalAssets(profile) + investmentsTotal(profile) + bankingBalance(profile) - totalLiabilities(profile);
  }

  function bankingBalance(profile){
    return profile.banking.reduce((s,b)=>s+zeroIfNull(b.currentBalance),0);
  }
  function emergencyFund(profile){
    return profile.banking.reduce((s,b)=>s+zeroIfNull(b.emergencyFund),0);
  }
  function emergencyFundCoverage(profile){
    const ef = emergencyFund(profile);
    const exp = monthlyExpenses(profile);
    if(exp <= 0) return null; // cannot compute
    return ef / exp;
  }

  function monthlySavings(profile){
    return monthlyIncome(profile) - monthlyExpenses(profile);
  }
  function savingsRate(profile){
    const inc = monthlyIncome(profile);
    if(inc <= 0) return null;
    return (monthlySavings(profile)/inc)*100;
  }

  function debtToIncome(profile){
    const inc = monthlyIncome(profile);
    if(inc <= 0) return null;
    return (monthlyEMI(profile)/inc)*100;
  }

  // ---- RETIREMENT ----
  function retirementProjection(profile, retAgeOverride){
    const r = profile.retirement || {};
    const currentAge = num(r.currentAge);
    const retAge = num(retAgeOverride ?? r.retirementAge);
    const lifeExp = num(r.lifeExpectancy) || 85;
    const currentSavings = num(r.savings) || 0;
    const monthlyExp = num(r.monthlyExpenses);
    const inflation = num(r.inflation);
    const ret = num(r.return);

    const complete = currentAge !== null && retAge !== null && monthlyExp !== null && inflation !== null && ret !== null;
    if(!complete){
      return { complete:false, reason:'Required retirement inputs missing.' };
    }
    if(retAge <= currentAge) return { complete:false, reason:'Retirement age must be greater than current age.' };

    const yearsToRet = retAge - currentAge;
    const yearsInRet = Math.max(1, lifeExp - retAge);

    // Future monthly expenses at retirement (inflation-adjusted)
    const futureMonthlyExp = monthlyExp * Math.pow(1 + inflation/100, yearsToRet);
    const annualExpAtRet = futureMonthlyExp * 12;

    // Required corpus (present value at retirement of inflation-adjusted annuity)
    // Real return during retirement: ((1+r)/(1+i)) - 1
    const realReturn = ((1 + ret/100)/(1 + inflation/100)) - 1;
    let requiredCorpus;
    if(Math.abs(realReturn) < 1e-9){
      requiredCorpus = annualExpAtRet * yearsInRet;
    }else{
      // PV of growing annuity: annualExpAtRet * (1 - (1+g)^n/(1+r)^n) / (r-g) where here we use real return on real expense = real annual expense
      // Simpler: use real return on real annual expense (annualExpAtRet at ret in nominal; convert to real by dividing by inflation factor already done).
      requiredCorpus = annualExpAtRet * (1 - Math.pow(1+realReturn, -yearsInRet)) / realReturn;
    }
    if(!Number.isFinite(requiredCorpus) || requiredCorpus < 0) requiredCorpus = 0;

    // Projected retirement wealth
    const projectedWealth = currentSavings * Math.pow(1 + ret/100, yearsToRet);

    // Gap
    const gap = Math.max(0, requiredCorpus - projectedWealth);

    // Required monthly SIP to reach requiredCorpus with currentSavings growing
    // PMT such that FV = SIP * ((1+r_m)^n - 1)/r_m + currentSavings*(1+r_m)^n = requiredCorpus
    const rM = ret/100/12;
    const n = yearsToRet*12;
    let monthlySIP = 0;
    if(n > 0 && requiredCorpus > 0){
      const fvCurrent = currentSavings * Math.pow(1+rM, n);
      const remaining = Math.max(0, requiredCorpus - fvCurrent);
      if(rM === 0) monthlySIP = remaining / n;
      else monthlySIP = remaining * rM / (Math.pow(1+rM, n) - 1);
    }
    if(!Number.isFinite(monthlySIP) || monthlySIP < 0) monthlySIP = 0;

    const readiness = requiredCorpus > 0 ? Math.min(100, (projectedWealth/requiredCorpus)*100) : 0;

    return {
      complete:true,
      currentAge, retAge, lifeExp, yearsToRet, yearsInRet,
      futureMonthlyExp, requiredCorpus, projectedWealth, gap, monthlySIP,
      readiness,
      assumptions: {
        inflation, return: ret, currentSavings,
        realReturnDuringRetirement: realReturn
      }
    };
  }

  function retirementScenarios(profile){
    const ages = [55,58,60,62,65];
    return ages.map(a => ({ age:a, ...retirementProjection(profile, a) }));
  }

  return {
    num, zeroIfNull, fmt, fmtFull, pct,
    totalMonthlyIncome, totalAnnualIncome, monthlyIncome,
    monthlyExpenses, annualExpenses,
    totalAssets, liquidAssets, investmentsTotal, totalInvestments,
    totalLiabilities, monthlyEMI,
    netWorth, bankingBalance, emergencyFund, emergencyFundCoverage,
    monthlySavings, savingsRate, debtToIncome,
    retirementProjection, retirementScenarios
  };
})();
