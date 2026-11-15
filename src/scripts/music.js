(() => {
  // Keep the YouTube player visible during playback; no hidden audio extraction.
  const translations = {
    vi: { music: 'Nhạc cưới', close: 'Đóng nhạc', title: 'Một giai điệu cho ngày chung đôi ♡', open: 'Mở trên YouTube ↗' },
    en: { music: 'Wedding music', close: 'Close music', title: 'A melody for our wedding day ♡', open: 'Open on YouTube ↗' },
    'zh-TW': { music: '婚禮音樂', close: '關閉音樂', title: '為幸福的日子，獻上一首歌 ♡', open: '在 YouTube 開啟 ↗' },
  };
  const widget = document.createElement('aside'); widget.className = 'music-widget';
  widget.innerHTML = '<button type="button" class="music-toggle" aria-expanded="false" aria-controls="music-panel"><span aria-hidden="true">♫</span><span class="music-label"></span></button><div id="music-panel" class="music-panel" hidden><div class="music-panel-head"><span class="music-title"></span><button type="button" class="music-close">×</button></div><div class="music-player"></div><a href="https://www.youtube.com/watch?v=kybwR66y0f4" target="_blank" rel="noopener noreferrer"></a></div>';
  document.body.append(widget);
  const toggle = widget.querySelector('.music-toggle'), panel = widget.querySelector('.music-panel'), player = widget.querySelector('.music-player');
  let open = false;
  function translate() {
    const c = translations[document.documentElement.lang] || translations.vi;
    widget.querySelector('.music-label').textContent = open ? c.close : c.music;
    widget.querySelector('.music-title').textContent = c.title;
    widget.querySelector('.music-close').setAttribute('aria-label', c.close);
    widget.querySelector('a').textContent = c.open;
    player.querySelector('iframe')?.setAttribute('title', c.music);
  }
  function setOpen(value) {
    open = value; panel.hidden = !open; toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      const iframe = document.createElement('iframe');
      // Browsers may still require tapping Play inside the visible player.
      iframe.src = 'https://www.youtube-nocookie.com/embed/kybwR66y0f4?autoplay=1&playsinline=1&loop=1&playlist=kybwR66y0f4&rel=0';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allowFullscreen = true; player.replaceChildren(iframe);
    } else player.replaceChildren();
    translate();
  }
  toggle.addEventListener('click', () => setOpen(!open));
  widget.querySelector('.music-close').addEventListener('click', () => { setOpen(false); toggle.focus(); });
  widget.addEventListener('keydown', event => { if (event.key === 'Escape' && open) { setOpen(false); toggle.focus(); } });
  new MutationObserver(translate).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  translate();
})();