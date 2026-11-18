(() => {
  const translations = {
    vi: ['Bật nhạc', 'Tắt nhạc'],
    en: ['Play music', 'Pause music'],
    'zh-TW': ['播放音樂', '暫停音樂'],
  };
  const music = new Audio('assets/music/Beo_dat_may_troi.mp3');
  music.loop = true;
  music.volume = 0.35;
  music.preload = 'none';

  const preferenceKey = 'wedding-music-paused';
  let pausedByGuest = false;
  try { pausedByGuest = sessionStorage.getItem(preferenceKey) === 'true'; } catch {}

  const widget = document.createElement('aside');
  widget.className = 'music-widget';
  widget.innerHTML = '<button type="button" class="music-toggle"><span aria-hidden="true">♫</span><span class="music-label"></span></button>';
  document.body.append(widget);
  const toggle = widget.querySelector('button');
  const label = widget.querySelector('.music-label');

  function updateToggle() {
    const labels = translations[document.documentElement.lang] || translations.vi;
    label.textContent = labels[music.paused ? 0 : 1];
  }

  function playMusic() {
    music.play().catch(updateToggle);
  }

  toggle.addEventListener('click', () => {
    pausedByGuest = !music.paused;
    try { sessionStorage.setItem(preferenceKey, String(pausedByGuest)); } catch {}
    if (pausedByGuest) music.pause();
    else playMusic();
  });
  music.addEventListener('play', updateToggle);
  music.addEventListener('pause', updateToggle);
  new MutationObserver(updateToggle).observe(document.documentElement, { attributeFilter: ['lang'] });
  updateToggle();
  if (!pausedByGuest) playMusic();

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let audioContext;
  function playClick() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      audioContext ||= new AudioContext();
      if (audioContext.state !== 'running') audioContext.resume().catch(() => {});
      const start = audioContext.currentTime;
      const tone = audioContext.createOscillator();
      const volume = audioContext.createGain();
      tone.frequency.setValueAtTime(720, start);
      tone.frequency.exponentialRampToValueAtTime(440, start + 0.085);
      volume.gain.setValueAtTime(0.045, start);
      volume.gain.exponentialRampToValueAtTime(0.001, start + 0.11);
      tone.connect(volume).connect(audioContext.destination);
      tone.start(start);
      tone.stop(start + 0.11);
    } catch {
      // Audio availability must not affect the button action.
    }
  }

  function retryMusic(event) {
    if (!pausedByGuest && music.paused && !toggle.contains(event.target)) playMusic();
  }
  document.addEventListener('keydown', retryMusic, true);
  document.addEventListener('click', event => {
    retryMusic(event);
    const control = event.target.closest('button, a[href], [role="button"], input[type="button"], input[type="submit"]');
    if (!control || control.matches(':disabled, [aria-disabled="true"]')) return;
    playClick();
    if (!reducedMotion.matches) {
      control.animate?.(
        [{ scale: '1' }, { scale: '0.95', offset: 0.4 }, { scale: '1' }],
        { duration: 210, easing: 'ease-out' },
      );
    }
  }, true);
})();
