import {$,esc,toast,bindDialogs} from './shared.js';
import {API_BASE} from './site-config.js';
import {toEditorRows,toWireRows} from './song-data.mjs';

bindDialogs();
let token='',rows=[],loaded=false,sha='',dirty=false,busy=false,editing=-1,importRows=[],revision=0;
try{token=sessionStorage.getItem('api_token')||'';}catch{}
const fields=['name','artist','lang','sc','tags','cut','note'];
const setStatus=(message,error=false)=>{$('#sync-status').textContent=message;$('#sync-status').classList.toggle('error',error);};
function markDirty(){dirty=true;revision++;renderSave();}
function renderSave(){
  $('#save-status').textContent=!loaded?'请先成功读取线上歌单':dirty?'有修改还没有保存':'已与线上歌单同步';
  $('#save-songs').disabled=!loaded||!dirty||busy;
  for(const id of ['add-song','import-open','sidebar-import','export-xlsx','export-json'])$('#'+id).disabled=!loaded||busy;
}
function showStudio(value){$('#studio').hidden=!value;$('#auth-screen').hidden=value;$('#logout').hidden=!value;}
async function request(path,options={}){
  const response=await fetch(API_BASE+path,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...options.headers}});
  const data=await response.json().catch(()=>({error:'后台响应异常，请稍后重试'}));
  if(!response.ok||data.error){const error=new Error(data.error||`后台暂时不可用（${response.status}）`);error.status=response.status;throw error;}
  return data;
}
function confirmAction(title,message){
  const dialog=$('#confirm-dialog');$('#confirm-title').textContent=title;$('#confirm-text').textContent=message;
  return new Promise(resolve=>{
    const done=value=>{dialog.close();dialog.oncancel=null;resolve(value);};
    $('#confirm-ok').onclick=()=>done(true);$('#confirm-cancel').onclick=()=>done(false);
    dialog.oncancel=event=>{event.preventDefault();done(false);};dialog.showModal();
  });
}
function expire(){token='';loaded=false;try{sessionStorage.removeItem('api_token');sessionStorage.removeItem('api_user');}catch{}showStudio(false);$('#auth-error').textContent='登录已过期，请重新登录。';renderSave();}
async function loadSongs(){
  if(busy)return;
  if(dirty&&!await confirmAction('重新读取线上歌单？','当前页面里未保存的修改会被线上歌单替换。可以先下载备份。'))return;
  busy=true;setStatus('正在读取最新的线上歌单…');renderSave();
  try{
    const data=await request('/api/songs');
    if(!data.content||!data.sha)throw new Error('后台返回的歌单不完整，请联系原后台管理者');
    rows=toEditorRows(Array.isArray(data.content)?data.content:data.content.songs);
    sha=data.sha;loaded=true;dirty=false;revision++;renderSongs();
    setStatus(`已读取线上歌单 · 共 ${rows.length} 首。修改后记得保存哦。`);
  }catch(error){setStatus(error.message,true);toast(error.message);if(error.status===401&&!dirty)expire();}
  finally{busy=false;renderSave();}
}
$('#auth-form').onsubmit=async event=>{
  event.preventDefault();const form=event.currentTarget;const button=$('#auth-submit');button.disabled=true;$('#auth-error').textContent='';
  try{
    const result=await request('/api/login',{method:'POST',body:JSON.stringify({username:form.elements.username.value.trim(),password:form.elements.password.value})});
    if(!result.token)throw new Error('登录失败，请检查账号密码');token=result.token;
    try{sessionStorage.setItem('api_token',token);sessionStorage.setItem('api_user',form.elements.username.value.trim());}catch{}
    form.elements.password.value='';showStudio(true);await loadSongs();
  }catch(error){$('#auth-error').textContent=error.message;}
  finally{button.disabled=false;}
};
$('#logout').onclick=async()=>{
  if(busy)return;
  if(dirty&&!await confirmAction('要退出工作台吗？','当前页面里还有未保存的修改，退出后会丢失。'))return;
  dirty=false;rows=[];loaded=false;sha='';token='';try{sessionStorage.removeItem('api_token');sessionStorage.removeItem('api_user');}catch{}
  showStudio(false);$('#auth-error').textContent='';$('#admin-search').value='';toast('已退出登录');
};
function renderSongs(){
  $('#admin-total').textContent=rows.length;$('#admin-free').textContent=rows.filter(s=>!s.sc||s.sc==='免费'||s.sc==='0').length;
  $('#admin-languages').textContent=new Set(rows.map(s=>s.lang).filter(Boolean)).size;
  const query=$('#admin-search').value.trim().toLowerCase();const visible=rows.map((song,index)=>({song,index})).filter(({song})=>[song.name,song.artist,song.tags,song.note].join(' ').toLowerCase().includes(query));
  $('#admin-songs').innerHTML=visible.length?visible.map(({song:s,index:i})=>`<tr><td><strong>${esc(s.name)}</strong><small>${esc(s.artist)}</small></td><td><span class="language-tag">${esc(s.lang||'未分类')}</span><small>${esc(!s.sc||s.sc==='免费'||s.sc==='0'?'免费':/^\d+(\.\d+)?$/.test(s.sc)?s.sc+'SC':s.sc)}</small></td><td><span class="song-extra" title="${esc(s.tags)}">${esc(s.tags||'—')}</span>${s.cut?`<span class="song-extra" title="${esc(s.cut)}">歌切：${esc(s.cut)}</span>`:''}${s.note?`<span class="song-extra" title="${esc(s.note)}">${esc(s.note)}</span>`:''}</td><td><div class="row-actions"><button data-edit="${i}" class="text-link">编辑</button><button data-delete="${i}" class="plain danger-text">删除</button></div></td></tr>`).join(''):'<tr><td colspan="4" class="muted">还没有找到这首歌。</td></tr>';
  $('#admin-result').textContent=`共 ${rows.length} 首，当前显示 ${visible.length} 首。`;
  $('#admin-songs').querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>openSong(Number(button.dataset.edit)));
  $('#admin-songs').querySelectorAll('[data-delete]').forEach(button=>button.onclick=async()=>{
    if(busy)return;const index=Number(button.dataset.delete);
    if(await confirmAction('移除这首歌？',`「${rows[index].name}」会从当前页面的歌单移除，点击保存后才会更新线上。`)){rows.splice(index,1);markDirty();renderSongs();}
  });
}
function openSong(index=-1){
  if(!loaded||busy)return;editing=index;const song=rows[index]||{name:'',artist:'',lang:'日语',sc:'免费',tags:'',cut:'',note:''};
  const form=$('#song-form');fields.forEach(field=>form.elements.namedItem(field).value=song[field]);
  $('#song-dialog-title').textContent=index<0?'添加一首歌':'编辑这首歌';$('#song-dialog').showModal();
}
$('#song-form').onsubmit=event=>{event.preventDefault();if(busy)return;const form=event.currentTarget;const song={...(rows[editing]||{})};fields.forEach(field=>song[field]=form.elements.namedItem(field).value.trim());if(editing<0)rows.push(song);else rows[editing]=song;markDirty();renderSongs();$('#song-dialog').close();toast('已保留修改，记得保存到线上歌单');};
$('#add-song').onclick=()=>openSong();$('#admin-search').oninput=renderSongs;$('#reload-songs').onclick=loadSongs;
$('#save-songs').onclick=async()=>{
  if(!loaded||!dirty||busy)return;
  let songs;try{songs=toWireRows(rows);}catch(error){toast(error.message);return;}
  if(!songs.length&&!await confirmAction('保存为空歌单？','这会移除线上歌单中的全部歌曲，请确认已经备份。'))return;
  busy=true;renderSave();setStatus('正在核对线上版本并保存…');const savedRevision=revision;
  try{
    const latest=await request('/api/songs');
    if(latest.sha!==sha)throw new Error('线上歌单已经被其他页面更新。请先下载当前备份，再刷新线上歌单并重新修改。');
    const result=await request('/api/songs',{method:'PUT',body:JSON.stringify({songs})});
    if(!result.ok)throw new Error(result.error||'保存未完成，请稍后重试');
    if(revision===savedRevision)dirty=false;
    setStatus('已保存成功！点歌页通常需要约 1 分钟更新。');toast('已保存到线上歌单 ♡');
    try{sha=(await request('/api/songs')).sha;}catch{sha='';setStatus('已保存成功。下一次修改前请先刷新线上歌单。');}
  }catch(error){setStatus(error.message,true);toast(error.message);}
  finally{busy=false;renderSave();}
};
function download(filename,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#export-json').onclick=()=>{try{download('Yuka歌单备份.json',JSON.stringify({songs:toWireRows(rows)},null,2),'application/json');}catch(error){toast(error.message);}};
let excelPromise;
function excel(){return excelPromise||=new Promise((resolve,reject)=>{if(window.ExcelJS)return resolve(window.ExcelJS);const script=document.createElement('script');script.src=new URL('./assets/vendor/exceljs.min.js',import.meta.url).href;script.onload=()=>resolve(window.ExcelJS);script.onerror=()=>{excelPromise=null;reject(new Error('Excel 组件加载失败，请刷新网页后重试'));};document.head.append(script);});}
const headers=['曲名','原唱','语种','SC点歌','标签','歌切','备注'];
$('#export-xlsx').onclick=async()=>{try{const ExcelJS=await excel();const wb=new ExcelJS.Workbook();const sheet=wb.addWorksheet('柚夏yuka的歌单');sheet.addRow(headers);toWireRows(rows).forEach(s=>sheet.addRow([s.name,s.artist,s.lang,s.sc,s.tags.join('|'),s.cut,s.note]));sheet.columns.forEach(column=>column.width=20);download('柚夏yuka的歌单.xlsx',await wb.xlsx.writeBuffer(),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');}catch(error){toast(error.message);}};
function openImport(){if(!loaded||busy)return;importRows=[];$('#import-file').value='';$('#file-label').textContent='Excel · .xlsx';$('#import-preview').hidden=true;$('#import-error').textContent='';$('#import-dialog').showModal();}
$('#import-open').onclick=openImport;$('#sidebar-import').onclick=openImport;
const aliases={name:['曲名','歌名','歌曲','title','name'],artist:['原唱','歌手','演唱','artist'],lang:['语种','语言','lang','language'],sc:['sc点歌','sc','点歌价格','价格','分类','category'],tags:['标签','风格','tags'],cut:['歌切','cut'],note:['备注','说明','note']};
const normalizeHeader=value=>String(value).trim().toLowerCase().replace(/[\s_\-]/g,'');
function cellText(value){if(value==null)return '';if(typeof value==='object'){if(value.richText)return value.richText.map(part=>part.text).join('');if(value.text!=null)return String(value.text);if(value.result!=null)return cellText(value.result);return '';}return String(value);}
let reading=false;
async function readFile(file){
  if(reading)return;reading=true;importRows=[];$('#import-preview').hidden=true;$('#import-error').textContent='';$('#file-label').textContent=file.name;$('#import-confirm').disabled=true;
  try{
    if(!/\.xlsx$/i.test(file.name))throw new Error('请选择 .xlsx 格式的 Excel 文件');
    if(file.size>5*1024*1024)throw new Error('文件超过 5 MB，请拆分后导入');
    const ExcelJS=await excel();const wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer());const sheet=wb.worksheets.find(s=>s.actualRowCount>0);if(!sheet)throw new Error('Excel 中没有可读取的工作表');
    let mapping;const parsed=[];
    sheet.eachRow(row=>{
      const values=row.values.slice(1).map(cellText);
      if(!values.some(value=>value.trim()))return;
      if(!mapping){mapping=values.map(value=>Object.keys(aliases).find(field=>aliases[field].some(alias=>normalizeHeader(alias)===normalizeHeader(value)))||'');if(!mapping.includes('name'))throw new Error('首行需要包含“曲名”或“歌名”表头');return;}
      if(parsed.length>=5000)throw new Error('一次最多导入 5000 首歌曲');
      const song={name:'',artist:'',lang:'',sc:'免费',tags:'',cut:'',note:''};mapping.forEach((field,index)=>{if(field)song[field]=values[index]?.trim()||'';});if(!song.name)throw new Error(`Excel 第 ${row.number} 行没有歌名，请补全后再导入`);parsed.push(song);
    });
    if(!parsed.length)throw new Error('表格中没有歌曲');importRows=parsed;
    $('#import-summary').textContent=`已读取 ${parsed.length} 首歌曲，确认后带入当前页面。`;
    $('#preview-rows').innerHTML=parsed.slice(0,20).map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.artist)}</td><td>${esc(s.lang)}</td><td>${esc(s.sc||'免费')}</td></tr>`).join('');$('#import-preview').hidden=false;
  }catch(error){$('#import-error').textContent=error.message;}
  finally{reading=false;$('#import-confirm').disabled=false;}
}
$('#import-file').onchange=event=>{if(event.target.files[0])readFile(event.target.files[0]);};
const zone=$('#upload-zone');zone.ondragover=event=>{event.preventDefault();zone.classList.add('drag-over');};zone.ondragleave=()=>zone.classList.remove('drag-over');zone.ondrop=event=>{event.preventDefault();zone.classList.remove('drag-over');if(event.dataTransfer.files[0])readFile(event.dataTransfer.files[0]);};
$('#import-confirm').onclick=async()=>{
  if(!importRows.length||reading||busy)return;
  if($('#import-mode').value==='replace'){
    if(!await confirmAction('替换当前全部歌单？',`当前页面的 ${rows.length} 首将替换为表格里的 ${importRows.length} 首。点击保存后才会更新线上。`))return;
    rows=toEditorRows(importRows);toast(`已带入 ${rows.length} 首，记得保存`);
  }else{
    const key=s=>s.name.trim().toLowerCase()+'\0'+s.artist.trim().toLowerCase();const seen=new Set(rows.map(key));let skipped=0,added=0;
    for(const song of toEditorRows(importRows)){const k=key(song);if(seen.has(k))skipped++;else{rows.push(song);seen.add(k);added++;}}
    toast(`已追加 ${added} 首，跳过 ${skipped} 首重复歌曲，记得保存`);
  }
  markDirty();renderSongs();$('#import-dialog').close();
};
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
renderSave();showStudio(Boolean(token));if(token)loadSongs();
