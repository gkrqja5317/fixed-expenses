(()=>{
'use strict';
const $=id=>document.getElementById(id);
// A single guard entry intercepts Android Back; tab visits never create history.
let exiting=false;
const exitModal=$('exitConfirm');
const exitCancel=$('exitCancel'),exitAccept=$('exitAccept');
const activeLayer=()=>{
 if(!$('v2Picker').classList.contains('hidden'))return 'picker';
 if(!$('incomeModal').classList.contains('hidden'))return 'income';
 if(!$('incomeTypeChooser').classList.contains('hidden'))return 'chooser';
 if($('overlay').classList.contains('open'))return 'expense';
 if(!$('menuDropdown').classList.contains('hidden'))return 'menu';
 return null;
};
function closeTop(){
 const name=activeLayer();if(!name)return false;
 if(name==='picker')closePicker();
 else if(name==='income')$('incomeClose').click();
 else if(name==='chooser')$('closeIncomeChooser').click();
 else if(name==='expense')$('closeBtn').click();
 else if(name==='menu')$('menuToggle').click();
 return true;
}
window.v2AnyLayerOpen=()=>!!activeLayer();
window.v2VisitTab=()=>{}; // User explicitly does not want back-button tab history.
window.v2OpenLayer=()=>{}; // Modals use the single Back guard rather than history entries.
window.v2CloseLayer=()=>{};
function showExit(){exitModal.classList.remove('hidden');exitCancel.focus({preventScroll:true})}
function cancelExit(){exitModal.classList.add('hidden')}
exitCancel.addEventListener('click',cancelExit);
exitModal.addEventListener('click',e=>{if(e.target===exitModal)cancelExit()});
exitAccept.addEventListener('click',()=>{
 cancelExit();
 exiting=true;
 // A standalone PWA cannot always close itself via script. Try the direct close
 // first; then leave the history guard and use the browser's native back behavior.
 window.close();
 history.go(-2);
});
const appUrl=location.pathname+location.search; // No tab hash history.
history.replaceState({fixedBase:true},'',appUrl);
history.pushState({fixedBackGuard:true},'',appUrl);
window.addEventListener('popstate',()=>{
 if(exiting)return;
 if(!exitModal.classList.contains('hidden'))cancelExit();
 else if(!closeTop())showExit();
 // Re-arm the same guard without accumulating per-tab browser history.
 history.pushState({fixedBackGuard:true},'',appUrl);
});
document.addEventListener('keydown',e=>{
 if(e.key!=='Escape'&&e.key!=='Backspace')return;
 if(e.key==='Backspace'&&(/INPUT|TEXTAREA/.test(document.activeElement?.tagName)||document.activeElement?.isContentEditable))return;
 if(!exitModal.classList.contains('hidden')){e.preventDefault();cancelExit()}
 else if(activeLayer()){e.preventDefault();closeTop()}
 else if(e.key==='Escape'){e.preventDefault();showExit()}
});
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