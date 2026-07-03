const accents = ["#42ffd2", "#5ffcff", "#2cff9a", "#b8fff1"];
const defaultNames = ["TEAM 1", "TEAM 2", "TEAM 3", "TEAM 4"];

const setupOptions = {
  gameMode: {
    title: "게임 모드",
    options: [
      { value: "event", label: "슛 챌린지", displayLabel: ["슛", "챌린지"] },
      { value: "normal", label: "일반 플레이", displayLabel: ["일반", "플레이"] },
      { value: "tournament", label: "토너먼트" },
    ],
  },
  teamCount: {
    title: "참여 팀 수",
    options: [
      { value: 2, label: "2팀" },
      { value: 3, label: "3팀" },
      { value: 4, label: "4팀" },
    ],
  },
  duration: {
    title: "제한 시간",
    options: [
      { value: 180, label: "3분" },
      { value: 300, label: "5분" },
      { value: 600, label: "10분" },
    ],
  },
  feverTime: {
    title: "피버타임",
    options: [
      { value: 10, label: "마지막 10초" },
      { value: 15, label: "마지막 15초" },
      { value: 0, label: "사용 안함" },
    ],
  },
};

const state = {
  teams: [],
  gameMode: "event",
  teamCount: 4,
  duration: 300,
  remaining: 300,
  remainingMs: 300000,
  feverTime: 10,
  running: false,
  activeTeamIndex: 0,
  intervalId: null,
  timerEndsAt: null,
  round: 1,
  serialPort: null,
  serialReader: null,
  serialWriter: null,
  serialConnected: false,
  serialConnecting: false,
  wifiBaseUrl: "",
  wifiConnected: false,
  wifiChecking: false,
  wifiPollId: null,
  phase: "setup",
  countdownActive: false,
  bgmEnabled: true,
};

const setupScreen = document.querySelector("#setupScreen");
const gameScreen = document.querySelector("#gameScreen");
const resultScreen = document.querySelector("#resultScreen");
const setupForm = document.querySelector("#setupForm");
const teamNameGrid = document.querySelector("#teamNameGrid");
const scoreGrid = document.querySelector("#scoreGrid");
const timerText = document.querySelector("#timerText");
const feverText = document.querySelector("#feverText");
const feverBox = document.querySelector("#feverBox");
const timerBox = document.querySelector("#timerBox");
const eventMarquee = document.querySelector("#eventMarquee");
const roundLabel = document.querySelector("#roundLabel");
const modeLabel = document.querySelector("#modeLabel");
const winnerText = document.querySelector("#winnerText");
const resultSummary = document.querySelector("#resultSummary");
const podium = document.querySelector("#podium");
const settingModal = document.querySelector("#settingModal");
const modalTitle = document.querySelector("#modalTitle");
const modalOptions = document.querySelector("#modalOptions");
const modalClose = document.querySelector("#modalClose");
const countdownOverlay = document.querySelector("#countdownOverlay");
const countdownLabel = document.querySelector("#countdownLabel");
const countdownCaption = document.querySelector("#countdownCaption");
const startButton = document.querySelector("#startButton");
const wifiButton = document.querySelector("#wifiButton");
const usbButton = document.querySelector("#usbButton");
const bgmButton = document.querySelector("#bgmButton");
const bgmAudio = document.querySelector("#bgmAudio");
const settingLabels = {
  gameMode: document.querySelector("#gameModeLabel"),
  teamCount: document.querySelector("#teamCountLabel"),
  duration: document.querySelector("#durationLabel"),
  feverTime: document.querySelector("#feverTimeLabel"),
};

function updateBgmButton() {
  if (!bgmButton || !bgmAudio) return;
  bgmButton.textContent = state.bgmEnabled && !bgmAudio.paused ? "BGM ON" : "BGM";
  bgmButton.classList.toggle("is-connected", state.bgmEnabled && !bgmAudio.paused);
}

async function playBgm() {
  if (!bgmAudio || !state.bgmEnabled) return;

  try {
    bgmAudio.volume = 0.42;
    await bgmAudio.play();
  } catch (error) {
    state.bgmEnabled = false;
    eventMarquee.textContent = "BGM 대기 · 버튼을 눌러 재생";
  } finally {
    updateBgmButton();
  }
}

function toggleBgm() {
  if (!bgmAudio) return;

  if (!bgmAudio.paused) {
    state.bgmEnabled = false;
    bgmAudio.pause();
    updateBgmButton();
    return;
  }

  state.bgmEnabled = true;
  playBgm();
}

function renderTeamInputs() {
  const count = state.teamCount;
  teamNameGrid.innerHTML = "";

  for (let index = 0; index < count; index += 1) {
    const teamChip = document.createElement("div");
    teamChip.className = "team-chip";
    teamChip.style.setProperty("--accent", accents[index]);
    teamChip.innerHTML = `
      <span>TEAM</span>
      <strong>${index + 1}</strong>
    `;
    teamNameGrid.append(teamChip);
  }
}

function selectedOptionFor(settingKey) {
  const config = setupOptions[settingKey];
  return config.options.find((option) => option.value === state[settingKey]);
}

function labelFor(settingKey) {
  const selected = selectedOptionFor(settingKey);
  return selected ? selected.label : "";
}

function renderLabel(option) {
  const lines = option?.displayLabel || [option?.label || ""];
  return lines.map((line) => `<span>${line}</span>`).join("");
}

function formatClock(totalMs) {
  const totalCentiseconds = Math.max(0, Math.ceil(totalMs / 10));
  const minutes = Math.floor(totalCentiseconds / 6000);
  const seconds = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

function setRemainingMs(ms) {
  state.remainingMs = Math.max(0, ms);
  state.remaining = Math.ceil(state.remainingMs / 1000);
  timerText.textContent = formatClock(state.remainingMs);
}

function renderSetupLabels() {
  Object.keys(settingLabels).forEach((key) => {
    settingLabels[key].innerHTML = renderLabel(selectedOptionFor(key));
  });
  renderTeamInputs();
}

function openSettingModal(settingKey) {
  const config = setupOptions[settingKey];
  modalTitle.textContent = config.title;
  modalOptions.innerHTML = "";

  config.options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "modal-option";
    button.type = "button";
    button.dataset.settingValue = String(option.value);
    button.dataset.settingKey = settingKey;
    button.classList.toggle("is-selected", option.value === state[settingKey]);
    button.innerHTML = `
      <strong>${option.label}</strong>
      <em>SELECT</em>
    `;
    modalOptions.append(button);
  });

  settingModal.classList.remove("hidden");
}

function closeSettingModal() {
  settingModal.classList.add("hidden");
}

function showScreen(screen) {
  [setupScreen, gameScreen, resultScreen].forEach((target) => target.classList.add("hidden"));
  screen.classList.remove("hidden");
}

function buildGameFromSetup() {
  state.remaining = state.duration;
  state.remainingMs = state.duration * 1000;
  state.timerEndsAt = null;
  state.running = false;
  state.phase = "ready";
  state.countdownActive = false;
  state.activeTeamIndex = 0;
  state.teams = Array.from({ length: state.teamCount }, (_, index) => ({
    name: defaultNames[index],
    score: 0,
    completed: false,
    accent: accents[index % accents.length],
  }));

  renderGame();
  showScreen(gameScreen);
  eventMarquee.textContent = state.gameMode === "tournament"
      ? "TOURNAMENT READY · 대진 순서 확인"
    : state.gameMode === "event"
      ? "슛 챌린지 READY · 탁구공 10개 지급"
      : "READY · 팀 박스 선택 후 START";
}

function readyGameFromSetup({ requestSerial = true } = {}) {
  playBgm();
  buildGameFromSetup();
  checkEspWifi({ announce: false });
  sendEspCommand("READY");
}

function renderGame() {
  timerText.textContent = formatClock(state.remainingMs);
  roundLabel.textContent = `ROUND ${String(state.round).padStart(2, "0")}`;
  modeLabel.textContent = state.gameMode === "tournament"
    ? "TOURNAMENT"
    : state.gameMode === "event"
      ? "SHOOT CHALLENGE"
      : "NORMAL PLAY";
  scoreGrid.style.gridTemplateColumns = `repeat(${Math.min(state.teams.length, 4)}, minmax(0, 1fr))`;
  scoreGrid.innerHTML = "";

  state.teams.forEach((team, index) => {
    const card = document.createElement("article");
    card.className = "team-card";
    card.classList.toggle("is-active", index === state.activeTeamIndex);
    card.classList.toggle("is-complete", team.completed);
    card.style.setProperty("--accent", team.accent);
    card.dataset.teamIndex = String(index);
    card.innerHTML = `
      <div class="team-name">
        <span>${team.name}</span>
      </div>
      <div class="score-value">${team.score}</div>
      <div class="team-status">${index === state.activeTeamIndex ? "SELECTED" : team.completed ? "DONE" : "CLICK SELECT"}</div>
    `;
    scoreGrid.append(card);
  });

  updateFeverState();
}

function addScore(index, point) {
  if (!state.running) return;
  const team = state.teams[index];
  if (!team) return;

  const feverBonus = state.running && isFeverTime() && point > 0 ? point : 0;
  team.score = Math.max(0, team.score + point + feverBonus);
  eventMarquee.textContent = `${team.name} +${point + feverBonus} · SCORE ${team.score}`;
  renderGame();
}

function handleSerialLine(line) {
  const message = line.trim().toUpperCase();
  if (!message) return;

  const scoreMatch = message.match(/^SCORE:(\d+)$/);
  if (scoreMatch) {
    const team = state.teams[state.activeTeamIndex];
    if (team) {
      team.score = Number(scoreMatch[1]);
      eventMarquee.textContent = `ESP SCORE · ${team.name} ${team.score}`;
      renderGame();
    }
    return;
  }

  if (message.startsWith("HIT:")) {
    eventMarquee.textContent = `ESP GOAL · SENSOR ${message.slice(4)}`;
    return;
  }

  if (["TEAM1", "TEAM1+1", "BOOT", "GOAL:1"].includes(message)) {
    addScore(state.activeTeamIndex, 1);
    eventMarquee.textContent = `ESP GOAL · ${state.teams[state.activeTeamIndex]?.name || "TEAM"} +1`;
    return;
  }

  eventMarquee.textContent = `ESP · ${message}`;
}

async function readSerialPort(port) {
  const decoder = new TextDecoderStream();
  port.readable.pipeTo(decoder.writable).catch(() => {});
  state.serialReader = decoder.readable.getReader();

  let buffer = "";
  while (state.serialConnected) {
    const { value, done } = await state.serialReader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    lines.forEach(handleSerialLine);
  }
}

async function openEspPort(port) {
  await port.open({ baudRate: 115200 });
  state.serialPort = port;
  state.serialConnected = true;
  state.serialWriter = port.writable?.getWriter ? port.writable.getWriter() : null;
  if (usbButton) {
    usbButton.textContent = "USB 연결됨";
    usbButton.classList.add("is-connected");
  }
  eventMarquee.textContent = "ESP CONNECTED · GAME START 대기";
  readSerialPort(port).catch((error) => {
    state.serialConnected = false;
    state.serialWriter = null;
    eventMarquee.textContent = `ESP 연결 끊김 · ${error.message || error}`;
  });
}

async function sendSerialCommand(command) {
  if (!state.serialConnected || !state.serialWriter) return false;

  try {
    const data = new TextEncoder().encode(`${command}\n`);
    await state.serialWriter.write(data);
    return true;
  } catch (error) {
    eventMarquee.textContent = `ESP 명령 실패 · ${error.message || error}`;
    return false;
  }
}

async function autoConnectEspSerial() {
  if (!("serial" in navigator)) {
    eventMarquee.textContent = "WEB SERIAL 미지원 · CHROME/EDGE 필요";
    return false;
  }

  if (state.serialConnected || state.serialConnecting) return state.serialConnected;
  state.serialConnecting = true;

  try {
    const rememberedPorts = await navigator.serial.getPorts();
    const port = rememberedPorts[0];

    if (!port) {
      eventMarquee.textContent = "ESP 무선 모드 · IP 연결 대기";
      return false;
    }

    await openEspPort(port);
    return true;
  } catch (error) {
    state.serialConnected = false;
    eventMarquee.textContent = `ESP 자동 연결 실패 · ${error.message || error}`;
    return false;
  } finally {
    state.serialConnecting = false;
  }
}

async function connectEspUsb() {
  if (!("serial" in navigator)) {
    eventMarquee.textContent = "WEB SERIAL 미지원 · CHROME/EDGE 필요";
    return false;
  }

  if (state.serialConnected) return true;

  try {
    const rememberedPorts = await navigator.serial.getPorts();
    const port = rememberedPorts[0] || await navigator.serial.requestPort();
    await openEspPort(port);
    return true;
  } catch (error) {
    if (usbButton) {
      usbButton.textContent = "USB 연결";
      usbButton.classList.remove("is-connected");
    }
    eventMarquee.textContent = `USB 연결 실패 · ${error.message || error}`;
    return false;
  }
}

function setWifiStatus({ connected, checking = false, message = "" } = {}) {
  state.wifiConnected = connected;
  state.wifiChecking = checking;
  wifiButton.classList.toggle("is-connected", connected);
  wifiButton.classList.toggle("is-checking", checking);

  if (checking) {
    wifiButton.textContent = "ESP 확인";
    return;
  }

  wifiButton.textContent = connected ? "ESP 연결됨" : "ESP 연결";
  if (message) eventMarquee.textContent = message;
}

function normalizeWifiBaseUrl(value) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

async function fetchWifiState(path = "/score", { waitForResponse = true } = {}) {
  if (!state.wifiBaseUrl) return null;

  const request = fetch(`${state.wifiBaseUrl}${path}`, {
    cache: "no-store",
    mode: "cors",
  });

  if (!waitForResponse) {
    request.catch(() => {
      setWifiStatus({ connected: false, message: "ESP 끊김 · 전원/IP/Wi-Fi 확인" });
    });
    return null;
  }

  const response = await request;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function applyWifiScore(payload) {
  if (!payload || typeof payload.score !== "number") return;
  const team = state.teams[state.activeTeamIndex];
  if (!team) return;

  if (team.score !== payload.score) {
    team.score = payload.score;
    eventMarquee.textContent = `WIFI SCORE · ${team.name} ${team.score}`;
    renderGame();
  }
}

function startWifiPolling() {
  window.clearInterval(state.wifiPollId);
  state.wifiPollId = window.setInterval(async () => {
    if (!state.wifiBaseUrl || state.wifiChecking) return;
    try {
      const payload = await fetchWifiState("/score");
      if (!state.wifiConnected) {
        setWifiStatus({ connected: true, message: `ESP 연결됨 · ${state.wifiBaseUrl}` });
      }
      applyWifiScore(payload);
    } catch (error) {
      setWifiStatus({ connected: false, message: `ESP 끊김 · ${error.message || error}` });
    }
  }, 1000);
}

async function checkEspWifi({ announce = true } = {}) {
  if (!state.wifiBaseUrl) return false;
  setWifiStatus({ connected: false, checking: true });

  try {
    const payload = await fetchWifiState("/score");
    setWifiStatus({
      connected: true,
      message: announce ? `ESP 연결됨 · ${state.wifiBaseUrl}` : "",
    });
    applyWifiScore(payload);
    startWifiPolling();
    return true;
  } catch (error) {
    setWifiStatus({
      connected: false,
      message: announce ? `ESP 연결 실패 · ${error.message || error}` : "",
    });
    return false;
  }
}

async function connectEspWifi() {
  const savedIp = window.localStorage.getItem("ludballWifiIp") || "192.168.0.106";
  const input = window.prompt("ESP IP", savedIp);
  if (!input) return false;

  state.wifiBaseUrl = normalizeWifiBaseUrl(input);
  window.localStorage.setItem("ludballWifiIp", state.wifiBaseUrl.replace(/^https?:\/\//i, ""));
  return checkEspWifi();
}

async function sendEspCommand(command) {
  if (state.serialConnected && await sendSerialCommand(command)) {
    return true;
  }

  if (!state.wifiConnected && state.wifiBaseUrl) {
    await checkEspWifi({ announce: false });
  }

  if (state.wifiConnected) {
    const pathMap = {
      READY: "/reset",
      RESET: "/reset",
      START: "/start",
      GO: "/start",
      FINISH: "/finish",
      STOP: "/finish",
    };
    const path = pathMap[command];
    if (path) {
      await fetchWifiState(path, { waitForResponse: command !== "START" && command !== "GO" });
      return true;
    }
  }

  eventMarquee.textContent = "ESP 미연결 · USB 연결 또는 ESP 연결 확인";
  return false;
}

function isFeverTime() {
  return state.feverTime > 0 && state.remaining <= state.feverTime;
}

function updateFeverState() {
  const fever = isFeverTime();
  document.body.classList.toggle("is-fever", fever && state.running);
  timerBox.classList.toggle("is-fever", fever && state.running);
  feverBox.classList.toggle("is-fever", fever && state.running);
  feverText.textContent = fever ? "2X NOW" : state.feverTime > 0 ? "READY" : "OFF";
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function showCountdownStep(label, caption) {
  countdownLabel.textContent = label;
  countdownCaption.textContent = caption;
  countdownOverlay.classList.remove("hidden");
  countdownOverlay.classList.remove("is-go");
  countdownOverlay.classList.remove("is-pulse");
  void countdownOverlay.offsetWidth;
  countdownOverlay.classList.add("is-pulse");
  if (label === "GO!") countdownOverlay.classList.add("is-go");
}

function selectTeam(index) {
  if (!state.teams[index] || state.running || state.countdownActive) return;

  state.activeTeamIndex = index;
  state.phase = "ready";
  setRemainingMs(state.duration * 1000);
  startButton.disabled = false;
  eventMarquee.textContent = `${state.teams[index].name} SELECTED · GAME START 대기`;
  renderGame();
  sendEspCommand("READY");
}

function hideCountdown() {
  countdownOverlay.classList.add("hidden");
  countdownOverlay.classList.remove("is-go", "is-pulse");
}

async function runCountdownAndStart() {
  if (state.running || state.countdownActive) return;
  const activeTeam = state.teams[state.activeTeamIndex];
  if (!activeTeam) return;

  playBgm();
  activeTeam.score = 0;
  activeTeam.completed = false;
  setRemainingMs(state.duration * 1000);
  renderGame();
  state.countdownActive = true;
  state.phase = "countdown";
  startButton.disabled = true;
  eventMarquee.textContent = `${activeTeam.name} COUNTDOWN · 준비`;

  await sendEspCommand(`TEAM:${state.activeTeamIndex + 1}`);
  await sendEspCommand("START");

  showCountdownStep("3", "READY");
  await sleep(700);
  showCountdownStep("2", "READY");
  await sleep(700);
  showCountdownStep("1", "SET");
  await sleep(700);
  showCountdownStep("GO!", "GAME START");
  await sleep(450);
  hideCountdown();

  state.countdownActive = false;
  startButton.disabled = false;
  startGame();
}

function startGame() {
  if (state.running) return;
  state.phase = "running";
  state.running = true;
  state.timerEndsAt = performance.now() + state.remainingMs;
  const activeTeam = state.teams[state.activeTeamIndex];
  eventMarquee.textContent = state.gameMode === "tournament"
    ? `${activeTeam.name} START · 승자 진출`
    : state.gameMode === "event"
      ? `${activeTeam.name} START · 골인 수 실시간 집계`
      : `${activeTeam.name} START · GO GO GO`;
  updateFeverState();

  state.intervalId = window.setInterval(() => {
    setRemainingMs(state.timerEndsAt - performance.now());

    if (isFeverTime()) {
      eventMarquee.textContent = "FEVER TIME · 모든 골인 점수 2배";
    }

    updateFeverState();

    if (state.remaining <= 0) {
      endGame();
    }
  }, 10);
}

function pauseGame() {
  if (state.running && state.timerEndsAt) {
    setRemainingMs(state.timerEndsAt - performance.now());
  }
  state.running = false;
  if (state.phase === "running") state.phase = "paused";
  window.clearInterval(state.intervalId);
  state.intervalId = null;
  state.timerEndsAt = null;
  eventMarquee.textContent = "PAUSED · 점수 확인 중";
  updateFeverState();
}

async function resetGame(keepScreen = true) {
  pauseGame();
  hideCountdown();
  state.countdownActive = false;
  state.phase = "ready";
  startButton.disabled = false;
  state.remaining = state.duration;
  state.remainingMs = state.duration * 1000;
  state.teams = state.teams.map((team) => ({ ...team, score: 0, completed: false }));
  state.activeTeamIndex = 0;
  eventMarquee.textContent = "RESET · READY";
  renderGame();
  if (keepScreen) showScreen(gameScreen);

  await sendEspCommand("RESET");
}

function endGame() {
  pauseGame();
  state.phase = "ended";
  sendEspCommand("FINISH");
  state.remaining = 0;
  state.remainingMs = 0;
  timerText.textContent = formatClock(0);
  const activeTeam = state.teams[state.activeTeamIndex];
  if (activeTeam) activeTeam.completed = true;
  const sorted = [...state.teams].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const tied = sorted.filter((team) => team.score === winner.score);

  winnerText.textContent = tied.length > 1 ? "DRAW GAME" : `${winner.name} WIN`;
  const resultPrefix = state.gameMode === "tournament" ? "토너먼트" : state.gameMode === "event" ? "체험" : "최종";
  resultSummary.textContent = tied.length > 1
    ? `공동 1등 · ${winner.score}점`
    : `${resultPrefix} 우승 · ${winner.score}점`;

  podium.innerHTML = sorted
    .map((team, index) => `
      <div class="podium-row">
        <span>${index + 1}. ${team.name}</span>
        <strong>${team.score}</strong>
      </div>
    `)
    .join("");

  state.round += 1;
  const nextIndex = state.teams.findIndex((team) => !team.completed);
  if (nextIndex >= 0) {
    state.activeTeamIndex = nextIndex;
    state.phase = "ready";
    setRemainingMs(state.duration * 1000);
    eventMarquee.textContent = `${activeTeam.name} DONE · 다음 ${state.teams[nextIndex].name} 선택됨`;
    renderGame();
    showScreen(gameScreen);
    return;
  }

  showScreen(resultScreen);
}

document.querySelectorAll("[data-setting]").forEach((button) => {
  button.addEventListener("click", () => openSettingModal(button.dataset.setting));
});

modalOptions.addEventListener("click", (event) => {
  const optionButton = event.target.closest("[data-setting-key]");
  if (!optionButton) return;

  const key = optionButton.dataset.settingKey;
  const rawValue = optionButton.dataset.settingValue;
  state[key] = Number.isNaN(Number(rawValue)) ? rawValue : Number(rawValue);
  renderSetupLabels();
  closeSettingModal();
});

modalClose.addEventListener("click", closeSettingModal);
settingModal.addEventListener("click", (event) => {
  if (event.target === settingModal) closeSettingModal();
});

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  readyGameFromSetup();
});

scoreGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-team-index]");
  if (!card) return;
  selectTeam(Number(card.dataset.teamIndex));
});

wifiButton.addEventListener("click", connectEspWifi);
usbButton?.addEventListener("click", connectEspUsb);
bgmButton?.addEventListener("click", toggleBgm);
startButton.addEventListener("click", runCountdownAndStart);
document.querySelector("#pauseButton").addEventListener("click", pauseGame);
document.querySelector("#resetButton").addEventListener("click", () => resetGame(true));
document.querySelector("#setupButton").addEventListener("click", () => {
  pauseGame();
  showScreen(setupScreen);
});
document.querySelector("#replayButton").addEventListener("click", () => resetGame(true));
document.querySelector("#resultSetupButton").addEventListener("click", () => showScreen(setupScreen));

window.addEventListener("keydown", (event) => {
  const keyMap = { "1": 0, "2": 1, "3": 2, "4": 3 };
  if (event.code === "Space") {
    event.preventDefault();
    if (!settingModal.classList.contains("hidden")) return;
    if (!setupScreen.classList.contains("hidden")) {
      readyGameFromSetup();
      return;
    }
    state.running ? pauseGame() : runCountdownAndStart();
    return;
  }
  if (event.key.toLowerCase() === "r") {
    resetGame(true);
    return;
  }
  if (Object.hasOwn(keyMap, event.key)) {
    selectTeam(keyMap[event.key]);
  }
});

renderSetupLabels();
state.wifiBaseUrl = normalizeWifiBaseUrl(window.localStorage.getItem("ludballWifiIp") || "192.168.0.106");
setWifiStatus({ connected: false, message: `ESP 확인 대기 · ${state.wifiBaseUrl.replace(/^https?:\/\//i, "")}` });
checkEspWifi({ announce: false });
startWifiPolling();
autoConnectEspSerial();

if ("serial" in navigator) {
  navigator.serial.addEventListener("disconnect", (event) => {
    if (event.target === state.serialPort) {
      state.serialConnected = false;
      state.serialPort = null;
      state.serialWriter = null;
      if (usbButton) {
        usbButton.textContent = "USB 연결";
        usbButton.classList.remove("is-connected");
      }
      eventMarquee.textContent = "ESP DISCONNECTED · 자동 재연결 대기";
    }
  });
}
