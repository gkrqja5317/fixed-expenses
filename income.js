(()=>{
'use strict';
const KEY='fixedExpenseIncome_v1';
const $=id=>document.getElementById(id);
const today=new Date();
const currentMonth=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')};
const monthNow=currentMonth();
const fmt=n=>Number(n||0).toLocaleString('ko-KR')+'원';
const clean=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
const prevMonth=m=>{const d=new Date(m+'-01T12:00:00');d.setMonth(d.getMonth()-1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')};
let data={recurring:[],extras:[],receipts:{}};
let selected=monthNow;
let edit=null;
function validObj(v){return v&&typeof v==='object'&&Array.isArray(v.recurring)&&Array.isArray(v.extras)&&v.receipts&&typeof v.receipts==='object'&&!Array.isArray(v.receipts)&&v.recurring.every(r=>r&&typeof r.id==='string'&&typeof r.title==='string'&&typeof r.bank==='string'&&Number.isSafeInteger(r.amount)&&r.amount>0&&Number.isInteger(r.day)&&r.day>=1&&r.day<=31&&/^\d{4}-\d{2}$/.test(r.from)&&(!r.until||/^\d{4}-\d{2}$/.test(r.until)))&&v.extras.every(e=>e&&typeof e.id==='string'&&typeof e.title==='string'&&typeof e.bank==='string'&&Number.isSafeInteger(e.amount)&&e.amount>0&&/^\d{4}-\d{2}-\d{2}$/.test(e.date))&&Object.values(v.receipts).every(x=>x==='received'||x==='pending');}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(data));return true}catch(e){alert('수입 데이터를 저장하지 못했습니다. 저장공간을 확인하세요.');return false}}
function load(){try{const raw=localStorage.getItem(KEY);if(raw){const parsed=JSON.parse(raw);if(validObj(parsed))data=parsed}}catch(e){console.warn('수입 데이터 불러오기 실패',e)}}
function fixedTotal(){try{const a=JSON.parse(localStorage.getItem('fixedExpenseApp_v1')||'[]');return Array.isArray(a)?a.reduce((s,x)=>s+(x.active&&Number.isFinite(x.amount)?x.amount:0),0):0}catch{return 0}}
function activeInMonth(r,m){return r.from<=m&&(!r.until||m<=r.until)}
const key=(r,m)=>r.id+'|'+m;
function totals(m){const recurring=data.recurring.filter(r=>activeInMonth(r,m));const extras=data.extras.filter(x=>x.date.slice(0,7)===m);const scheduled=recurring.reduce((s,x)=>s+x.amount,0);const confirmed=recurring.reduce((s,x)=>s+(data.receipts[key(x,m)]==='received'?x.amount:0),0);const once=extras.reduce((s,x)=>s+x.amount,0);return {recurring,extras,scheduled,confirmed,once,expected:scheduled+once,actual:confirmed+once,fixed:fixedTotal()}}
function labelMonth(m){const a=m.split('-');return a[0]+'년 '+Number(a[1])+'월'}
function paint(){
 const homeHidden=localStorage.getItem('fixedExpenseApp_hideTotal')==='true';
 const homeFmt=n=>homeHidden?'••••••원':fmt(n);
 const t=totals(selected);
 $('incomeMonth').value=selected;
 $('incomeExpected').textContent=fmt(t.expected);
 $('incomeActual').textContent=fmt(t.actual);
 $('incomeFixed').textContent=fmt(t.fixed);
 $('incomeBalance').textContent=fmt(t.expected-t.fixed);
 $('incomeRatio').textContent=t.expected>0?(t.fixed/t.expected*100).toFixed(1)+'%':'—';
 const percent=t.expected?Math.min(100,t.fixed/t.expected*100):0;
 $('incomeRatioBar').style.width=percent+'%';
 const recurring=t.recurring.map(r=>'<div class="income-row"><div><strong>'+clean(r.title)+'</strong><div class="income-muted">'+clean(r.bank)+' · 매월 '+r.day+'일 · '+(data.receipts[key(r,selected)]==='received'?'입금 완료':'입금 예정')+'</div></div><div class="income-row-right"><strong>'+fmt(r.amount)+'</strong><div class="income-buttons"><button type="button" data-receipt="'+clean(r.id)+'">'+(data.receipts[key(r,selected)]==='received'?'예정으로 변경':'입금 완료')+'</button><button type="button" data-edit-recurring="'+clean(r.id)+'">수정</button><button type="button" data-stop-recurring="'+clean(r.id)+'">중지</button></div></div></div>').join('');
 const extras=t.extras.sort((a,b)=>b.date.localeCompare(a.date)).map(e=>'<div class="income-row"><div><strong>'+clean(e.title)+'</strong><div class="income-muted">'+clean(e.bank)+' · '+e.date+' · 입금 완료</div></div><div class="income-row-right"><strong>'+fmt(e.amount)+'</strong><div class="income-buttons"><button type="button" data-edit-extra="'+clean(e.id)+'">수정</button><button type="button" data-delete-extra="'+clean(e.id)+'">삭제</button></div></div></div>').join('');
 $('incomeRecurringRows').innerHTML=recurring||'<p class="income-empty">이 달에 적용되는 고정 수입이 없습니다.</p>';
 $('incomeExtraRows').innerHTML=extras||'<p class="income-empty">이 달에 등록된 추가 수입이 없습니다.</p>';
 // The homepage keeps the existing expense chart and adds a month-specific summary.
 $('incomeHomeMonth').textContent=labelMonth(monthNow);
 const h=totals(monthNow);
 $('incomeHomeExpected').textContent=homeFmt(h.expected);
 $('incomeHomeActual').textContent=homeFmt(h.actual);
 $('incomeHomeFixed').textContent=homeFmt(h.fixed);
 $('incomeHomeBalance').textContent=homeFmt(h.expected-h.fixed);
}
const incomeNameOptions=['월급','부업','상여금','용돈','배당금','이자','임대 수입','환급금','중고거래','기타'];
const incomeBankOptions=['국민은행','신한은행','우리은행','하나은행','카카오뱅크','토스뱅크','농협은행','기업은행','케이뱅크','신한카드','현대카드'];
function updateSuggestions(){
 const names=[...new Set([...incomeNameOptions,...data.recurring.map(x=>x.title),...data.extras.map(x=>x.title)])].filter(Boolean);
 const banks=[...new Set([...incomeBankOptions,...data.recurring.map(x=>x.bank),...data.extras.map(x=>x.bank)])].filter(Boolean);
 const escAttr=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]));
 $('incomeTitleOptions').innerHTML=names.map(x=>'<option value="'+escAttr(x)+'"></option>').join('');
 $('incomeBankOptions').innerHTML=banks.map(x=>'<option value="'+escAttr(x)+'"></option>').join('');
}
function openForm(type,id){
 updateSuggestions();edit={type,id:id||null};
 const record=type==='recurring'?data.recurring.find(x=>x.id===id):data.extras.find(x=>x.id===id);
 $('incomeFormTitle').textContent=id?'수입 수정':type==='recurring'?'고정 수입 추가':'추가 수입 등록';
 $('incomeType').value=type;
 $('incomeTitle').value=record?.title||'';
 $('incomeBank').value=record?.bank||'';
 $('incomeAmount').value=record?.amount||'';
 $('incomeDay').value=record?.day||25;
 $('incomeDate').value=record?.date||new Date().toLocaleDateString('sv-SE');
 $('incomeRecurringFields').hidden=type!=='recurring';
 $('incomeDay').disabled=type!=='recurring';
 $('incomeExtraFields').hidden=type!=='extra';
 $('incomeDate').disabled=type!=='extra';
 $('incomeModal').classList.remove('hidden');
 window.v2ResetInputs?.();window.v2OpenLayer?.('income');
 // The name field starts in selection mode to avoid opening the keyboard over the choices.
}
function closeForm(){$('incomeModal').classList.add('hidden');edit=null;window.v2CloseLayer?.('income')}
function closeChooser(){$('incomeTypeChooser').classList.add('hidden');window.v2CloseLayer?.('chooser')}
function uid(){return (typeof crypto!=='undefined'&&crypto.randomUUID?.())||Date.now()+'-'+Math.random().toString(36).slice(2)}
function saveForm(ev){
 ev.preventDefault();
 const type=edit?.type;if(!type)return;
 const title=$('incomeTitle').value.trim(),bank=$('incomeBank').value.trim();
 const amount=Number($('incomeAmount').value),day=Number($('incomeDay').value),date=$('incomeDate').value;
 if(!title||!bank||!Number.isSafeInteger(amount)||amount<=0){alert('수입 이름, 은행, 올바른 금액을 입력하세요.');return}
 const before=JSON.stringify(data);
 if(type==='recurring'){
  if(!Number.isInteger(day)||day<1||day>31){alert('입금일은 1~31일 사이로 입력해 주세요.');return}
  const entry={id:uid(),title,bank,amount,day,from:monthNow,until:null};
  if(edit.id){
   const idx=data.recurring.findIndex(x=>x.id===edit.id),old=data.recurring[idx];
   if(idx>=0){
    if(old.from===monthNow){entry.id=old.id;data.recurring[idx]=entry}
    else {old.until=prevMonth(monthNow);data.recurring.push(entry)}
   }
  }else{data.recurring.push(entry)}
 }else{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(new Date(date+'T12:00:00').getTime())){alert('수입 날짜를 확인해 주세요.');return}
  const entry={id:edit.id||uid(),title,bank,amount,date};
  if(edit.id){const i=data.extras.findIndex(x=>x.id===edit.id);if(i>=0)data.extras[i]=entry}
  else data.extras.push(entry);
 }
 if(!persist()){data=JSON.parse(before);return}
 if(type==='extra')selected=date.slice(0,7);
 closeForm();paint();
}
function handleClick(ev){
 const b=ev.target.closest('button');if(!b)return;
 const rId=b.dataset.receipt;
 if(rId){const k=rId+'|'+selected;data.receipts[k]=data.receipts[k]==='received'?'pending':'received';persist();paint();return}
 const rec=b.dataset.editRecurring;
 if(rec){if(selected!==monthNow){alert('고정 수입 수정은 이번 달부터 적용됩니다. 이전 달 내역은 보존됩니다.');return}openForm('recurring',rec);return}
 const stop=b.dataset.stopRecurring;
 if(stop){
  if(selected!==monthNow){alert('고정 수입 중지는 이번 달부터 적용할 수 있습니다.');return}
  if(!confirm('이 고정 수입을 이번 달부터 중지할까요? 이전 월 기록은 유지됩니다.'))return;
  const old=data.recurring.find(x=>x.id===stop);if(!old)return;
  if(old.from===monthNow)data.recurring=data.recurring.filter(x=>x.id!==stop);
  else old.until=prevMonth(monthNow);
  persist();paint();return
 }
 const extra=b.dataset.editExtra;
 if(extra){openForm('extra',extra);return}
 const del=b.dataset.deleteExtra;
 if(del&&confirm('이 추가 수입 내역을 삭제할까요?')){data.extras=data.extras.filter(x=>x.id!==del);persist();paint()}
}
function setup(){
 load();
 updateSuggestions();
 $('incomeMonth').value=selected;
 $('incomeMonth').addEventListener('change',ev=>{if(/^\d{4}-\d{2}$/.test(ev.target.value)){selected=ev.target.value;paint()}});
 $('incomeAddRecurring').onclick=()=>openForm('recurring');
 window.addEventListener('open-income-chooser',()=>{$('incomeTypeChooser').classList.remove('hidden');window.v2OpenLayer?.('chooser')});
 $('chooseRecurring').onclick=()=>{closeChooser();openForm('recurring')};
 $('chooseExtra').onclick=()=>{closeChooser();openForm('extra')};
 $('closeIncomeChooser').onclick=closeChooser;
 $('incomeTypeChooser').addEventListener('click',e=>{if(e.target===$('incomeTypeChooser'))closeChooser()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeChooser()});
 $('incomeAddExtra').onclick=()=>openForm('extra');
 $('incomeClose').onclick=closeForm;
 $('incomeCancel').onclick=closeForm;
 $('incomeForm').onsubmit=saveForm;
 $('incomeModal').addEventListener('click',ev=>{if(ev.target===$('incomeModal'))closeForm()});
 $('incomePanel').addEventListener('click',handleClick);
 window.addEventListener('fixed-expenses-changed',paint);
 window.addEventListener('fixed-money-visibility',paint);
 window.addEventListener('storage',ev=>{if(ev.key===KEY||ev.key==='fixedExpenseApp_v1'){load();paint()}});
 paint();
}
window.incomeBackupPayload=()=>({incomeData:JSON.parse(JSON.stringify(data))});
window.validateIncomeBackup=obj=>{if(Object.prototype.hasOwnProperty.call(obj,'incomeData')&&!validObj(obj.incomeData))throw Error('수입 백업 형식이 올바르지 않습니다.')};
window.importIncomeBackup=obj=>{if(Object.prototype.hasOwnProperty.call(obj,'incomeData')){data=JSON.parse(JSON.stringify(obj.incomeData));persist();paint()}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();