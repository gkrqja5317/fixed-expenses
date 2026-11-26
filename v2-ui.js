(()=>{
'use strict';
const $=id=>document.getElementById(id);
// Do not use tab visit history. Handle Back as an in-app close request.
const exitModal=$('exitConfirm');
const exitCancel=$('exitCancel'),exitAccept=$('exitAccept');
let exitApproved=false, closeWatcher=null;
const activeLayer=()=>{
 if(!$('v2Picker').classList.contains('hidden'))return 'picker';
 if(!$('incomeModal').classList.contains('hidden'))return 'income';
 if(!$('incomeTypeChooser').classList.contains('hidden'))return 'chooser';
 if($('overlay').classList.contains('open'))return 'expense';
 if(!$('menuDropdown').classList.contains('hidden'))return 'menu';
 return null;
};
function closeTop(){
 const name=activeLayer();
 if(!name)return false;
 if(name==='picker')closePicker();
 else if(name==='income')$('incomeClose').click();
 else if(name==='chooser')$('closeIncomeChooser').click();
 else if(name==='expense')$('closeBtn').click();
 else if(name==='menu')$('menuToggle').click();
 return true;
}
window.v2AnyLayerOpen=()=>!!activeLayer();
window.v2VisitTab=()=>{}; // Tabs are NOT browser history entries.
window.v2OpenLayer=()=>{};
window.v2CloseLayer=()=>{};
function showExit(){
 if(exitModal.open)return;
 exitModal.showModal(); // Android Back/Escape natively cancels this dialog.
 exitCancel.focus({preventScroll:true});
}
function cancelExit(){
 if(exitModal.open)exitModal.close('cancel');
}
exitCancel.addEventListener('click',cancelExit);
exitModal.addEventListener('click',e=>{
 if(e.target===exitModal){
  const r=exitModal.getBoundingClientRect();
  if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)cancelExit();
 }
});
exitModal.addEventListener('cancel',()=>{
 // Native Android Back closes the exit dialog, NOT the underlying app.
 exitApproved=false;
});
exitModal.addEventListener('close',()=>{if(!exitApproved)ensureCloseWatcher()});
exitAccept.addEventListener('click',()=>{
 exitApproved=true;
 exitModal.close('confirm');
 if(closeWatcher){closeWatcher.destroy();closeWatcher=null}
 // Standalone PWA closing is browser-controlled; attempt to leave only after approval.
 window.close();
 history.go(-2);
});
// Modern Chrome intercepts Android Back with CloseWatcher, independent of tab history.
// A modal <dialog> creates its own higher-priority close request while open.
function ensureCloseWatcher(){
 if(exitApproved||exitModal.open||closeWatcher||!('CloseWatcher' in window))return;
 try{
  const watcher=new CloseWatcher();
  closeWatcher=watcher;
  watcher.addEventListener('close',()=>{
   if(closeWatcher===watcher)closeWatcher=null;
   if(exitApproved||exitModal.open)return;
   if(!closeTop())showExit();
   // Do not install a watcher above the open native exit dialog.
   if(!exitModal.open)ensureCloseWatcher();
  });
 }catch(e){console.warn('CloseWatcher unavailable:',e)}
}
// Keep one navigation guard as a fallback on browsers without working CloseWatcher.
const appUrl=location.pathname+location.search;
history.replaceState({fixedBase:true},'',appUrl);
history.pushState({fixedGuard:true},'',appUrl);
window.addEventListener('popstate',()=>{
 if(exitApproved)return;
 if(!exitModal.open){
  if(!closeTop())showExit();
 }
 // Re-arm before the next Back so cancelling the dialog never exits the app.
 history.pushState({fixedGuard:true},'',appUrl);
});
document.addEventListener('pointerdown',ensureCloseWatcher,{passive:true});
document.addEventListener('keydown',e=>{
 if(e.key!=='Escape'&&e.key!=='Backspace')return;
 if(e.key==='Backspace'&&(/INPUT|TEXTAREA/.test(document.activeElement?.tagName)||document.activeElement?.isContentEditable))return;
 if(exitModal.open)return; // Native dialog consumes this Back/Escape key.
 if(activeLayer()){e.preventDefault();closeTop()}
 else if(e.key==='Escape'){e.preventDefault();showExit()}
});
ensureCloseWatcher();
let selectedTarget=null,customInput=null;
const v2Picker=$('v2Picker'),pickerList=$('v2PickerList'),pickerTitle=$('v2PickerTitle');
function closePicker(){
 v2Picker.classList.add('hidden');
 selectedTarget=null;
 customInput=null;
 window.v2CloseLayer?.('picker');
}
$('v2PickerClose').addEventListener('click',closePicker);
v2Picker.addEventListener('click',e=>{if(e.target===v2Picker)closePicker()});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function values(target){
 if(target==='purpose')return [...$('purpose').options].map(o=>o.value);
 if(target==='bank'){
  let prev=[];
  try{prev=JSON.parse(localStorage.getItem('fixedExpenseApp_v1')||'[]').map(x=>x.bank)}catch{}
  return [...new Set(['국민은행','신한은행','우리은행','하나은행','농협은행','카카오뱅크','토스뱅크','케이뱅크','기업은행','신한카드','삼성카드','현대카드',...prev].filter(Boolean))];
 }
 const datalist=target==='incomeTitle'?'incomeTitleOptions':'incomeBankOptions';
 return [...$(datalist).options].map(o=>o.value);
}
function startPicker(target){
 selectedTarget=target;
 const input=$(target);
 const current=input.value;
 const options=values(target);
 pickerTitle.textContent=({purpose:'사용 목적 선택',bank:'은행·카드 선택',incomeTitle:'수입 이름 선택',incomeBank:'입금 은행 선택'})[target];
 pickerList.innerHTML=options.map((s,i)=>'<button class="v2-picker-option'+(s===current?' active':'')+'" type="button" data-value="'+i+'"><span>'+esc(s)+'</span><span class="picker-circle" aria-hidden="true"></span></button>').join('')
 + (target==='purpose'?'':'<button class="v2-picker-option" type="button" data-custom="true"><span>＋ 직접 입력</span><span aria-hidden="true">✎</span></button>');
 v2Picker.classList.remove('hidden');
 window.v2OpenLayer?.('picker');
}
pickerList.addEventListener('click',e=>{
 const button=e.target.closest('button');if(!button||!selectedTarget)return;
 const target=selectedTarget,custom=button.dataset.custom==='true',input=$(target);
 if(custom){
  closePicker();
  input.readOnly=false;input.value='';input.placeholder='이름을 직접 입력하세요';
  input.focus();
  return;
 }
 const value=values(target)[Number(button.dataset.value)];
 if(value===undefined)return;
 input.value=value;
 if(target==='purpose')$('purposePickerBtn').firstChild.textContent=value+' ';
 else input.readOnly=true;
 input.dispatchEvent(new Event('change',{bubbles:true}));
 closePicker();
});
for(const target of ['bank','incomeTitle','incomeBank']){
 const input=$(target);
 input.addEventListener('click',()=>{if(input.readOnly)startPicker(target)});
}
$('purposePickerBtn').addEventListener('click',()=>startPicker('purpose'));
window.v2ResetInputs=()=>{
 for(const target of ['bank','incomeTitle','incomeBank']){
  const input=$(target);input.readOnly=true;
 }
 $('purposePickerBtn').firstChild.textContent=$('purpose').value+' ';
};
window.addEventListener('v2-expense-form-open',()=>window.v2ResetInputs());
window.addEventListener('v2-income-form-open',()=>window.v2ResetInputs());
})();