'use strict';
const DOCTORS=[['Dũng A','#d9eafe','#174b91'],['Minh','#d5f5e8','#176445'],['Việt','#fce5d8','#924321'],['Nhật Anh','#eee0fd','#693b99'],['Dũng B','#fce4ec','#9e3157'],['Thanh','#e2f5cb','#526c18'],['Quyết','#fff0bb','#8e641b'],['Khánh','#cdeff3','#166b7b'],['Túc','#e6e6fa','#4d4991'],['Hải','#ffe1de','#9a3934'],['Khương','#e1ebce','#456d41'],['Trường','#dae8ef','#3d5d72']];
const $=id=>document.getElementById(id);
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const nextDay=(date)=>{const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const generateId=()=>globalThis.crypto?.randomUUID?.()||`c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const cfg=window.APP_CONFIG||{};
const CLOUD=Boolean(!cfg.DEMO_MODE&&cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&window.supabase);
const client=CLOUD?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
let records=[],history=[],editingId=null,user=null,currentDate=today(),activeTab='schedule';
const storageKey='ctch-schedule-v1';
function loadLocal(){try{const x=JSON.parse(localStorage.getItem(storageKey)||'{}');records=x.records||[];history=x.history||[];currentDate=x.currentDate||today()}catch{records=[];history=[]}}
function saveLocal(){localStorage.setItem(storageKey,JSON.stringify({records,history,currentDate}))}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),3500)}
function doctorStyle(name){const d=DOCTORS.find(x=>x[0]===name)||['','#e6edf4','#42586b'];return {bg:d[1],fg:d[2]}}
function ordered(list){return [...list].sort((a,b)=>{const ai=DOCTORS.findIndex(d=>d[0]===a.ptv),bi=DOCTORS.findIndex(d=>d[0]===b.ptv);return (ai<0?999:ai)-(bi<0?999:bi)||String(a.time||'99:99').localeCompare(String(b.time||'99:99'))||String(a.created_at||'').localeCompare(String(b.created_at||''))})}
function el(tag,attrs={},text){const node=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>{if(k==='class')node.className=v;else if(k==='style')Object.assign(node.style,v);else node.setAttribute(k,v)});if(text!==undefined)node.textContent=text;return node}
function cell(row,text,cls=''){const td=el('td',{class:cls},String(text??''));row.append(td);return td}
function noteNode(note){const kind=note==='Siêu âm tim'?'note-echo':note==='Khám tim mạch'?'note-heart':note==='Dự trù máu'?'note-blood':'note-other';return el('span',{class:`note ${kind}`},note)}

let pickerTarget=null;
function attachPtvCell(td,name,record){
 const wrap=el('div',{class:'ptv-cell'});
 if(name){const color=doctorStyle(name);wrap.append(el('span',{class:'ptv-pill',style:{background:color.bg,color:color.fg}},name))}
 const arrow=el('button',{type:'button',class:'ptv-arrow','aria-label':'Chọn PTV','aria-haspopup':'dialog'},'▾');
 arrow.addEventListener('click',e=>{e.stopPropagation();showPtvPicker(arrow,record)});
 wrap.append(arrow);td.append(wrap);
}
function showPtvPicker(anchor,record){
 pickerTarget=record;
 const popup=$('ptvPicker');popup.classList.remove('hidden');
 const rect=anchor.getBoundingClientRect();
 const width=popup.offsetWidth||370;
 popup.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-width-8))+'px';
 popup.style.top=Math.max(8,Math.min(rect.bottom+5,window.innerHeight-popup.offsetHeight-8))+'px';
}
function closePtvPicker(){$('ptvPicker').classList.add('hidden');pickerTarget=null}
async function choosePtv(name){
 const record=pickerTarget;closePtvPicker();
 try{
  if(CLOUD){
   if(!user)return toast('Vui lòng đăng nhập để lưu PTV');
   const data=record?{ptv:name}:{ptv:name,date:currentDate,patient:'',notes:[]};
   const {error}=await(record?client.from('surgery_cases').update(data).eq('id',record.id):client.from('surgery_cases').insert(data));
   if(error)throw error;await refreshCloud();
  }else{
   if(record){const found=records.find(x=>x.id===record.id);if(found)found.ptv=name}
   else records.push({id:generateId(),ptv:name,patient:'',date:currentDate,created_at:new Date().toISOString(),notes:[]});
   saveLocal();draw();
  }
 }catch(e){toast('Không lưu được PTV: '+e.message)}
}

function draw(){const matches=ordered(records.filter(r=>r.date===currentDate));const term=$('searchInput').value.trim().toLocaleLowerCase('vi');const visible=matches.filter(r=>[r.patient,r.ptv,r.diagnosis,r.equipment,r.assistant,r.anesthesia].some(x=>String(x||'').toLocaleLowerCase('vi').includes(term)));
 const tbody=$('scheduleBody');tbody.replaceChildren();$('totalCount').textContent=matches.length;
 const counts={};let last=null;for(const r of matches){counts[r.ptv]=(counts[r.ptv]||0)+1;r.groupNumber=counts[r.ptv]}
 for(const r of visible){const tr=el('tr',{class:last!==r.ptv?'group-start':''});const color=doctorStyle(r.ptv);const first=cell(tr,'','sticky-first');attachPtvCell(first,r.ptv,r);cell(tr,r.groupNumber,'num');cell(tr,r.patient,'patient');cell(tr,r.age);cell(tr,r.diagnosis);const eq=cell(tr,'','equipment');eq.append(el('div',{style:{background:color.bg,color:color.fg,borderLeftColor:color.fg}},r.equipment||'—'));cell(tr,r.request);cell(tr,r.table);cell(tr,r.assistant);cell(tr,r.anesthesia);cell(tr,r.time);const notes=cell(tr,'');const wrap=el('div',{class:'note-wrap'});(r.notes||[]).forEach(n=>wrap.append(noteNode(n)));notes.append(wrap);const actions=cell(tr,'');const edit=el('button',{type:'button',class:'mini-btn',title:'Sửa ca'},'Sửa');edit.addEventListener('click',()=>openForm(r));const del=el('button',{type:'button',class:'mini-btn danger',title:'Xóa ca'},'Xóa');del.addEventListener('click',()=>removeCase(r));actions.append(edit,del);tbody.append(tr);last=r.ptv}
 if(!term){for(let k=visible.length;k<15;k++){const tr=el('tr',{class:'placeholder-row'});const first=cell(tr,'','sticky-first');attachPtvCell(first,'',null);for(let i=1;i<13;i++){const td=cell(tr,'');if(i===1)td.classList.add('num');if(i===2){const trigger=el('button',{type:'button',class:'empty-entry',title:'Nhập ca mổ'},'Nhập thông tin…');trigger.addEventListener('click',()=>openForm());td.append(trigger)}}tbody.append(tr)}}
 }
function drawHistory(){const month=$('monthInput').value;const arr=[...history].filter(h=>h.date.startsWith(month)).sort((a,b)=>b.date.localeCompare(a.date));$('historyCount').textContent=`${arr.length} ngày đã chốt`;$('historyList').replaceChildren();for(const h of arr){const card=el('article',{class:'history-card'});const heading=el('header');heading.append(el('span',{},`Ngày mổ: ${h.date.split('-').reverse().join('/')}`),el('span',{},`${(h.cases||[]).length} ca`));card.append(heading,el('p',{class:'summary'},`Chốt lúc: ${new Date(h.archived_at).toLocaleString('vi-VN')}`));const details=el('details');const sum=el('summary',{},'Xem ca mổ đã lưu');details.append(sum);const t=el('table');const th=el('tr');['PTV','STT','Bệnh nhân / Mã ca','Chẩn đoán','Dụng cụ','Bàn mổ','Giờ mổ','Lưu ý'].forEach(x=>th.append(el('th',{},x)));t.append(th);let lastP='',n=0;ordered(h.cases||[]).forEach(r=>{if(r.ptv!==lastP)n=0;n++;lastP=r.ptv;const tr=el('tr');[r.ptv,n,r.patient,r.diagnosis,r.equipment,r.table,r.time,(r.notes||[]).join('; ')].forEach(x=>cell(tr,x));t.append(tr)});details.append(t);card.append(details);$('historyList').append(card)}if(!arr.length)$('historyList').append(el('div',{class:'empty'},'Chưa có lịch sử trong tháng này.'))}
function openForm(r=null){editingId=r?.id||null;$('dialogTitle').textContent=r?'Sửa ca mổ':'Thêm ca mổ';$('caseForm').reset();const f=$('caseForm');for(const k of ['ptv','patient','age','diagnosis','equipment','request','table','assistant','anesthesia','time']){if(r&&f.elements.namedItem(k))f.elements.namedItem(k).value=r[k]??''}if(r){for(const i of f.querySelectorAll('input[name="note"]'))i.checked=(r.notes||[]).includes(i.value);f.elements.customNote.value=(r.notes||[]).find(x=>!['Siêu âm tim','Khám tim mạch','Dự trù máu'].includes(x))||''}$('caseDialog').showModal()}
function formPayload(){const f=$('caseForm');const v=k=>f.elements.namedItem(k).value.trim();return {ptv:v('ptv'),patient:v('patient'),age:v('age'),diagnosis:v('diagnosis'),equipment:v('equipment'),request:v('request'),table:v('table'),assistant:v('assistant'),anesthesia:v('anesthesia'),time:v('time'),notes:[...f.querySelectorAll('input[name="note"]:checked')].map(n=>n.value).concat(v('customNote')?[v('customNote')]:[])}}
async function refreshCloud(){const [c,h]=await Promise.all([client.from('surgery_cases').select('*').order('created_at',{ascending:true}),client.from('surgery_archives').select('*').order('archived_at',{ascending:false})]);if(c.error)throw c.error;if(h.error)throw h.error;records=c.data;history=h.data;draw();drawHistory()}
async function saveCase(e){e.preventDefault();const payload=formPayload();if(!payload.ptv||!payload.patient)return toast('Cần điền PTV và tên / mã ca');try{if(CLOUD){if(!user)throw Error('Vui lòng đăng nhập trước khi chỉnh sửa.');const data={...payload,date:currentDate};if(editingId){const {error}=await client.from('surgery_cases').update(data).eq('id',editingId);if(error)throw error}else{const {error}=await client.from('surgery_cases').insert(data);if(error)throw error}await refreshCloud()}else{if(editingId){const idx=records.findIndex(r=>r.id===editingId);if(idx>=0)records[idx]={...records[idx],...payload}}else records.push({...payload,id:generateId(),date:currentDate,created_at:new Date().toISOString()});saveLocal();draw()}$('caseDialog').close();toast('Đã lưu ca mổ')}catch(err){toast('Không lưu được: '+err.message)}}
async function removeCase(r){if(!confirm(`Xóa ca của ${r.patient}?`))return;try{if(CLOUD){if(!user)throw Error('Chưa đăng nhập');const {error}=await client.from('surgery_cases').delete().eq('id',r.id);if(error)throw error;await refreshCloud()}else{records=records.filter(x=>x.id!==r.id);saveLocal();draw()}toast('Đã xóa ca mổ')}catch(err){toast('Không xóa được: '+err.message)}}
async function archiveDate(){const target=currentDate;const dayCases=ordered(records.filter(r=>r.date===target));if(!dayCases.length)return toast('Ngày này chưa có ca mổ để chốt.');if(!confirm(`Chốt ${dayCases.length} ca mổ ngày ${target} vào lịch sử? Sau khi chốt, danh sách ngày đó sẽ được chuyển khỏi lịch hiện tại.`))return;try{if(CLOUD){if(!user)throw Error('Chưa đăng nhập');const {error}=await client.rpc('archive_surgery_date',{p_date:target});if(error)throw error;await refreshCloud()}else{if(history.some(h=>h.date===target))return toast('Ngày này đã có bản chốt.');history.push({id:generateId(),date:target,archived_at:new Date().toISOString(),cases:dayCases.map(({groupNumber,...r})=>r)});records=records.filter(r=>r.date!==target);saveLocal()}currentDate=nextDay(target);$('dateInput').value=currentDate;if(!CLOUD)saveLocal();draw();drawHistory();toast(`Đã chốt lịch ${target}; chuyển sang ngày ${currentDate}`)}catch(err){toast('Không chốt được: '+err.message)}}
function exportCsv(){const list=ordered(records.filter(r=>r.date===currentDate));const headers=['PTV','STT','Tên/Mã ca','Tuổi','Chẩn đoán','Dụng cụ dự trù','Mổ yêu cầu','Bàn mổ','PTV phụ','BS gây mê – kíp mê','Giờ mổ','Lưu ý'];let last='',n=0;const data=list.map(r=>{if(r.ptv!==last)n=0;n++;last=r.ptv;return[r.ptv,n,r.patient,r.age,r.diagnosis,r.equipment,r.request,r.table,r.assistant,r.anesthesia,r.time,(r.notes||[]).join('; ')]});const quote=x=>'"'+String(x??'').replaceAll('"','""')+'"';const csv='\ufeff'+[headers,...data].map(row=>row.map(quote).join(',')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=el('a',{href:url,download:`lich-mo-${currentDate}.csv`});document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url)}
async function authSubmit(e){e.preventDefault();$('authError').textContent='';const {error}=await client.auth.signInWithPassword({email:$('authEmail').value,password:$('authPassword').value});if(error){$('authError').textContent=error.message;return}$('authDialog').close();await initializeCloud()}
async function initializeCloud(){const {data:{user:u}}=await client.auth.getUser();user=u;$('loginBtn').classList.toggle('hidden',!!user);$('logoutBtn').classList.toggle('hidden',!user);$('syncStatus').textContent=user?'Đã kết nối · '+user.email:'Chưa đăng nhập';if(user){try{await refreshCloud()}catch(err){toast('Không tải dữ liệu: '+err.message)}}else{records=[];history=[];draw();drawHistory()}}
function setup(){
 for(const d of DOCTORS){const b=el('button',{type:'button',class:'picker-doctor',style:{background:d[1],color:d[2]}},d[0]);b.addEventListener('click',()=>choosePtv(d[0]));$('ptvGrid').append(b)}
 for(let i=DOCTORS.length;i<16;i++)$('ptvGrid').append(el('div',{class:'picker-spacer'}));
 $('closePicker').addEventListener('click',closePtvPicker);
 document.addEventListener('pointerdown',e=>{if(!$('ptvPicker').classList.contains('hidden')&&!e.target.closest('#ptvPicker')&&!e.target.closest('.ptv-arrow'))closePtvPicker()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closePtvPicker()});
 for(const d of DOCTORS)$('ptvSelect').append(el('option',{value:d[0]},d[0]));$('dateInput').value=currentDate;$('monthInput').value=currentDate.slice(0,7);$('dateInput').addEventListener('change',e=>{currentDate=e.target.value;if(!CLOUD)saveLocal();draw()});$('monthInput').addEventListener('change',drawHistory);$('searchInput').addEventListener('input',draw);$('addBtn').addEventListener('click',()=>openForm());$('closeDialog').addEventListener('click',()=>$('caseDialog').close());$('cancelBtn').addEventListener('click',()=>$('caseDialog').close());$('caseForm').addEventListener('submit',saveCase);$('archiveBtn').addEventListener('click',archiveDate);$('exportBtn').addEventListener('click',exportCsv);for(const b of document.querySelectorAll('.tab'))b.addEventListener('click',()=>{activeTab=b.dataset.tab;for(const x of document.querySelectorAll('.tab'))x.classList.toggle('active',x===b);$('scheduleTab').classList.toggle('hidden',activeTab!=='schedule');$('historyTab').classList.toggle('hidden',activeTab!=='history');if(activeTab==='history')drawHistory()});$('loginBtn').addEventListener('click',()=>CLOUD?$('authDialog').showModal():toast('Hãy cấu hình Supabase trong config.js trước.'));$('logoutBtn').addEventListener('click',async()=>{if(CLOUD){await client.auth.signOut();await initializeCloud()}});$('cancelAuth').addEventListener('click',()=>$('authDialog').close());$('authForm').addEventListener('submit',authSubmit);
 if(CLOUD){$('footnote').textContent='Dữ liệu dùng chung được lưu trên Supabase, giới hạn cho các tài khoản được cấp quyền. Hãy kiểm thử phân quyền trước khi sử dụng với thông tin người bệnh.';initializeCloud()}else{loadLocal();$('dateInput').value=currentDate;$('monthInput').value=currentDate.slice(0,7);draw();drawHistory()}}
setup();
