// === AudioSystem.js ===
// Универсальный аудио-модуль для Phaser 3 + Яндекс Игры
// Fixes: lookahead-scheduler, ctx.resume(), destroy(), Phaser scene hooks,
//        внутренние флаги вместо window.*, корректный рестарт музыки

var AudioSystem = (function () {

  // ── Контекст и граф ──────────────────
  let ctx, master, filter, bassFilter;
  let musicEnabled = true;
  let soundEnabled = true;
  let isMuted      = false;

  // ── Lookahead-планировщик ────────────
  let schedulerTimer  = null;
  let nextNoteTime    = 0;
  let noteIndex       = 0;
  let currentStepMs   = 400;          // мс на шаг, меняется с intensity
  const SCHEDULE_AHEAD = 0.15;        // секунд вперёд
  const LOOKAHEAD_MS   = 80;          // интервал проверки планировщика

  // ── Интенсивность ────────────────────
  let intensity = 0;

  // ── Гаммы и паттерны ─────────────────
  const SCALE = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25]; // C major pentatonic + мягкие проходящие ноты
  const MELODY = [0, 2, 4, 2, 3, 4, 2, 1, 0, 2, 4, 5, 4, 2, 1, 2, 0, 2, 3, 4, 5, 4, 3, 2, 1, 2, 4, 2, 1, 0, 1, 2];
  const CHORDS = [
    [130.81, 164.81, 196.00], // C
    [110.00, 130.81, 164.81], // Am
    [174.61, 220.00, 261.63], // F
    [196.00, 246.94, 293.66]  // G
  ];
  const BASS = [65.41, 55.00, 87.31, 98.00];
  const DETUNE = [0, -3, 3, -5, 5, -2, 2, 0, 4, -4];

  // ── Пул осцилляторов ─────────────────
  const MELODY_POOL_SIZE = 10;
  const BASS_POOL_SIZE   = 3;
  let melodyPool = [];
  let bassPool   = [];
  let poolsReady = false;

  // ─────────────────────────────────────
  // ПУЛ
  // ─────────────────────────────────────

  function _initPools () {
    for (let i = 0; i < MELODY_POOL_SIZE; i++) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 440;
      osc.detune.value = DETUNE[i];
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      osc.connect(gain);
      gain.connect(filter);
      osc.start();
      melodyPool.push({ osc, gain, freeAt: 0 });
    }
    for (let i = 0; i < BASS_POOL_SIZE; i++) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 80;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      osc.connect(gain);
      gain.connect(bassFilter);
      osc.start();
      bassPool.push({ osc, gain, freeAt: 0 });
    }
    poolsReady = true;
  }

  function _getPoolNode (pool, time) {
    let best = pool[0];
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (p.freeAt <= time) return p;
      if (p.freeAt < best.freeAt) best = p;
    }
    return best;
  }

  function _playNotePooled (freq, time, dur, vol) {
    if (!poolsReady) return;
    const p = _getPoolNode(melodyPool, time);
    p.osc.frequency.cancelScheduledValues(time);
    p.osc.frequency.setValueAtTime(freq, time);
    p.gain.gain.cancelScheduledValues(time);
    p.gain.gain.setValueAtTime(0.0001, time);
    p.gain.gain.exponentialRampToValueAtTime(vol, time + 0.045);
    p.gain.gain.setTargetAtTime(0.0001, time + dur * 0.72, 0.09);
    p.freeAt = time + dur + 0.05;
  }

  function _playChordPooled (freqs, time, dur, vol) {
    freqs.forEach(f => _playNotePooled(f, time, dur, vol * 0.4));
  }

  function _playBassPooled (freq, time) {
    if (!poolsReady) return;
    const p = _getPoolNode(bassPool, time);
    p.osc.frequency.cancelScheduledValues(time);
    p.osc.frequency.setValueAtTime(freq, time);
    p.gain.gain.cancelScheduledValues(time);
    p.gain.gain.setValueAtTime(0.0001, time);
    p.gain.gain.exponentialRampToValueAtTime(0.065, time + 0.09);
    p.gain.gain.setTargetAtTime(0.0001, time + 0.48, 0.12);
    p.freeAt = time + 0.72;
  }

  function _silencePools () {
    if (!ctx) return;
    const now = ctx.currentTime;
    melodyPool.forEach(p => {
      p.gain.gain.cancelScheduledValues(now);
      p.gain.gain.setValueAtTime(0.0001, now);
      p.freeAt = 0;
    });
    bassPool.forEach(p => {
      p.gain.gain.cancelScheduledValues(now);
      p.gain.gain.setValueAtTime(0.0001, now);
      p.freeAt = 0;
    });
  }

  // ─────────────────────────────────────
  // LOOKAHEAD-ПЛАНИРОВЩИК
  // ─────────────────────────────────────

  function _scheduleNote (time) {
    const step = noteIndex % MELODY.length;
    const bar = Math.floor(noteIndex / 8);
    const note = MELODY[step];
    const octave = (step === 7 || step === 15 || step === 23) ? 2 : 1;
    const freq = SCALE[note] * octave;
    const duration = [0.34, 0.42, 0.36, 0.48, 0.38, 0.44, 0.34, 0.56][step % 8];

    // Спокойная мелодия без резких скачков и высокочастотных дублей.
    _playNotePooled(freq, time, duration, 0.052);

    // Гармония меняется раз в четыре такта, бас — только на сильной доле.
    if (noteIndex % 8 === 0) {
      const chordIndex = Math.floor(noteIndex / 8) % CHORDS.length;
      _playChordPooled(CHORDS[chordIndex], time, 1.75, 0.035);
      _playBassPooled(BASS[chordIndex], time);
    }

    // Дополнительные акценты отключены: мелодия звучит одной чистой линией.
    noteIndex++;
  }

  function _advanceNote () {
    // currentStepMs обновляется в setIntensity — drift исключён
    nextNoteTime += currentStepMs / 1000;
  }

  function _runScheduler () {
    if (!ctx || !musicEnabled || isMuted) return;
    while (nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD) {
      _scheduleNote(nextNoteTime);
      _advanceNote();
    }
    schedulerTimer = setTimeout(_runScheduler, LOOKAHEAD_MS);
  }

  // ─────────────────────────────────────
  // INIT
  // ─────────────────────────────────────

  function init () {
    if (ctx) return; // защита от двойного вызова

    ctx = new (window.AudioContext || window.webkitAudioContext)();

    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);

    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1650;
    filter.Q.value = 0.55;
    filter.connect(master);

    bassFilter = ctx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.value = 300;
    bassFilter.connect(master);

    _initPools();
  }

  // ─────────────────────────────────────
  // RESUME — вызывать на первый жест пользователя
  // Яндекс Игры: document.addEventListener('click', AudioSystem.resume, { once: true })
  // ─────────────────────────────────────

  function resume () {
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  // ─────────────────────────────────────
  // МУЗЫКА
  // ─────────────────────────────────────

  function startMusic () {
    if (!ctx) return;
    if (schedulerTimer) return; // уже запущен

    noteIndex    = 0;
    nextNoteTime = ctx.currentTime;
    _runScheduler();
  }

  function stopMusic () {
    if (schedulerTimer) {
      clearTimeout(schedulerTimer);
      schedulerTimer = null;
    }
    _silencePools();
  }

  // Алиасы для совместимости с внешним кодом
  function playGameMusic () { startMusic(); }
  function playMenuMusic () { startMusic(); }
  function stopGameMusic () { stopMusic(); }

  // ─────────────────────────────────────
  // INTENSITY
  // ─────────────────────────────────────

  function setIntensity (v) {
    intensity = Math.max(0, Math.min(1, v));

    // Темп: обновляем сразу — планировщик подхватит на следующем цикле
    currentStepMs = intensity > 0.5 ? 470 : 520;

    // Интенсивность меняет плотность/тембр совсем немного, не лад и не громкость.
    if (filter)     filter.frequency.setTargetAtTime(1500 + intensity * 450, ctx.currentTime, 0.8);
    if (bassFilter) bassFilter.frequency.setTargetAtTime(260 + intensity * 100, ctx.currentTime, 0.8);
  }

  // ─────────────────────────────────────
  // SFX
  // ─────────────────────────────────────

  function _sfxAllowed () {
    return soundEnabled && ctx && !isMuted;
  }

  function playJump () {
    if (!_sfxAllowed()) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    const now  = ctx.currentTime;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
    gain.gain.setValueAtTime(0.075, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  function playClick () {
    if (!_sfxAllowed()) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    const now  = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  function playDeath () {
    if (!_sfxAllowed()) return;
    const now = ctx.currentTime;

    const osc1  = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(220, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    osc1.connect(gain1); gain1.connect(master);
    osc1.start(now); osc1.stop(now + 0.15);

    const osc2  = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(155, now);
    osc2.frequency.exponentialRampToValueAtTime(80, now + 0.2);
    gain2.gain.setValueAtTime(0.10, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    osc2.connect(gain2); gain2.connect(master);
    osc2.start(now); osc2.stop(now + 0.25);
  }

  function playLapComplete () {
    if (!_sfxAllowed()) return;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const t    = ctx.currentTime + i * 0.09;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.connect(gain); gain.connect(master);
      osc.start(t); osc.stop(t + 0.15);
    });
  }

  // ─────────────────────────────────────
  // MUTE / ENABLE
  // ─────────────────────────────────────

  function muteAll () {
    isMuted = true;
    if (master) master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.025);
  }

  function unmuteAll () {
    isMuted = false;
    if (master) master.gain.setTargetAtTime(0.16, ctx.currentTime, 0.04);
  }

  // Управление музыкой и звуком без глобальных window.*
  function setMusicEnabled (v) { musicEnabled = !!v; if (!v) stopMusic(); }
  function setSoundEnabled (v) { soundEnabled = !!v; }

  // ─────────────────────────────────────
  // PHASER 3 — опциональная интеграция со сценой
  // Использование: AudioSystem.attachToScene(this) внутри create()
  // ─────────────────────────────────────

  function attachToScene (scene) {
    if (!scene || !scene.events) return;

    scene.events.on('pause',   stopMusic,  AudioSystem);
    scene.events.on('resume',  startMusic, AudioSystem);
    scene.events.on('sleep',   stopMusic,  AudioSystem);
    scene.events.on('wake',    startMusic, AudioSystem);
    scene.events.on('shutdown', destroy,   AudioSystem);
    scene.events.on('destroy',  destroy,   AudioSystem);

    // Авто-resume на первый клик/тач внутри сцены
    scene.input.once('pointerdown', resume);
  }

  // ─────────────────────────────────────
  // DESTROY — вызывать при смене сцен / выгрузке
  // ─────────────────────────────────────

  function destroy () {
    stopMusic();
    _silencePools();
    melodyPool = [];
    bassPool   = [];
    poolsReady = false;
    if (ctx) {
      ctx.close();
      ctx = null;
    }
  }

  // ─────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────

  return {
    init,
    resume,
    destroy,
    attachToScene,

    // музыка
    startMusic,
    stopMusic,
    playGameMusic,
    playMenuMusic,
    stopGameMusic,

    // sfx
    playJump,
    playClick,
    playDeath,
    playLapComplete,

    // управление
    setIntensity,
    muteAll,
    unmuteAll,
    setMusicEnabled,
    setSoundEnabled,
  };
})();


export default AudioSystem;
