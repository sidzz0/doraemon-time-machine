import "./styles.css";

type TimeOption = {
  id: string;
  label: string;
  durationMs: number;
};

type SavedRun = {
  optionId: string;
  label: string;
  durationMs: number;
  startedAt: number;
  targetAt: number;
};

const STORAGE_KEY = "doraemon-time-machine-run";
const SECOND = 1000;
const DAY = 24 * 60 * 60 * SECOND;

const timeOptions: TimeOption[] = [
  { id: "5s", label: "5秒后", durationMs: 5 * SECOND },
  { id: "10s", label: "10秒后", durationMs: 10 * SECOND },
  { id: "30s", label: "30秒后", durationMs: 30 * SECOND },
  { id: "100s", label: "100秒后", durationMs: 100 * SECOND },
  { id: "1d", label: "1天后", durationMs: DAY },
  { id: "1y", label: "一年后", durationMs: 365 * DAY },
];

const timeSelect = getElement<HTMLSelectElement>("timeSelect");
const startButton = getElement<HTMLButtonElement>("startButton");
const cancelButton = getElement<HTMLButtonElement>("cancelButton");
const confirmButton = getElement<HTMLButtonElement>("confirmButton");
const successDialog = getElement<HTMLDialogElement>("successDialog");
const successMessage = getElement<HTMLParagraphElement>("successMessage");
const progressFill = getElement<HTMLDivElement>("progressFill");
const progressMascot = getElement<HTMLDivElement>("progressMascot");
const elapsedValue = getElement<HTMLSpanElement>("elapsedValue");
const remainingValue = getElement<HTMLSpanElement>("remainingValue");
const phaseText = getElement<HTMLParagraphElement>("phaseText");
const systemLine = getElement<HTMLParagraphElement>("systemLine");
const hintLine = getElement<HTMLParagraphElement>("hintLine");

let activeRun: SavedRun | null = null;
let timerId: number | null = null;
let audioContext: AudioContext | null = null;
let successSoundPlayed = false;

init();

function init() {
  renderOptions();
  bindEvents();

  const savedRun = loadRun();
  if (savedRun) {
    timeSelect.value = savedRun.optionId;
    startRun(savedRun, false);
  } else {
    renderIdle();
  }
}

function renderOptions() {
  timeSelect.innerHTML = "";
  for (const option of timeOptions) {
    const item = document.createElement("option");
    item.value = option.id;
    item.textContent = option.label;
    timeSelect.append(item);
  }
}

function bindEvents() {
  startButton.addEventListener("click", () => {
    const option = timeOptions.find((item) => item.id === timeSelect.value);
    if (!option) {
      return;
    }

    const startedAt = Date.now();
    const run: SavedRun = {
      optionId: option.id,
      label: option.label,
      durationMs: option.durationMs,
      startedAt,
      targetAt: startedAt + option.durationMs,
    };

    saveRun(run);
    playTone("launch");
    startRun(run, true);
  });

  cancelButton.addEventListener("click", () => {
    stopTimer();
    clearRun();
    renderIdle();
  });

  confirmButton.addEventListener("click", () => {
    successDialog.close();
    renderIdle();
  });

  successDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
  });
}

function startRun(run: SavedRun, resetSuccessSound: boolean) {
  activeRun = run;
  successSoundPlayed = !resetSuccessSound;
  timeSelect.disabled = true;
  startButton.disabled = true;
  startButton.textContent = "穿越中...";
  cancelButton.hidden = false;
  systemLine.textContent = "[SYSTEM] 正在接入四次元口袋时间回路";
  hintLine.textContent = `[HINT] 目标坐标：${run.label}，请勿关闭任意门`;
  document.body.classList.add("is-running");

  tick();
  stopTimer();
  timerId = window.setInterval(tick, 100);
}

function tick() {
  if (!activeRun) {
    return;
  }

  const now = Date.now();
  const elapsedMs = Math.max(0, now - activeRun.startedAt);
  const remainingMs = Math.max(0, activeRun.targetAt - now);
  const progress = clamp(elapsedMs / activeRun.durationMs, 0, 1);

  progressFill.style.width = `${progress * 100}%`;
  progressMascot.style.setProperty("--progress", String(progress));
  elapsedValue.textContent = formatDuration(elapsedMs);
  remainingValue.textContent = formatDuration(remainingMs);
  phaseText.textContent = getPhaseText(progress, activeRun.label);

  if (progress >= 1) {
    completeRun(activeRun);
  }
}

function completeRun(run: SavedRun) {
  stopTimer();
  clearRun();
  activeRun = null;
  progressFill.style.width = "100%";
  progressMascot.style.setProperty("--progress", "1");
  elapsedValue.textContent = formatDuration(run.durationMs);
  remainingValue.textContent = "0.00s";
  phaseText.textContent = "穿越完成，时间坐标已稳定";
  systemLine.textContent = "[SYSTEM] 穿越成功";
  hintLine.textContent = "[HINT] 你真的来到了刚才的未来";
  successMessage.textContent = `恭喜你 已经成功穿越到${run.label}`;

  if (!successSoundPlayed) {
    playTone("success");
    successSoundPlayed = true;
  }

  if (!successDialog.open) {
    successDialog.showModal();
  }
}

function renderIdle() {
  activeRun = null;
  timeSelect.disabled = false;
  startButton.disabled = false;
  startButton.textContent = "开始穿越";
  cancelButton.hidden = true;
  progressFill.style.width = "0%";
  progressMascot.style.setProperty("--progress", "0");
  elapsedValue.textContent = "0.00s";
  remainingValue.textContent = "0.00s";
  phaseText.textContent = "正在锁定时间坐标...";
  systemLine.textContent = "[SYSTEM] 时光机已待命";
  hintLine.textContent = "[HINT] 请选择目标时间点并启动穿越";
  document.body.classList.remove("is-running");
}

function stopTimer() {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function saveRun(run: SavedRun) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(run));
}

function loadRun(): SavedRun | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const run = JSON.parse(raw) as SavedRun;
    const isKnownOption = timeOptions.some((option) => option.id === run.optionId);
    const isValid =
      isKnownOption &&
      Number.isFinite(run.durationMs) &&
      Number.isFinite(run.startedAt) &&
      Number.isFinite(run.targetAt);

    return isValid ? run : null;
  } catch {
    clearRun();
    return null;
  }
}

function clearRun() {
  localStorage.removeItem(STORAGE_KEY);
}

function getPhaseText(progress: number, label: string) {
  if (progress <= 0) {
    return `正在锁定 ${label} 的时间坐标`;
  }

  if (progress < 0.25) {
    return "正在校准竹蜻蜓式时间向量";
  }

  if (progress < 0.6) {
    return "四次元口袋能量稳定上升";
  }

  if (progress < 0.92) {
    return "正在穿过蓝色时间隧道";
  }

  return "即将抵达未来，请保持可爱";
}

function formatDuration(ms: number) {
  if (ms < 60 * SECOND) {
    return `${(ms / SECOND).toFixed(2)}s`;
  }

  const totalSeconds = Math.ceil(ms / SECOND);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}天 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function playTone(kind: "launch" | "success") {
  audioContext ??= new AudioContext();

  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }

  const notes = kind === "launch" ? [392, 523.25, 659.25] : [523.25, 659.25, 783.99, 1046.5];
  const startAt = audioContext.currentTime + 0.02;

  notes.forEach((frequency, index) => {
    const oscillator = audioContext!.createOscillator();
    const gain = audioContext!.createGain();
    oscillator.type = kind === "launch" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, startAt + index * 0.08);
    gain.gain.setValueAtTime(0, startAt + index * 0.08);
    gain.gain.linearRampToValueAtTime(0.08, startAt + index * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + index * 0.08 + 0.16);
    oscillator.connect(gain);
    gain.connect(audioContext!.destination);
    oscillator.start(startAt + index * 0.08);
    oscillator.stop(startAt + index * 0.08 + 0.18);
  });
}

function getElement<T extends HTMLElement>(id: string) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }

  return element as T;
}
