const STORAGE_KEY = 'timer:lastConfig';
const DEFAULT_MINUTES = 5;
const DEFAULT_SECONDS = 0;

const state = {
  configMinutes: DEFAULT_MINUTES,
  configSeconds: DEFAULT_SECONDS,
  currentMinutes: DEFAULT_MINUTES,
  currentSeconds: DEFAULT_SECONDS,
  status: 'idle',
  intervalId: null,
  audioCtx: null,
};

let elMinutes, elSeconds, elBtnStart, elBtnReset, elContainer;

function init() {
  elContainer = document.querySelector('.timer-container');
  elMinutes = document.getElementById('input-minutes');
  elSeconds = document.getElementById('input-seconds');
  elBtnStart = document.getElementById('btn-start');
  elBtnReset = document.getElementById('btn-reset');

  loadFromStorage();
  renderDisplay();
  renderControls();

  elMinutes.addEventListener('focus', handleEditFocus);
  elSeconds.addEventListener('focus', handleEditFocus);
  elMinutes.addEventListener('blur', handleEditBlur);
  elSeconds.addEventListener('blur', handleEditBlur);
  elMinutes.addEventListener('keydown', handleEditKeydown);
  elSeconds.addEventListener('keydown', handleEditKeydown);

  elBtnStart.addEventListener('click', () => {
    if (state.status === 'running') pauseTimer();
    else if (state.status === 'idle' || state.status === 'paused') startTimer();
  });

  elBtnReset.addEventListener('click', resetTimer);

  document.addEventListener('keydown', handleGlobalKeydown);
}

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const parsed = JSON.parse(stored);
    const minutes = parseInt(parsed.minutes, 10);
    const seconds = parseInt(parsed.seconds, 10);

    if (isNaN(minutes) || isNaN(seconds)) return;
    if (minutes < 0 || minutes > 99 || seconds < 0 || seconds > 59) return;

    state.configMinutes = minutes;
    state.configSeconds = seconds;
    state.currentMinutes = minutes;
    state.currentSeconds = seconds;
  } catch (e) {
    // silently ignore parse errors
  }
}

function saveToStorage() {
  const data = {
    minutes: state.configMinutes,
    seconds: state.configSeconds,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function renderDisplay() {
  const mm = String(state.currentMinutes).padStart(2, '0');
  const ss = String(state.currentSeconds).padStart(2, '0');
  elMinutes.value = mm;
  elSeconds.value = ss;
  document.title = `${mm}:${ss} - Timer`;
}

function renderControls() {
  const isEditable = state.status === 'idle';
  elMinutes.disabled = !isEditable;
  elSeconds.disabled = !isEditable;

  const canStart = state.configMinutes > 0 || state.configSeconds > 0;
  if (state.status === 'idle') {
    elBtnStart.disabled = !canStart;
    elBtnStart.textContent = 'Iniciar';
  } else if (state.status === 'running') {
    elBtnStart.disabled = false;
    elBtnStart.textContent = 'Pausar';
  } else if (state.status === 'paused') {
    elBtnStart.disabled = false;
    elBtnStart.textContent = 'Continuar';
  } else if (state.status === 'finished') {
    elBtnStart.disabled = true;
    elBtnStart.textContent = 'Iniciar';
  }

  elBtnReset.disabled = state.status === 'idle' && state.currentMinutes === state.configMinutes && state.currentSeconds === state.configSeconds;
}

function setStatus(newStatus) {
  state.status = newStatus;
  renderDisplay();
  renderControls();

  if (newStatus === 'finished') {
    elContainer.classList.add('is-finished');
  } else {
    elContainer.classList.remove('is-finished');
  }
}

function startTimer() {
  if (state.status !== 'idle' && state.status !== 'paused') return;
  if (state.configMinutes === 0 && state.configSeconds === 0) return;

  if (state.status === 'idle') {
    state.currentMinutes = state.configMinutes;
    state.currentSeconds = state.configSeconds;
  }

  initAudio();
  setStatus('running');
  state.intervalId = setInterval(tick, 1000);
}

function pauseTimer() {
  if (state.status !== 'running') return;
  clearInterval(state.intervalId);
  state.intervalId = null;
  setStatus('paused');
}

function resetTimer() {
  clearInterval(state.intervalId);
  state.intervalId = null;
  state.currentMinutes = state.configMinutes;
  state.currentSeconds = state.configSeconds;
  setStatus('idle');
}

function tick() {
  if (state.status !== 'running') return;

  if (state.currentSeconds > 0) {
    state.currentSeconds--;
  } else if (state.currentMinutes > 0) {
    state.currentMinutes--;
    state.currentSeconds = 59;
  } else {
    clearInterval(state.intervalId);
    state.intervalId = null;
    setStatus('finished');
    playAlertSound();
    return;
  }

  renderDisplay();
}

function handleEditFocus(e) {
  e.target.select();
}

function handleEditBlur(e) {
  const inputId = e.target.id;
  let value = e.target.value.replace(/\D/g, '');

  if (value === '') {
    value = '0';
  }

  let numValue = parseInt(value, 10);

  if (inputId === 'input-minutes') {
    numValue = Math.max(0, Math.min(99, numValue));
    state.configMinutes = numValue;
  } else if (inputId === 'input-seconds') {
    numValue = Math.max(0, Math.min(59, numValue));
    state.configSeconds = numValue;
  }

  state.currentMinutes = state.configMinutes;
  state.currentSeconds = state.configSeconds;

  saveToStorage();
  renderDisplay();
  renderControls();
}

function handleEditKeydown(e) {
  if (e.key === 'Enter') {
    e.target.blur();
  } else if (e.key === 'Escape') {
    const inputId = e.target.id;
    if (inputId === 'input-minutes') {
      e.target.value = String(state.configMinutes).padStart(2, '0');
    } else if (inputId === 'input-seconds') {
      e.target.value = String(state.configSeconds).padStart(2, '0');
    }
    e.target.blur();
  }
}

function handleGlobalKeydown(e) {
  if (e.target.matches('.timer-input')) return;

  if (e.code === 'Space') {
    e.preventDefault();
    if (state.status === 'running') {
      pauseTimer();
    } else if (state.status === 'idle' || state.status === 'paused') {
      startTimer();
    }
  }

  if (e.key === 'Escape') {
    e.preventDefault();
    resetTimer();
  }
}

function initAudio() {
  if (state.audioCtx) return;
  state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playAlertSound() {
  const ctx = state.audioCtx;
  if (!ctx) return;

  const offsets = [0, 0.32, 0.64];
  offsets.forEach((offset) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.4, ctx.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.22);
    osc.start(ctx.currentTime + offset);
    osc.stop(ctx.currentTime + offset + 0.22);
  });
}

document.addEventListener('DOMContentLoaded', init);
