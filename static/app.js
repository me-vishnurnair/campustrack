import {el,$,api,notify,busy,download} from './lib.js';
const stages=['Saved','Applied','Interview','Offer','Closed'];
let records=[],user=null,csrf='',demo=false,register=false,editing=null;
const request=(method,data)=>({method,headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(data||{})});
const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const dueLabel=value=>{if(!value)return 'No deadline';return new Date(value+'T12:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short'});};
function render(){
  const needle=$('#search').value.toLowerCase(),filter=$('#filter').value;
  const filtered=records.filter(r=>(!filter||r.status===filter)&&(r.company+' '+r.role).toLowerCase().includes(needle));
  const today=localDate(new Date()),next=new Date();next.setDate(next.getDate()+7);
  $('#stat-total').textContent=records.length;
  $('#stat-active').textContent=records.filter(r=>['Applied','Interview'].includes(r.status)).length;
  $('#stat-interview').textContent=records.filter(r=>r.status==='Interview').length;
  $('#stat-due').textContent=records.filter(r=>r.deadline>=today&&r.deadline<=localDate(next)&&!['Closed','Offer'].includes(r.status)).length;
  $('#board').replaceChildren(...stages.filter(s=>!filter||s===filter).map(stage=>{
    const items=filtered.filter(r=>r.status===stage);
    return el('div',{class:'column'},el('div',{class:'column-title'},stage,el('span',{class:'count'},items.length)),
      ...(items.length?items.map(r=>el('article',{class:'application'},el('div',{class:'company-mark'},r.company.slice(0,2).toUpperCase()),el('p',{class:'company'},r.company),el('h3',{},r.role),el('span',{class:'pill'},r.status),el('div',{class:'application-footer'},el('span',{class:'muted'},dueLabel(r.deadline)),el('button',{class:'btn ghost',onclick:()=>openApplication(r),'aria-label':`Edit ${r.role} at ${r.company}`},'Edit ↗')))): [el('div',{class:'empty'},'No applications here yet.')]));
  }));
  $('#identity').textContent=user?user.username:demo?'Sample workspace':'Your next chapter';
  $('#auth-button').textContent=user?'Sign out':'Sign in';
  if(user)$('#mode-banner').replaceChildren('Your board is saved to your account.');
  else if(demo)$('#mode-banner').replaceChildren('Sample workspace · Fictional opportunities. Changes last only until this page is reloaded.');
}
function openApplication(record){
  if(!user&&!demo){$('#auth-dialog').showModal();return;}
  editing=record?.id??null;
  const f=$('#application-form');f.reset();
  if(record)for(const k of ['company','role','status','deadline','url','notes'])f.elements[k].value=record[k]||'';
  $('#application-title').textContent=record?'Edit opportunity':'Add an opportunity';
  $('#application-error').textContent='';$('#delete-button').hidden=!record;$('#application-dialog').showModal();
}
$('#demo-button').onclick=()=>{
  if(user)return;
  const deadline=days=>{const d=new Date();d.setDate(d.getDate()+days);return localDate(d);};
  records=[{id:1,company:'Northstar Labs',role:'Python developer intern',status:'Saved',deadline:deadline(4),url:'',notes:'Fictional example: practise building a REST API.'},{id:2,company:'Paperplane Studio',role:'Frontend intern',status:'Applied',deadline:deadline(12),url:'',notes:'Fictional example.'},{id:3,company:'Greenbyte Research',role:'ML research intern',status:'Interview',deadline:deadline(6),url:'',notes:'Fictional example: review validation and data leakage.'},{id:4,company:'Canvas Systems',role:'Software engineering intern',status:'Saved',deadline:deadline(3),url:'',notes:'Fictional example.'},{id:5,company:'Lighthouse Apps',role:'Backend intern',status:'Offer',deadline:'',url:'',notes:'Fictional example.'}];demo=true;render();
};
$('#auth-button').onclick=()=>{if(user)busy($('#auth-button'),async()=>{await api('/api/logout',request('POST'));location.reload();});else $('#auth-dialog').showModal();};
$('#switch-auth').onclick=()=>{register=!register;$('#auth-title').textContent=register?'Start your next chapter.':'Welcome back.';$('#auth-submit').textContent=register?'Create account':'Sign in';$('#switch-auth').textContent=register?'Sign in instead':'Create account instead';$('#auth-form').elements.password.autocomplete=register?'new-password':'current-password';$('#auth-error').textContent='';};
$('#auth-form').onsubmit=async e=>{e.preventDefault();const btn=$('#auth-submit');btn.disabled=true;$('#auth-error').textContent='';try{const data=Object.fromEntries(new FormData(e.target));user=await api(register?'/api/register':'/api/login',request('POST',data));csrf=user.csrf;demo=false;records=await api('/api/applications');e.target.reset();$('#auth-dialog').close();render();notify('Your workspace is ready.');}catch(err){$('#auth-error').textContent=err.message;}finally{btn.disabled=false;}};
$('#application-form').onsubmit=async e=>{e.preventDefault();const btn=e.submitter;btn.disabled=true;try{const data=Object.fromEntries(new FormData(e.target));if(demo){if(editing)records=records.map(r=>r.id===editing?{...data,id:editing}:r);else records.unshift({...data,id:Date.now()});}else{await api('/api/applications'+(editing?'/'+editing:''),request(editing?'PUT':'POST',data));records=await api('/api/applications');}$('#application-dialog').close();render();notify('Application saved.');}catch(err){$('#application-error').textContent=err.message;}finally{btn.disabled=false;}};
$('#delete-button').onclick=()=>{if(!confirm('Delete this application? This removes the record permanently.'))return;busy($('#delete-button'),async()=>{if(!demo)await api('/api/applications/'+editing,request('DELETE'));records=records.filter(r=>r.id!==editing);$('#application-dialog').close();render();notify('Application deleted.');});};
$('#add-button').onclick=()=>openApplication();
$('#search').oninput=render;$('#filter').onchange=render;
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).close());
$('#export-button').onclick=()=>{if(user){location.href='/api/export';return;}if(!demo){notify('Sign in or load the sample board first.');return;}const keys=['company','role','status','deadline','url','notes'];const cell=x=>{let s=String(x||'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};download('sample-applications.csv',[keys.join(','),...records.map(r=>keys.map(k=>cell(r[k])).join(','))].join('\r\n'),'text/csv');};
render();
try{user=await api('/api/me');csrf=user.csrf;records=await api('/api/applications');render();}catch{}
