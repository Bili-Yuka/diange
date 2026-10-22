// 公开配置，可随网页上传；这里不存放账号密码或访问令牌。
export const SITE = {
  name:'柚夏 Yuka',
  subtitle:'把喜欢的歌，唱给刚好遇见的你。',
  description:'欢迎来到小柚的点歌小站。挑一首喜欢的歌，让我们在旋律里见面吧。',
  announcement:'点击歌名即可复制点歌口令，再粘贴到直播间弹幕。点歌请以当场直播安排为准哦。',
  requestFormat:'点歌 {歌名}',
  liveUrl:'',liveLabel:'前往直播间',schedule:'唱唱歌，也聊聊天',demo:false,
  rules:'点击歌名，复制「点歌 歌名」。\n回到直播间，将口令粘贴到弹幕发送。\n数字 SC 标签代表点歌价格，请以当场直播说明为准。'
};
export const API_BASE = 'https://song-manage-api.2728312464.workers.dev';
