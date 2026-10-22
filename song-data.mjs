const text = value => String(value ?? '');
const tagList = value => (Array.isArray(value) ? value : text(value).split(/[|｜,，、;；]/)).map(text).map(s => s.trim()).filter(Boolean);
export function publicSongs(input) {
  const list = Array.isArray(input) ? input : input?.songs;
  if (!Array.isArray(list)) throw new Error('歌单格式不正确，请联系主播检查');
  const seen = new Map();
  return list.filter(s => text(s.name).trim()).map(s => {
    const key = Array.from(new TextEncoder().encode(text(s.name) + '\0' + text(s.artist)), b => b.toString(16).padStart(2, '0')).join('');
    const count = seen.get(key) || 0; seen.set(key, count + 1);
    const sc = text(s.sc).trim();
    return {id:`s-${key}-${count}`,title:text(s.name),artist:text(s.artist),language:text(s.lang)||'未分类',category:!sc||sc==='免费'||sc==='0'?'免费':/^\d+(\.\d+)?$/.test(sc)?`${sc}SC`:sc,tags:tagList(s.tags),note:text(s.note),cut:text(s.cut),updatedAt:'',featured:false};
  });
}
export function toEditorRows(input) {
  if (!Array.isArray(input)) throw new Error('歌单格式不正确');
  return input.map(s => ({...s,name:text(s.name),artist:text(s.artist),lang:text(s.lang),sc:text(s.sc)||'免费',tags:tagList(s.tags).join('|'),cut:text(s.cut),note:text(s.note)}));
}
export function toWireRows(rows) {
  return rows.map((s,index) => {
    if (!text(s.name).trim()) throw new Error(`第 ${index+1} 行歌名不能为空，请填写或删除这一行`);
    return {...s,name:text(s.name).trim(),artist:text(s.artist).trim(),lang:text(s.lang).trim(),sc:text(s.sc).trim()||'免费',tags:tagList(s.tags),cut:text(s.cut).trim(),note:text(s.note).trim()};
  });
}
