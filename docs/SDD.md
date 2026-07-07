# SDD — Timer

**Versão:** 1.0  
**Stack:** HTML + CSS + JavaScript (sem frameworks, sem build step)  
**Deploy:** GitHub Pages (`main` branch, root `/`)

---

## 1. Estrutura de arquivos

```
timer/
├── index.html
├── style.css
├── script.js
└── docs/
    ├── PRD.md
    └── SDD.md
```

Flat structure na raiz — GitHub Pages serve `index.html` diretamente sem nenhuma configuração adicional.

---

## 2. HTML (`index.html`)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Timer</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⏱</text></svg>">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="timer-container">

    <div class="timer-display"
         role="timer"
         aria-live="polite"
         aria-atomic="true"
         aria-label="Contagem regressiva">
      <input class="timer-input" id="input-minutes"
             type="text" inputmode="numeric"
             maxlength="2" value="05"
             aria-label="Minutos">
      <span class="timer-separator" aria-hidden="true">:</span>
      <input class="timer-input" id="input-seconds"
             type="text" inputmode="numeric"
             maxlength="2" value="00"
             aria-label="Segundos">
    </div>

    <div class="timer-controls">
      <button id="btn-start" class="btn btn--primary"
              aria-keyshortcuts="Space">Iniciar</button>
      <button id="btn-reset" class="btn btn--secondary"
              aria-keyshortcuts="Escape">Zerar</button>
    </div>

  </main>
  <script src="script.js"></script>
</body>
</html>
```

**Decisões:**
- `<input type="text">` em vez de `contenteditable` — gerenciamento nativo de cursor, select-all e backspace
- `inputmode="numeric"` exibe teclado numérico em iOS/Android
- `role="timer"` + `aria-live="polite"` + `aria-atomic="true"` — screen readers anunciam o valor em eventos significativos (não a cada tick)
- Favicon SVG inline (emoji ⏱) — zero arquivos extras, sem requisição 404

---

## 3. CSS (`style.css`)

### Custom properties

```css
:root {
  --color-bg:         #0f0f0f;
  --color-surface:    #1a1a1a;
  --color-primary:    #4f9cf9;
  --color-secondary:  #3a3a3a;
  --color-text:       #e8e8e8;
  --color-muted:      #666;
  --color-danger:     #e05c5c;

  --font-timer: 'Courier New', Courier, monospace;
  --size-timer: clamp(4rem, 18vw, 7rem);

  --radius-container: 1rem;
  --radius-btn:       0.5rem;
  --transition:       160ms ease;
}
```

### Camadas (ordem no arquivo)

1. **Reset / base** — `box-sizing`, `margin: 0`, font body
2. **Layout** — `body` centering via flexbox, `.timer-container` max-width 600px + padding
3. **Display** — `.timer-display`, `.timer-input`, `.timer-separator`
4. **Controls** — `.timer-controls`, `.btn`, `.btn--primary`, `.btn--secondary`
5. **Estados** — `.timer-input:focus`, `.btn:disabled`, `.btn:hover`, `.btn:active`
6. **State classes** — `.is-running`, `.is-paused`, `.is-finished` aplicadas em `<main>`

### Responsividade

`--size-timer: clamp(4rem, 18vw, 7rem)` cobre a maioria dos tamanhos sem media query.  
Único breakpoint se necessário: `@media (min-width: 480px)` para ajustes mínimos.

### Inputs como texto

```css
.timer-input {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  text-align: center;
  font: inherit;
  color: inherit;
  cursor: pointer;
}
.timer-input:focus {
  border-bottom-color: var(--color-primary);
  outline: none;
  cursor: text;
}
```

### State classes em `<main>`

Visuais de estado via CSS (não JS inline):

```css
.timer-container.is-finished .timer-display {
  animation: pulse 0.6s ease infinite alternate;
  color: var(--color-danger);
}
@keyframes pulse {
  from { opacity: 1; }
  to   { opacity: 0.4; }
}
```

---

## 4. JavaScript (`script.js`)

### Constantes

```js
const STORAGE_KEY      = 'timer:lastConfig';
const DEFAULT_MINUTES  = 5;
const DEFAULT_SECONDS  = 0;
```

### Estado

```js
const state = {
  configMinutes:  DEFAULT_MINUTES,   // alvo do reset
  configSeconds:  DEFAULT_SECONDS,
  currentMinutes: DEFAULT_MINUTES,   // contagem live
  currentSeconds: DEFAULT_SECONDS,
  status: 'idle',   // 'idle' | 'running' | 'paused' | 'finished'
  intervalId: null,
  audioCtx:  null,  // AudioContext singleton, criado na 1ª gesture
};
```

### Mapa de funções

| Função | Responsabilidade |
|---|---|
| `init()` | Popula refs DOM, chama `loadFromStorage`, `renderDisplay`, `renderControls`, registra eventos |
| `setStatus(newStatus)` | Transição central — atualiza `state.status`, chama `renderDisplay` e `renderControls` |
| `renderDisplay()` | Atualiza valores dos inputs + `document.title` |
| `renderControls()` | Label do botão primário (Iniciar/Pausar/Continuar), atributo `disabled` |
| `loadFromStorage()` | Lê `STORAGE_KEY`, valida range, faz fallback para defaults |
| `saveToStorage()` | Grava config atual em `STORAGE_KEY` (só após edição validada) |
| `startTimer()` | Guard de status, `initAudio()`, `setInterval → tick`, `setStatus('running')` |
| `pauseTimer()` | `clearInterval`, `setStatus('paused')` |
| `resetTimer()` | `clearInterval`, restaura `current*` de `config*`, `setStatus('idle')` |
| `tick()` | Decrementa segundos/minutos; ao chegar 00:00 → `setStatus('finished')` + `playAlertSound()` |
| `handleEditFocus(e)` | Seleciona todo o conteúdo do input |
| `handleEditBlur(e)` | Valida, clamp, pad, atualiza `config*`, chama `saveToStorage` |
| `handleEditKeydown(e)` | Enter → `blur`; Escape → restaura valor anterior e `blur` |
| `handleGlobalKeydown(e)` | Space → toggle start/pause; Escape → `resetTimer()` |
| `initAudio()` | Cria `AudioContext` singleton (lazy, dentro de gesture) |
| `playAlertSound()` | 3 beeps 880Hz via OscillatorNode |

### Lógica de countdown

```
tick():
  if state.status !== 'running': return   // guard

  if state.currentSeconds > 0:
    state.currentSeconds--
  else if state.currentMinutes > 0:
    state.currentMinutes--
    state.currentSeconds = 59
  else:
    clearInterval(state.intervalId)
    state.intervalId = null
    setStatus('finished')
    playAlertSound()
    return

  renderDisplay()
```

**Edge cases:**

| Caso | Solução |
|---|---|
| Usuário configura 00:00 | Botão Start desabilitado quando ambos os campos são 0 |
| Start pressionado múltiplas vezes rápido | Guard: `if status !== 'idle' && status !== 'paused' return` |
| Aba em background (drift) | Aceitável para este caso de uso — sem correção por `Date` |
| `setInterval` dispara após `clearInterval` | Guard no início de `tick()` |

### Som — Web Audio API

Sem arquivo de áudio. Sem CORS. Funciona no GitHub Pages sem configuração.

```js
function initAudio() {
  if (state.audioCtx) return;
  state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playAlertSound() {
  const ctx = state.audioCtx;
  if (!ctx) return;

  // 3 beeps: 880Hz, 220ms cada, 100ms de intervalo
  [0, 0.32, 0.64].forEach((offset) => {
    const osc  = ctx.createOscillator();
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
```

`initAudio()` é chamado em `startTimer()` — sempre dentro de uma gesture do usuário, evitando o bloqueio de autoplay do Chrome.

### localStorage

```
Chave:  "timer:lastConfig"
Valor:  {"minutes": 5, "seconds": 0}
```

- **Carrega** uma vez em `init()`, antes do primeiro render
- **Salva** apenas em `handleEditBlur` após validação — nunca durante o tick
- **Valida** range ao carregar: minutos 0–99, segundos 0–59; fallback silencioso para 5:00
- **Persiste** `config*` (alvo do reset), nunca `current*` (posição da contagem)

### Keyboard shortcuts

```js
function handleGlobalKeydown(e) {
  if (e.target.matches('.timer-input')) return;  // deixa o input tratar

  if (e.code === 'Space') {
    e.preventDefault();  // evita scroll da página
    if (state.status === 'running')                       pauseTimer();
    else if (state.status === 'idle' || state.status === 'paused') startTimer();
  }

  if (e.key === 'Escape') {
    e.preventDefault();
    resetTimer();
  }
}
```

`handleEditKeydown` trata Escape dentro do input (cancela edição) antes de `handleGlobalKeydown` ver o evento.

---

## 5. Deployment — GitHub Pages

1. Fazer push de `index.html`, `style.css`, `script.js` para o branch `main` (raiz)
2. No repositório: **Settings → Pages → Source → Deploy from a branch**
3. Branch: `main` | Folder: `/ (root)`
4. URL pública: `https://<username>.github.io/timer/`

Sem Actions workflow. Sem `.nojekyll`. Sem `dist/`.

---

## 6. Sequência de implementação

```
1. index.html  — estrutura completa, testar no browser sem JS
2. style.css   — custom props, layout, display, botões, estados, responsivo
3. script.js
   a. init(), refs DOM, renderDisplay(), renderControls()
   b. loadFromStorage(), saveToStorage(), handlers de edição
   c. startTimer(), pauseTimer(), resetTimer(), tick(), setStatus()
   d. handleGlobalKeydown()
   e. initAudio(), playAlertSound()
4. QA manual: desktop + mobile + localStorage + som
5. Push → habilitar GitHub Pages → validar URL pública
```

**Estimativa:** ~180 linhas HTML · ~150 linhas CSS · ~220 linhas JS

---

## 7. Verificação

- Abrir `index.html` diretamente (`file://`) para desenvolvimento local
- Editar tempo → recarregar página → valor deve persistir (localStorage)
- Iniciar → Pausar → Continuar → verificar contagem
- Iniciar → aguardar 00:00 → verificar som + estado `.is-finished`
- Esc zera timer; Space inicia/pausa; inputs ignoram shortcuts de teclado
- DevTools device emulation (320px, 375px, 768px)
- Após deploy: URL pública funcional, som no mobile
