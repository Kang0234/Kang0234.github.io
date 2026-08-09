/**
 * kang0234 自建评论系统 v2 · 前端组件（账号系统版）
 * 功能：登录/自动注册弹窗、昵称锁定、回复、管理入口
 * 用法：<div id="kang-comments" data-path="/文章路径/"></div>
 */
(function () {
  'use strict';

  var CONFIG = {
    worker: 'https://comments.uyu.cc.cd',
    avatarBase: 'https://cravatar.cn/avatar/',
    defaultAvatar: '/image/avatar.jpg',
    adminUrl: 'https://comments.uyu.cc.cd/admin',
    siteKey: '0x4AAAAAAEEZt_u5vHWY-o10', // Cloudflare Turnstile Site Key
  };

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmt(ts) {
    var d = new Date(ts), now = new Date(), diff = (now - d) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400 && now.getDate() === d.getDate()) return Math.floor(diff / 3600) + ' 小时前';
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function html(text) {
    return esc(text).replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }
  function avatar(hash) { return hash ? CONFIG.avatarBase + hash + '?d=identicon' : CONFIG.defaultAvatar; }

  function getToken() { try { return localStorage.getItem('kc_token') || ''; } catch (e) { return ''; } }
  function setToken(t) { try { localStorage.setItem('kc_token', t); } catch (e) {} }
  function clearToken() { try { localStorage.removeItem('kc_token'); } catch (e) {} }

  function api(path, opt) {
    opt = opt || {};
    opt.headers = Object.assign({ 'Content-Type': 'application/json' }, opt.headers || {});
    var t = getToken();
    if (t) opt.headers['Authorization'] = 'Bearer ' + t;
    return fetch(CONFIG.worker + path, opt).then(function (r) { return r.json(); });
  }

  function init(el) {
    var path = el.getAttribute('data-path') || location.pathname;
    var me = null; // 当前用户
    el.classList.add('kc-root');
    el.innerHTML =
      '<div class="kc-panel">'
      + '<div class="kc-head">'
      + '<div class="kc-title">💬 评论 <span class="kc-title-note">期待你的小脚印</span></div>'
      + '<div class="kc-userbar"></div>'
      + '</div>'
      + '<form class="kc-form" autocomplete="off">'
      + '<textarea class="kc-input kc-content" maxlength="1000" rows="4" placeholder="登录后即可评论～" required disabled></textarea>'
      + '<div class="kc-turnstile"></div>'
      + '<div class="kc-form-foot">'
      + '<button type="submit" class="kc-submit" disabled><i class="fa fa-paper-plane"></i> 发表评论</button>'
      + '</div>'
      + '<div class="kc-msg"></div>'
      + '</form>'
      + '</div>'
      + '<div class="kc-list"></div>';

    var msg = el.querySelector('.kc-msg');
    var userbar = el.querySelector('.kc-userbar');
    var textarea = el.querySelector('.kc-content');
    var submitBtn = el.querySelector('.kc-submit');
    var tsBox = el.querySelector('.kc-turnstile');
    var tsWidget = null;

    /* ---------- Turnstile 人机验证（callback 记录 token，轮询等待就绪） ---------- */
    var tsToken = '';
    function renderTs() {
      if (tsWidget !== null || !window.turnstile) return;
      try {
        tsWidget = window.turnstile.render(tsBox, {
          sitekey: CONFIG.siteKey, theme: 'light', size: 'normal',
          callback: function (token) { tsToken = token; },
          'expired-callback': function () { tsToken = ''; },
          'error-callback': function () { tsToken = ''; }
        });
      } catch (e) { tsBox.innerHTML = '<span class="kc-ts-error">人机验证组件异常，请刷新页面</span>'; }
    }
    function loadTurnstile() {
      if (typeof window.turnstile !== 'undefined') { renderTs(); return; }
      var s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.defer = true;
      s.onerror = function () { tsBox.innerHTML = '<span class="kc-ts-error">人机验证加载失败，请刷新页面重试</span>'; };
      // 轮询等待 turnstile 就绪（不使用全局 onload 回调名，避免多实例冲突）
      var wait = 0;
      (function waitTs() {
        if (typeof window.turnstile !== 'undefined') { renderTs(); return; }
        if (wait++ < 40) setTimeout(waitTs, 200);
      })();
      document.head.appendChild(s);
    }
    loadTurnstile();

    function showMsg(text, isErr) {
      msg.textContent = text;
      msg.className = 'kc-msg' + (isErr ? ' kc-msg-err' : ' kc-msg-ok');
      msg.style.display = 'block';
      setTimeout(function () { msg.style.display = 'none'; }, 4000);
    }

    /* ---------- 用户状态条 ---------- */
    function renderUserbar() {
      if (!me) {
        userbar.innerHTML =
          '<button type="button" class="kc-login-btn"><i class="fa fa-user-circle-o"></i> 登录 / 注册</button>'
          + '<a class="kc-admin-link" href="' + CONFIG.adminUrl + '" target="_blank">管理后台</a>';
        textarea.disabled = true;
        textarea.placeholder = '登录后即可评论～';
        submitBtn.disabled = true;
        return;
      }
      userbar.innerHTML =
        '<span class="kc-me"><img class="kc-me-avatar" src="' + avatar(me.avatarHash) + '" onerror="this.src=\'' + CONFIG.defaultAvatar + '\'">'
        + '<b>' + esc(me.nickname) + '</b>'
        + (me.role === 'admin' ? '<em class="kc-admin-badge">管理员</em>' : '')
        + '<button type="button" class="kc-logout"><i class="fa fa-sign-out"></i> 退出</button></span>';
      textarea.disabled = false;
      textarea.placeholder = '写下你想说的话吧～';
      submitBtn.disabled = false;
    }

    /* ---------- 登录/注册弹窗 ---------- */
    function openModal() {
      if (document.querySelector('.kc-modal')) return;
      var m = document.createElement('div');
      m.className = 'kc-modal';
      m.innerHTML =
        '<div class="kc-modal-card">'
        + '<button type="button" class="kc-modal-close">&times;</button>'
        + '<h3 class="kc-modal-title">🌸 登录 / 注册</h3>'
        + '<p class="kc-modal-tip">没有账号？输入名称和密码提交后会自动注册并登录<br>（同一网络环境最多注册 4 个账号）</p>'
        + '<input type="text" class="kc-input kc-m-nick" maxlength="20" placeholder="名称（注册后不可修改）">'
        + '<input type="password" class="kc-input kc-m-pw" placeholder="密码（至少 6 位）">'
        + '<div class="kc-m-turnstile"></div>'
        + '<div class="kc-m-msg"></div>'
        + '<button type="button" class="kc-submit kc-m-submit"><i class="fa fa-sign-in"></i> 登录 / 注册</button>'
        + '</div>';
      document.body.appendChild(m);
      var nick = m.querySelector('.kc-m-nick');
      var pw = m.querySelector('.kc-m-pw');
      var mmsg = m.querySelector('.kc-m-msg');
      var mtsBox = m.querySelector('.kc-m-turnstile');
      var mtsWidget = null;
      setTimeout(function () { nick.focus(); }, 50);

      // 弹窗内 Turnstile（callback 记录 token，避免 getResponse 时序问题）
      var mtsToken = '';
      function renderMts() {
        if (mtsWidget !== null || !window.turnstile) return;
        try {
          mtsWidget = window.turnstile.render(mtsBox, {
            sitekey: CONFIG.siteKey, theme: 'light', size: 'normal',
            callback: function (token) { mtsToken = token; },
            'expired-callback': function () { mtsToken = ''; },
            'error-callback': function () { mtsToken = ''; }
          });
        }
        catch (e) { mtsBox.innerHTML = '<span class="kc-ts-error">人机验证组件异常，请刷新页面</span>'; }
      }
      // 轮询等待 turnstile 就绪（避免 onload 回调名冲突）
      var mtsWait = 0;
      (function waitTs() {
        if (typeof window.turnstile !== 'undefined') { renderMts(); return; }
        if (mtsWait++ < 30) setTimeout(waitTs, 200);
      })();

      function setMsg(t) { mmsg.textContent = t; mmsg.style.display = t ? 'block' : 'none'; }

      function doAuth() {
        var n = nick.value.trim();
        var p = pw.value;
        var tsToken = mtsToken || (window.turnstile && mtsWidget !== null ? window.turnstile.getResponse(mtsWidget) : '');
        if (!tsToken) { setMsg('请先完成人机验证～'); return; }
        if (!n) { setMsg('请输入名称'); return; }
        if (!p || p.length < 6) { setMsg('密码至少 6 位'); return; }
        var btn = m.querySelector('.kc-m-submit');
        btn.disabled = true; btn.innerHTML = '处理中…';
        api('/api/login', { method: 'POST', body: JSON.stringify({ nickname: n, password: p, turnstile: tsToken }) })
          .then(function (res) {
            btn.disabled = false; btn.innerHTML = '<i class="fa fa-sign-in"></i> 登录 / 注册';
            if (!res.ok) { setMsg(res.error || '登录失败'); if (window.turnstile && mtsWidget !== null) window.turnstile.reset(mtsWidget); return; }
            setToken(res.data.token);
            me = { id: res.data.id, email: res.data.email, nickname: res.data.nickname, role: res.data.role };
            m.remove();
            renderUserbar();
            showMsg('欢迎回来，' + res.data.nickname + '！🎉');
          })
          .catch(function () { btn.disabled = false; btn.innerHTML = '<i class="fa fa-sign-in"></i> 登录 / 注册'; setMsg('网络异常，请稍后再试'); });
      }

      m.querySelector('.kc-m-submit').addEventListener('click', doAuth);
      m.querySelector('.kc-modal-close').addEventListener('click', function () { m.remove(); });
      m.addEventListener('click', function (e) { if (e.target === m) m.remove(); });
      pw.addEventListener('keydown', function (e) { if (e.key === 'Enter') doAuth(); });
    }

    userbar.addEventListener('click', function (e) {
      if (e.target.closest('.kc-login-btn')) openModal();
      if (e.target.closest('.kc-logout')) {
        api('/api/logout', { method: 'POST' }).catch(function () {});
        clearToken(); me = null; renderUserbar();
      }
    });

    /* ---------- 加载评论 ---------- */
    function loadComments() {
      fetch(CONFIG.worker + '/api/comments?path=' + encodeURIComponent(path))
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (!res.ok) { el.querySelector('.kc-list').innerHTML = '<div class="kc-empty kc-error">😢 评论加载失败，请稍后再试</div>'; return; }
          renderList(res.data || []);
        })
        .catch(function () { el.querySelector('.kc-list').innerHTML = '<div class="kc-empty kc-error">😢 评论加载失败，请稍后再试</div>'; });
    }

    function renderList(list) {
      var wrap = el.querySelector('.kc-list');
      if (!list.length) { wrap.innerHTML = '<div class="kc-empty">🫧 还没有评论，来抢个沙发吧～</div>'; return; }
      var byId = {};
      list.forEach(function (c) { byId[c.id] = c; });
      var out = '';
      list.forEach(function (c) {
        var replyName = c.reply_to && byId[c.reply_to] ? byId[c.reply_to].nickname : '';
        out += '<div class="kc-item" data-id="' + c.id + '">'
          + '<img class="kc-avatar" src="' + avatar(c.avatarHash) + '" alt="' + esc(c.nickname) + '" onerror="this.src=\'' + CONFIG.defaultAvatar + '\'">'
          + '<div class="kc-body">'
          + '<div class="kc-meta"><span class="kc-name">' + esc(c.nickname) + '</span>'
          + '<span class="kc-time">' + fmt(c.created_at) + '</span></div>'
          + '<div class="kc-content">' + (replyName ? '<span class="kc-reply-tag">回复 @' + esc(replyName) + '</span> ' : '') + html(c.content) + '</div>'
          + '<div class="kc-actions"><a href="javascript:;" class="kc-reply-btn" data-id="' + c.id + '" data-name="' + esc(c.nickname) + '"><i class="fa fa-reply"></i> 回复</a></div>'
          + '</div></div>';
      });
      wrap.innerHTML = out;
    }

    /* ---------- 提交评论 ---------- */
    el.querySelector('.kc-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!me) { openModal(); return; }
      var content = textarea.value.trim();
      if (!content) { showMsg('评论内容不能为空～', true); return; }
      var token = tsToken || (window.turnstile && tsWidget !== null ? window.turnstile.getResponse(tsWidget) : '');
      if (!token) { showMsg('请先完成人机验证～', true); return; }
      var btn = submitBtn;
      btn.disabled = true; btn.innerHTML = '提交中…';
      api('/api/comments', {
        method: 'POST',
        body: JSON.stringify({ path: path, content: content, reply_to: el.getAttribute('data-reply') ? parseInt(el.getAttribute('data-reply')) : null, turnstile: token }),
      }).then(function (res) {
        btn.disabled = false; btn.innerHTML = '<i class="fa fa-paper-plane"></i> 发表评论';
        if (!res.ok) { showMsg(res.error || '提交失败', true); if (window.turnstile && tsWidget !== null) window.turnstile.reset(tsWidget); return; }
        showMsg('评论成功啦！🎉');
        el.setAttribute('data-reply', '');
        textarea.value = '';
        if (window.turnstile && tsWidget !== null) window.turnstile.reset(tsWidget);
        loadComments();
      }).catch(function () {
        btn.disabled = false; btn.innerHTML = '<i class="fa fa-paper-plane"></i> 发表评论';
        showMsg('网络异常，请稍后再试', true);
      });
    });

    /* ---------- 回复 ---------- */
    el.addEventListener('click', function (e) {
      var btn = e.target.closest('.kc-reply-btn');
      if (!btn) return;
      if (!me) { openModal(); return; }
      el.setAttribute('data-reply', btn.getAttribute('data-id'));
      var note = el.querySelector('.kc-title-note');
      note.textContent = '回复 @' + btn.getAttribute('data-name') + '（点击取消）';
      note.style.cursor = 'pointer';
      note.onclick = function () {
        el.setAttribute('data-reply', '');
        note.textContent = '期待你的小脚印';
        note.onclick = null;
      };
      textarea.focus();
    });

    /* ---------- 启动：检查登录态 ---------- */
    api('/api/me').then(function (res) {
      if (res.ok) me = res.data;
      renderUserbar();
      loadComments();
    }).catch(function () { renderUserbar(); loadComments(); });
  }

  function boot() {
    document.querySelectorAll('#kang-comments, .kang-comments').forEach(function (el) {
      if (!el.getAttribute('data-kc-init')) {
        el.setAttribute('data-kc-init', '1');
        init(el);
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
