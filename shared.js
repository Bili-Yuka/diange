export const $=(s,root=document)=>root.querySelector(s);
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
import {SITE} from './site-config.js';
import {publicSongs} from './song-data.mjs';
export async function api(path){
  if(path!=='/api/songs')throw new Error('不支持的请求');
  const response=await fetch(new URL('./data/songs.json',import.meta.url),{cache:'no-store'});
  if(!response.ok)throw new Error('暂时无法加载歌单，请稍后重试');
  return {songs:publicSongs(await response.json()),settings:SITE};
}
let toastTimer;export function toast(message){const el=$('#toast');if(!el)return;el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,3500);}
export function bindDialogs(){document.querySelectorAll('dialog [data-close],dialog .dialog-x').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));}
export async function copyText(text){try{await navigator.clipboard.writeText(text);return true;}catch{const input=document.createElement('textarea');input.value=text;input.className='clipboard-helper';document.body.append(input);input.select();let ok=false;try{ok=document.execCommand('copy');}catch{}input.remove();return ok;}}
export function formatRequest(template,title){return template.split('{歌名}').join(title);}
