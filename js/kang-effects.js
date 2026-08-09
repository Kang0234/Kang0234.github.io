/* ============================================================
   🌸 kang0234 二次元深度美化 JS
   樱花飘落 · 图墙灯箱
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 樱花飘落 ---------- */
  function startSakura() {
    var canvas = document.createElement('canvas');
    canvas.id = 'sakura-canvas';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    var petals = [];
    // 性能优化：移动端减半；尊重 prefers-reduced-motion 直接不渲染
    var isMobile = window.matchMedia('(max-width: 768px)').matches;
    var prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var COUNT = prefersReduce ? 0 : (isMobile ? 10 : 22);
    var colors = [
      'rgba(255,183,213,', 'rgba(255,209,220,',
      'rgba(255,154,192,', 'rgba(255,230,238,'
    ];

    function makePetal(initial) {
      return {
        x: Math.random() * canvas.width,
        y: initial ? Math.random() * canvas.height : -20,
        r: 6 + Math.random() * 9,
        vy: 0.8 + Math.random() * 1.4,
        vx: -0.6 + Math.random() * 1.2,
        rot: Math.random() * Math.PI * 2,
        vr: -0.03 + Math.random() * 0.06,
        sway: Math.random() * 0.6,
        swaySpeed: 0.004 + Math.random() * 0.008,
        color: colors[Math.floor(Math.random() * colors.length)]
      };
    }

    for (var i = 0; i < COUNT; i++) {
      petals.push(makePetal(true));
    }

    function drawPetal(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      // 五瓣樱花简化形
      ctx.moveTo(0, -p.r);
      ctx.bezierCurveTo(p.r * 0.7, -p.r * 0.5, p.r * 0.7, p.r * 0.5, 0, p.r);
      ctx.bezierCurveTo(-p.r * 0.7, p.r * 0.5, -p.r * 0.7, -p.r * 0.5, 0, -p.r);
      ctx.fillStyle = p.color + (0.55 + Math.random() * 0.2) + ')';
      ctx.fill();
      ctx.restore();
    }

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < petals.length; i++) {
        var p = petals[i];
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.sway) * 0.5;
        p.sway += p.swaySpeed;
        p.rot += p.vr;
        if (p.y > canvas.height + 30) {
          petals[i] = makePetal(false);
        }
        drawPetal(p);
      }
      requestAnimationFrame(loop);
    }
    loop();
  }

  /* ---------- 图墙灯箱 ---------- */
  function initAlbumLightbox() {
    // 事件委托：图墙 24 张、随机图床图、文章正文图、首页封面图都能点开详情+下载
    var box = document.createElement('div');
    box.className = 'album-lightbox';
    var img = document.createElement('img');
    // 详情面板
    var detail = document.createElement('div');
    detail.className = 'album-detail';
    var dSource = document.createElement('span');
    dSource.className = 'album-detail-src';
    var dSize = document.createElement('span');
    dSize.className = 'album-detail-size';
    detail.appendChild(dSource);
    detail.appendChild(dSize);
    // 下载按钮
    var dl = document.createElement('a');
    dl.className = 'album-download';
    dl.innerHTML = '<i class="fa fa-download"></i> 下载';
    dl.href = '#';
    box.appendChild(img);
    box.appendChild(detail);
    box.appendChild(dl);
    document.body.appendChild(box);

    // 图床名识别
    function sourceName(url) {
      if (url.indexOf('sinaimg.cn') > -1) return '来源：新浪微博 CDN';
      if (url.indexOf('anosu.top') > -1) return '来源：Anosu 图床';
      if (url.indexOf('loliapi.com') > -1) return '来源：洛丽图床';
      if (url.indexOf('paugram.com') > -1) return '来源：Paugram 壁纸';
      if (url.indexOf('dmoe.cc') > -1) return '来源：萌图站';
      if (url.indexOf('image.baidu.com') > -1) return '来源：百度图库';
      return '来源：二次元图床';
    }

    // 图床无 CORS 头（新浪/anosu 均无），跨域一键保存被浏览器限制；
    // 下载按钮在新标签页打开原图，右键"图片另存为"即可保存
    function doDownload(url) {
      var a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { a.remove(); }, 500);
    }

    img.addEventListener('load', function () {
      var n = img.naturalWidth;
      var h = img.naturalHeight;
      dSize.textContent = '尺寸：' + n + ' × ' + h;
    });

    dl.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (img.src) doDownload(img.src);
    });

    // 打开灯箱
    function openLightbox(el) {
      var src = el.currentSrc || el.src;
      // 懒加载图真实地址在 data-src
      var ds = el.getAttribute('data-src');
      if (ds) src = ds;
      if (!src || src === location.href) return;
      img.src = src;
      dSource.textContent = sourceName(src);
      dSize.textContent = '尺寸：加载中…';
      box.classList.add('show');
    }

    // 白名单区域内的图片可点开
    function allowed(el) {
      if (el.id === 'random-acg-img') return true;
      return !!(el.closest && el.closest('.album-item, .entry-content, .post-thumb, .pattern-center'));
    }

    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.tagName === 'IMG' && allowed(t)) {
        e.preventDefault();
        e.stopPropagation();
        openLightbox(t);
      }
    });

    // 图墙项 hover 指针
    document.querySelectorAll('.album-item img').forEach(function (el) {
      el.style.cursor = 'zoom-in';
    });

    box.addEventListener('click', function (e) {
      if (e.target === box) box.classList.remove('show');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') box.classList.remove('show');
    });
  }

  /* ---------- 开放图床随机图 ---------- */
  function initRandomAcg() {
    var img = document.getElementById('random-acg-img');
    var btn = document.getElementById('random-acg-btn');
    if (!img || !btn) return;
    var link = document.getElementById('random-acg-link');
    var size = document.getElementById('random-acg-size');
    var dbtn = document.getElementById('random-acg-download');

    // 18+ 二次元 CDN 图床（anosu r18，img 直连无需 CORS）
    var sources = [
      function() { return 'https://api.anosu.top/img?r18=1&t=' + Date.now(); },
      function() { return 'https://api.anosu.top/img?r18=1&size=1920x1080&t=' + Date.now(); },
      function() { return 'https://api.anosu.top/img?r18=1&size=2560x1440&t=' + Date.now(); }
    ];

    function load() {
      var fn = sources[Math.floor(Math.random() * sources.length)];
      var pre = new Image();
      pre.onload = function() { img.src = pre.src; };
      pre.onerror = function() { load(); };  // 失败重试
      pre.src = fn();
    }

    // 更新来源链接/尺寸
    img.addEventListener('load', function () {
      btn.classList.remove('loading');
      if (size) size.innerHTML = '<i class="fa fa-expand"></i> 尺寸：' + img.naturalWidth + ' × ' + img.naturalHeight;
      var src = img.currentSrc || img.src;
      if (link && src) { link.href = src; }
    });

    // 下载：新标签打开原图（图床无 CORS，右键另存）
    if (dbtn) {
      dbtn.addEventListener('click', function (e) {
        e.preventDefault();
        var src = img.currentSrc || img.src;
        if (!src) return;
        var a = document.createElement('a');
        a.href = src;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { a.remove(); }, 500);
      });
    }

    btn.addEventListener('click', function() {
      btn.classList.add('loading');
      load();
    });
    // 初始加载后更新一次
    img.addEventListener('load', function() { btn.classList.remove('loading'); });
  }


  /* ---------- 顶部阅读进度条 ---------- */
  function initReadingProgress() {
    var bar = document.createElement('div');
    bar.className = 'reading-progress';
    document.body.appendChild(bar);
    function update() {
      var doc = document.documentElement;
      var h = doc.scrollHeight - doc.clientHeight;
      var pct = h > 0 ? (window.scrollY / h) * 100 : 0;
      bar.style.width = Math.min(pct, 100) + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ---------- 粉色悬浮首页按钮 ---------- */
  function initGoTop() {
    var btn = document.createElement('div');
    btn.className = 'kang-gotop';
    btn.innerHTML = '<i class="fa fa-arrow-up"></i>';
    btn.title = '回到顶部';
    document.body.appendChild(btn);
    window.addEventListener('scroll', function () {
      if (window.scrollY > 400) btn.classList.add('show');
      else btn.classList.remove('show');
    }, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- 代码块复制按钮 ---------- */
  function initCodeCopy() {
    if (!window.Clipboard) return;
    var pres = document.querySelectorAll('.entry-content pre');
    pres.forEach(function (pre) {
      if (pre.querySelector('.kang-copy')) return;
      var btn = document.createElement('button');
      btn.className = 'kang-copy';
      btn.textContent = '复制';
      btn.type = 'button';
      pre.appendChild(btn);
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var code = pre.querySelector('code');
        var text = code ? code.innerText : pre.innerText;
        Clipboard.writeText(text).then(function () {
          btn.textContent = '已复制 ✓';
          setTimeout(function () { btn.textContent = '复制'; }, 1800);
        }, function () {
          btn.textContent = '失败';
          setTimeout(function () { btn.textContent = '复制'; }, 1800);
        });
      });
    });
  }


  /* ---------- 移动端返回按钮 ---------- */
  function initBack() {
    var btn = document.createElement('div');
    btn.className = 'kang-back';
    btn.innerHTML = '<i class="fa fa-home" aria-hidden="true"></i>';
    btn.title = '回到首页';
    document.body.appendChild(btn);
    btn.addEventListener('click', function () {
      if (history.length > 1) history.back();
      else location.href = '/';
    });
  }

  /* ---------- 启动 ---------- */
  function init() {
    if (window.innerWidth > 640) {
      startSakura();
    }
    initAlbumLightbox();
    initRandomAcg();
    initReadingProgress();
    initGoTop();
    initCodeCopy();
    initBack();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


/* 全卡片鼠标 3D 跟随转动（事件委托 + 360 等旧内核 2D 降级） */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var supports3D = (function () {
    var el = document.createElement('div');
    el.style.transformStyle = 'preserve-3d';
    return el.style.transformStyle === 'preserve-3d';
  })();
  var SEL = '.top-feature-v2 .the-feature, #primary article.post, .cat-card, .album-item, .post-squares.nextprev, .post-footer';
  var current = null;

  function resetCard(c) {
    if (!c) return;
    c.style.transform = '';
    c.classList.remove('tilt-hover');
  }

  // 进入卡片：只切换一次（避免鼠标微动反复触发浮层动画）
  document.addEventListener('mouseover', function (e) {
    var card = e.target.closest ? e.target.closest(SEL) : null;
    if (!card) return;
    if (current === card) return;
    resetCard(current);
    current = card;
    card.classList.add('tilt-hover');
  });

  // 移出卡片：关闭浮层并复位（双重确认，3D 旋转中边界变化不误判）
  document.addEventListener('mouseout', function (e) {
    if (!current) return;
    var to = e.relatedTarget;
    if (to && current.contains(to)) return;
    // 二次确认：鼠标当前位置仍落在卡片上则不移除
    try {
      var at = document.elementFromPoint(e.clientX, e.clientY);
      if (at && current.contains(at)) return;
    } catch (err) {}
    resetCard(current);
    current = null;
  });

  // 触摸设备：点按卡片切换浮层显示（无 hover）
  // 直接监听 touchend（触摸事件必然触发），click 用时间戳去重避免双触发
  var lastTapTime = 0;
  function toggleCard(card) {
    if (!card) return;
    if (card.classList.contains('tilt-hover')) {
      card.classList.remove('tilt-hover');
      if (current === card) current = null;
    } else {
      resetCard(current);
      current = card;
      card.classList.add('tilt-hover');
    }
  }
  // 移动端点按：第一次轻触展开信息浮层（不跳转）；浮层展开后再次点击卡片任意处进入页面
  document.addEventListener('touchend', function (e) {
    var card = e.target && e.target.closest ? e.target.closest('.top-feature-v2 .the-feature') : null;
    if (!card) return;
    if (e.target.closest('.dash-cta') || e.target.closest('.dash-links')) return;
    var now = Date.now();
    if (now - lastTapTime < 400) return; // 去重
    lastTapTime = now;
    if (card.classList.contains('tilt-hover')) {
      // 已展开：不拦截，让 a 链接跳转进入页面
      return;
    }
    e.preventDefault();
    toggleCard(card);
  }, true);
  // click 兜底：已展开时点卡片直接跳转
  document.addEventListener('click', function (e) {
    var card = e.target && e.target.closest ? e.target.closest('.top-feature-v2 .the-feature') : null;
    if (!card) return;
    if (e.target.closest('.dash-cta') || e.target.closest('.dash-links')) return;
    var now = Date.now();
    if (now - lastTapTime < 400) return; // touchend 已处理
    lastTapTime = now;
    if (card.classList.contains('tilt-hover')) return; // 已展开：让 a 跳转
    e.preventDefault();
    toggleCard(card);
  }, true);

  // 卡片内移动：只更新 3D 旋转，不碰浮层
  document.addEventListener('mousemove', function (e) {
    if (!current) return;
    var r = current.getBoundingClientRect();
    var px = (e.clientX - r.left) / r.width - 0.5;
    var py = (e.clientY - r.top) / r.height - 0.5;
    if (supports3D) {
      current.style.transform = 'rotateY(' + (px * 10).toFixed(2) + 'deg) rotateX(' + (-py * 8).toFixed(2) + 'deg) translateY(-3px)';
    } else {
      // 360 等不支持 preserve-3d：2D 轻倾斜兜底
      current.style.transform = 'rotate(' + (px * 2.5).toFixed(2) + 'deg) translateY(-3px) scale(1.015)';
    }
  });
})();

/* 移动端导航条：三条杠开/关侧滑菜单（开→X），点外面退出 */
(function () {
  var btn = document.getElementById('mobile-menu-btn');
  if (!btn) return;

  function setMenu(open) {
    document.body.classList.toggle('navOpen', open);
    document.querySelectorAll('#main-container, #mo-nav, .openNav').forEach(function (el) { el.classList.toggle('open', open); });
    btn.classList.toggle('active', open);
  }
  btn.addEventListener('click', function () {
    setMenu(!document.body.classList.contains('navOpen'));
  });
  // 点击菜单外部（主内容区域/遮罩）关闭
  document.addEventListener('click', function (e) {
    if (!document.body.classList.contains('navOpen')) return;
    var inMenu = e.target.closest('#mo-nav');
    var inBtn = e.target.closest('.mob-menu-btn');
    if (!inMenu && !inBtn) setMenu(false);
  });
})();


/* ---------- 图片加载：全部走本地（稳定，不依赖 CDN） ---------- */
(function () {
  return; // 图片已在 GitHub Pages 本地部署，本地路径最快最稳
  var CDN = 'https://kang0234.github.io'; // GitHub Pages CDN（Fastly 边缘，实测 0.5s）
  var TIMEOUT = 4000;            // 4 秒未加载成功则回退本地

  function isLocal(p) {
    return p && (p.indexOf('/images/') === 0 || p.indexOf('/image/') === 0);
  }
  function isCdn(p) {
    return p && p.indexOf(CDN) === 0;
  }

  var tracked = [];

  function tryLoad(img) {
    if (img.getAttribute('data-cdn-done') === '1') return;
    img.setAttribute('data-cdn-done', '1');
    var src = img.getAttribute('src') || '';
    var ds = img.getAttribute('data-src') || '';
    var local = isLocal(src) ? src : (isLocal(ds) ? ds : null);
    if (!local) return;
    var cdn = CDN + local;

    // 换成 CDN 地址（src 或 data-src）
    if (isLocal(src)) img.setAttribute('src', cdn);
    if (isLocal(ds)) img.setAttribute('data-src', cdn);

    // 加载失败立即回退本地
    img.addEventListener('error', function () {
      var s2 = img.getAttribute('src') || '';
      var d2 = img.getAttribute('data-src') || '';
      if (isCdn(s2)) img.setAttribute('src', s2.replace(CDN, ''));
      if (isCdn(d2)) img.setAttribute('data-src', d2.replace(CDN, ''));
    }, { once: true });

    tracked.push(img);
  }

  // 初始扫描
  document.querySelectorAll('img').forEach(tryLoad);

  // 4 秒后：已开始加载但失败的（complete 且无尺寸）回退本地
  setTimeout(function () {
    tracked.forEach(function (img) {
      var s = img.getAttribute('src') || '';
      if (isCdn(s) && img.complete === true && img.naturalWidth === 0) {
        img.setAttribute('src', s.replace(CDN, ''));
      }
    });
  }, TIMEOUT);

  // 懒加载/动态加入的图片（MutationObserver 监听 DOM 变化）
  if (window.MutationObserver) {
    var mo = new MutationObserver(function () {
      document.querySelectorAll('img').forEach(tryLoad);
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }
})();

/* 移动端分享按钮：点击展开全部分享方式 */
(function () {
  var btn = document.getElementById('shareMobileBtn');
  if (!btn) return;
  var wrap = btn.closest('.share-mobile-wrap');
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    wrap.classList.toggle('open');
  });
  document.addEventListener('click', function (e) {
    if (wrap.classList.contains('open') && !wrap.contains(e.target)) {
      wrap.classList.remove('open');
    }
  });
})();
