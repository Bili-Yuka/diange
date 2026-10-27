// Verified copy-name fixes are independent of optional Chinese dictionary loading.
const REQUEST_OVERRIDES = {"いけないボーダーライン/禁忌的边界线":"いけないボーダーライン","シル・ヴ・プレジデント (如果我是大统领)":"シル・ヴ・プレジデント","チカっとチカ（书记歌）":"チカっとチカ千花っ♡","パズルガール（拼图女孩）":"パズルガール","病名恋ワヅライ":"病名恋ワズライ","忏悔录":"懺悔録","东京日和":"東京日和","迷宫バタフライ":"迷宮バタフライ","平行线":"平行線","小小恋歌":"小さな恋のうた","月灯りふんわり落ちてくる夜 (月光轻轻落下的夜晚)":"月灯りふんわり落ちてくる夜","ヰ世界の宝石譚 (异世界宝石谭)":"ヰ世界の宝石譚","For フルーツバスケット (水果篮子)":"For フルーツバスケット"};
const text = value => String(value ?? '');
const tagList = value => (Array.isArray(value) ? value : text(value).split(/[|｜,，、;；]/)).map(text).map(s => s.trim()).filter(Boolean);
export const LANGUAGES=['国语','日语','韩语','英文'];
export function normalizeLanguage(value){const language=text(value).trim();return ({'中文':'国语','汉语':'国语','普通话':'国语','日文':'日语','韩文':'韩语','英语':'英文','English':'英文','english':'英文'})[language]||language||'国语';}
export const isForeignLanguage=value=>['日语','韩语','英文'].includes(normalizeLanguage(value));
export function translationPatch(existing,value,touched=false){const nameZh=text(value).trim();return Object.hasOwn(existing,'nameZh')||nameZh||touched?{nameZh}:{};}
export const normalizeSearch=value=>text(value).normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,'');
export const requestTitle=song=>text(song.requestName||song.title);
export function matchesSong(song,query){const q=normalizeSearch(query);return !q||normalizeSearch([song.title,song.originalTitle,song.titleZh,song.artist,song.category,song.language,song.note,...(song.tags||[]),...(song.aliases||[])].join(' ')).includes(q);}
function translationLookup(translations){
  const list=Array.isArray(translations)?translations:translations?.songs||[];
  const byName=new Map();
  if(!Array.isArray(list))return ()=>null;
  for(const entry of list){if(!entry?.original||!entry.nameJa||!entry.nameZh)continue;const key=normalizeSearch(entry.original);if(!byName.has(key))byName.set(key,[]);const candidates=byName.get(key);if(!candidates.some(old=>normalizeSearch(old.artist)===normalizeSearch(entry.artist)&&old.nameJa===entry.nameJa&&old.nameZh===entry.nameZh))candidates.push(entry);}
  return song=>{
    if(song.lang!=='日语')return null;
    const candidates=byName.get(normalizeSearch(song.name))||[];
    const exact=candidates.filter(entry=>normalizeSearch(entry.artist)===normalizeSearch(song.artist));
    if(exact.length===1)return exact[0];
    return candidates.length===1&&(!normalizeSearch(song.artist)||!normalizeSearch(candidates[0].artist))?candidates[0]:null;
  };
}
export function publicSongs(input,translations=[]) {
  const list = Array.isArray(input) ? input : input?.songs;
  if (!Array.isArray(list)) throw new Error('歌单格式不正确，请联系主播检查');
  const findTranslation=translationLookup(translations);
  const seen = new Map();
  return list.filter(s => text(s.name).trim()).map(s => {
    const key = Array.from(new TextEncoder().encode(text(s.name) + '\0' + text(s.artist)), b => b.toString(16).padStart(2, '0')).join('');
    const count = seen.get(key) || 0; seen.set(key, count + 1);
    const sc = text(s.sc).trim();
    const language=normalizeLanguage(s.lang),translated=findTranslation({...s,lang:language});
    const originalName=translated?.nameJa||(language==='日语'&&REQUEST_OVERRIDES[s.name])||s.name;
    const manual=Object.hasOwn(s,'nameZh'),titleZh=isForeignLanguage(language)?text(manual?s.nameZh:translated?.nameZh).trim():'';
    const aliases=[...new Set([...tagList(s.aliases),...tagList(translated?.aliases),...(manual&&translated?.nameZh&&translated.nameZh!==titleZh?[translated.nameZh]:[])])];
    return {id:`s-${key}-${count}`,title:text(originalName),originalTitle:text(s.name),titleZh,requestName:text(originalName),aliases,translationType:manual?'manual':translated?.translationType||'',artist:text(s.artist),language,category:!sc||sc==='免费'||sc==='0'?'免费':/^\d+(\.\d+)?$/.test(sc)?`${sc}SC`:sc,tags:tagList(s.tags),note:text(s.note),cut:text(s.cut),updatedAt:'',featured:false};
  });
}
export function toEditorRows(input,translations=[]) {
  if (!Array.isArray(input)) throw new Error('歌单格式不正确');
  const findTranslation=translationLookup(translations);
  return input.map(s => {
    const row={...s,name:text(s.name),artist:text(s.artist),lang:normalizeLanguage(s.lang),sc:text(s.sc)||'免费',tags:tagList(s.tags).join('|'),cut:text(s.cut),note:text(s.note)};
    const translated=findTranslation(row);
    if(Object.hasOwn(s,'nameZh'))row.nameZh=text(s.nameZh).trim();
    else if(isForeignLanguage(row.lang)&&translated?.nameZh)row.nameZh=text(translated.nameZh);
    return row;
  });
}
export function toWireRows(rows) {
  return rows.map((s,index) => {
    if (!text(s.name).trim()) throw new Error(`第 ${index+1} 行歌名不能为空，请填写或删除这一行`);
    const lang=normalizeLanguage(s.lang);if(!LANGUAGES.includes(lang))throw new Error(`第 ${index+1} 行语种请选择国语、日语、韩语或英文`);
    return {...s,name:text(s.name).trim(),artist:text(s.artist).trim(),lang,sc:text(s.sc).trim()||'免费',tags:tagList(s.tags),cut:text(s.cut).trim(),note:text(s.note).trim(),...(Object.hasOwn(s,'nameZh')?{nameZh:text(s.nameZh).trim()}:{} )};
  });
}
