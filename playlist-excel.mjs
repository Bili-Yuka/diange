import {toWireRows,normalizeLanguage,LANGUAGES} from './song-data.mjs?v=20261027-studio';

export const EXCEL_HEADERS=['曲名','中文译名','原唱','语种','SC点歌','标签','歌切','备注'];
export function workbookRows(rows){return [EXCEL_HEADERS,...toWireRows(rows).map(s=>[s.name,Object.hasOwn(s,'nameZh')?s.nameZh:null,s.artist,s.lang,s.sc,s.tags.join('|'),s.cut,s.note])];}
const aliases={name:['曲名','歌名','歌曲','title','name'],nameZh:['中文译名','中文名','译名','翻译名','namezh','titlezh','translation'],artist:['原唱','歌手','演唱','artist'],lang:['语种','语言','lang','language'],sc:['sc点歌','sc','点歌价格','价格','分类','category'],tags:['标签','风格','tags'],cut:['歌切','cut'],note:['备注','说明','note']};
const normalizeHeader=value=>String(value).trim().toLowerCase().replace(/[\s_\-]/g,'');
function cellText(value){if(value==null)return '';if(typeof value==='object'){if(value.richText)return value.richText.map(part=>part.text).join('');if(value.text!=null)return String(value.text);if(value.result!=null)return cellText(value.result);return '';}return String(value);}
export function parseSheet(sheet){
 let mapping;const parsed=[];
 sheet.eachRow(row=>{
  const rawValues=row.values.slice(1),values=rawValues.map(cellText);
  if(!values.some(value=>value.trim()))return;
  if(!mapping){mapping=values.map(value=>Object.keys(aliases).find(field=>aliases[field].some(alias=>normalizeHeader(alias)===normalizeHeader(value)))||'');if(!mapping.includes('name'))throw new Error('首行需要包含“曲名”或“歌名”表头');return;}
  if(parsed.length>=5000)throw new Error('一次最多导入 5000 首歌曲');
  const song={name:'',artist:'',lang:'国语',sc:'免费',tags:'',cut:'',note:''};
  mapping.forEach((field,index)=>{if(field){if(field==='nameZh'&&rawValues[index]==null)return;song[field]=values[index]?.trim()||'';}});
  if(!song.name)throw new Error(`Excel 第 ${row.number} 行没有歌名，请补全后再导入`);
  song.lang=normalizeLanguage(song.lang);
  if(!LANGUAGES.includes(song.lang))throw new Error(`Excel 第 ${row.number} 行语种请选择国语、日语、韩语或英文`);
  parsed.push(song);
 });
 if(!parsed.length)throw new Error('表格中没有歌曲');
 return parsed;
}
