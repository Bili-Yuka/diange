// 歌单后台 API（Cloudflare Worker）
// 功能：账号密码登录 + 读写 GitHub 仓库里的 data/songs.json
// 部署：见 CLOUDFLARE_DEPLOY.md
// 环境变量（Secrets）：
//   ADMIN_USER     管理员账号
//   ADMIN_PASS     管理员密码
//   SESSION_SECRET 会话签名密钥（任意长随机字符串）
//   GITHUB_TOKEN   有 diange 仓库 Contents 读写权限的 PAT
//   GITHUB_REPO    仓库，例如 Bili-Yuka/diange
//
function b64(s) {
  return btoa(unescape(encodeURIComponent(s)));
}
function b64d(s) {
  try { return decodeURIComponent(escape(atob(s))); }
  catch (e) {
    var bin = atob(s), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }
}
async function sign(secret, payload) {
  var key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  var sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
}
function jsonBody(req) {
  return req.json().catch(function () { return {}; });
}
function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function resp(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: Object.assign({ "Content-Type": "application/json" }, headers)
  });
}

export default {
  async fetch(req, env) {
    var url = new URL(req.url);
    var origin = req.headers.get("Origin") || "*";
    var h = cors(origin);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: h });
    }

    var gh = function (method, path, body) {
      var opts = {
        method: method,
        headers: {
          "User-Agent": "song-manage-worker",
          "Authorization": "Bearer " + env.GITHUB_TOKEN,
          "Accept": "application/vnd.github+json"
        }
      };
      if (body) {
        opts.headers["Content-Type"] = "application/json";
        opts.body = JSON.stringify(body);
      }
      return fetch("https://api.github.com" + path, opts);
    };

    // ---------- 登录 ----------
    if (url.pathname === "/api/login" && req.method === "POST") {
      var cred = await jsonBody(req);
      if (cred.username === env.ADMIN_USER && cred.password === env.ADMIN_PASS) {
        var exp = Math.floor(Date.now() / 1000) + 12 * 3600;
        var payload = env.ADMIN_USER + ":" + exp;
        var token = payload + "." + (await sign(env.SESSION_SECRET, payload));
        return resp({ token: token, expires_in: 12 * 3600 }, 200, h);
      }
      return resp({ error: "账号或密码错误" }, 401, h);
    }

    // ---------- 校验会话 ----------
    var auth = req.headers.get("Authorization") || "";
    var t = auth.indexOf("Bearer ") === 0 ? auth.slice(7) : "";
    var parts = t.split(".");
    if (parts.length !== 2) {
      return resp({ error: "未登录或会话无效" }, 401, h);
    }
    var payload = parts[0], sig = parts[1];
    var expected = await sign(env.SESSION_SECRET, payload);
    var seg = payload.split(":");
    var expired = !(seg.length === 2 && parseInt(seg[1], 10) > Math.floor(Date.now() / 1000));
    if (seg[0] !== env.ADMIN_USER || sig !== expected || expired) {
      return resp({ error: "登录已过期，请重新登录" }, 401, h);
    }

    // ---------- 读取歌单 ----------
    if (url.pathname === "/api/songs" && req.method === "GET") {
      var g1 = await gh("GET", "/repos/" + env.GITHUB_REPO + "/contents/data/songs.json");
      if (g1.status === 404) {
        return resp({ error: "仓库中没有 data/songs.json，请先在本地推送一次" }, 404, h);
      }
      if (!g1.ok) {
        return resp({ error: "GitHub 读取失败（HTTP " + g1.status + "），请检查 GITHUB_TOKEN 与 GITHUB_REPO" }, 502, h);
      }
      var d1 = await g1.json();
      return resp({ sha: d1.sha, content: JSON.parse(b64d(d1.content)) }, 200, h);
    }

    // ---------- 保存歌单 ----------
    if (url.pathname === "/api/songs" && req.method === "PUT") {
      var body = await jsonBody(req);
      if (!body || !body.songs || !Array.isArray(body.songs)) {
        return resp({ error: "请求缺少 songs 数组" }, 400, h);
      }
      var g2 = await gh("GET", "/repos/" + env.GITHUB_REPO + "/contents/data/songs.json");
      if (!g2.ok) {
        return resp({ error: "GitHub 读取失败（HTTP " + g2.status + "）" }, 502, h);
      }
      var cur = await g2.json();
      var put = await gh("PUT", "/repos/" + env.GITHUB_REPO + "/contents/data/songs.json", {
        message: "更新歌单（账号密码后台）",
        content: b64(JSON.stringify(body.songs, null, 2)),
        sha: cur.sha
      });
      if (put.status === 200 || put.status === 201) {
        return resp({ ok: true, message: "已保存，GitHub Pages 约 1 分钟后自动更新" }, 200, h);
      }
      return resp({ error: "GitHub 写入失败（HTTP " + put.status + "）" }, 502, h);
    }

    return resp({ error: "Not Found" }, 404, h);
  }
};
