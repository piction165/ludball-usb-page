const accents = ["#42ffd2", "#5ffcff", "#2cff9a", "#b8fff1"];
const defaultNames = ["TEAM 1", "TEAM 2", "TEAM 3", "TEAM 4"];
const recordStorageKey = "ludballScoreRecords";
const dailyRoundStorageKeyPrefix = "ludballRounds:";
const dailyRoundMinimums = {
  "2026-08-29": 38,
};
const defaultScoreRecords = [];
const legacyDefaultRecordIds = new Set(["default-1", "default-2", "default-3"]);
const legacyDefaultRecordKeys = new Set(["이클립스:104", "2위:102", "3위:93"]);

const setupOptions = {
  gameMode: {
    title: "게임 모드",
    options: [
      { value: "score", label: "점수 내기", displayLabel: ["점수", "내기"] },
      { value: "versus", label: "대결 모드", displayLabel: ["대결", "모드"] },
    ],
  },
  teamCount: {
    title: "참여 팀 수",
    options: [
      { value: 1, label: "1팀" },
      { value: 2, label: "2팀" },
      { value: 3, label: "3팀" },
      { value: 4, label: "4팀" },
    ],
  },
  difficulty: {
    title: "난이도",
    options: [
      { value: "easy", label: "EASY", displayLabel: ["EASY"] },
      { value: "middle", label: "MIDDLE", displayLabel: ["MIDDLE"] },
      { value: "hard", label: "HARD", displayLabel: ["HARD"] },
    ],
  },
  duration: {
    title: "제한 시간",
    options: [
      { value: 60, label: "1분" },
      { value: 120, label: "2분" },
      { value: 180, label: "3분" },
      { value: 300, label: "5분" },
    ],
  },
};

const state = {
  teams: [],
  gameMode: "score",
  teamCount: 2,
  difficulty: "easy",
  duration: 120,
  remaining: 120,
  remainingMs: 120000,
  feverTime: 0,
  running: false,
  activeTeamIndex: 0,
  intervalId: null,
  timerEndsAt: null,
  round: 1,
  todayRoundCount: loadTodayRoundCount(),
  bleDevice: null,
  bleServer: null,
  bleNotifyCharacteristic: null,
  bleWriteCharacteristic: null,
  bleConnected: false,
  bleConnecting: false,
  bleBuffer: "",
  bleProfileLabel: "",
  bleConnectedAt: 0,
  lastBleRxAt: 0,
  remoteBleDevice: null,
  remoteBleServer: null,
  remoteBleNotifyCharacteristic: null,
  remoteBleWriteCharacteristic: null,
  remoteBleConnected: false,
  remoteBleConnecting: false,
  remoteBleBuffer: "",
  remoteBleProfileLabel: "",
  remoteBleConnectedAt: 0,
  lastRemoteBleRxAt: 0,
  ballCountActive: false,
  ballCountValue: 0,
  ballCountTeamReady: false,
  phase: "setup",
  countdownActive: false,
  countdownRunId: 0,
  remoteMainButtonLatched: false,
  remoteMainButtonReleaseTimer: null,
  lastRemoteMainButtonPressedAt: 0,
  lastRemoteScorePulseAt: 0,
  pendingRemoteScorePulseTimer: null,
  pendingScoreResultAction: null,
};

const cloudScoreUrl = "https://ludball-usb-page.vercel.app/api/score";
const directEspBaseUrl = "/api";
const bleServiceUuid = "8f7a2d80-4f3b-4e62-9d1d-3c5484e6b201";
const bleNotifyUuid = "8f7a2d81-4f3b-4e62-9d1d-3c5484e6b201";
const bleWriteUuid = "8f7a2d82-4f3b-4e62-9d1d-3c5484e6b201";
const bleProfiles = [
  {
    label: "LUDBALL",
    serviceUuid: bleServiceUuid,
    notifyUuid: bleNotifyUuid,
    writeUuid: bleWriteUuid,
  },
  {
    label: "Nordic UART",
    serviceUuid: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
    notifyUuid: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
    writeUuid: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
  },
  {
    label: "HM-10",
    serviceUuid: "0000ffe0-0000-1000-8000-00805f9b34fb",
    notifyUuid: "0000ffe1-0000-1000-8000-00805f9b34fb",
    writeUuid: "0000ffe1-0000-1000-8000-00805f9b34fb",
  },
  {
    label: "BLE UART",
    serviceUuid: "0000fff0-0000-1000-8000-00805f9b34fb",
    notifyUuid: "0000fff1-0000-1000-8000-00805f9b34fb",
    writeUuid: "0000fff2-0000-1000-8000-00805f9b34fb",
  },
  {
    label: "BLE UART FFF1",
    serviceUuid: "0000fff0-0000-1000-8000-00805f9b34fb",
    notifyUuid: "0000fff1-0000-1000-8000-00805f9b34fb",
    writeUuid: "0000fff1-0000-1000-8000-00805f9b34fb",
  },
  {
    label: "JDY UART",
    serviceUuid: "0000ffe5-0000-1000-8000-00805f9b34fb",
    notifyUuid: "0000ffe4-0000-1000-8000-00805f9b34fb",
    writeUuid: "0000ffe9-0000-1000-8000-00805f9b34fb",
  },
];
const bleOptionalServices = bleProfiles.map((profile) => profile.serviceUuid);
const remoteMainButtonLockMs = 240;
const remoteMainButtonDoublePressMs = 3000;
const remoteScorePulseLockMs = 90;
const remoteScoreFallbackMs = 180;
const defaultBallCountDegrees = 360;
const defaultBallCountSpeed = 2000;

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
const scoreResultModal = document.querySelector("#scoreResultModal");
const scoreResultTitle = document.querySelector("#scoreResultTitle");
const scoreResultValue = document.querySelector("#scoreResultValue");
const scoreResultTeam = document.querySelector("#scoreResultTeam");
const scoreResultClose = document.querySelector("#scoreResultClose");
const startButton = document.querySelector("#startButton");
const bleButton = document.querySelector("#bleButton");
const remoteBleButton = document.querySelector("#remoteBleButton");
const ballCountModal = document.querySelector("#ballCountModal");
const ballCountClose = document.querySelector("#ballCountClose");
const ballCountConnect = document.querySelector("#ballCountConnect");
const ballCountStart = document.querySelector("#ballCountStart");
const ballCountStop = document.querySelector("#ballCountStop");
const ballCountReset = document.querySelector("#ballCountReset");
const ballCountValue = document.querySelector("#ballCountValue");
const ballCountTeam = document.querySelector("#ballCountTeam");
const ballCountStatus = document.querySelector("#ballCountStatus");
const bgmAudio = document.querySelector("#bgmAudio");
const scoreAudio = document.querySelector("#scoreAudio");
const recordAudio = document.querySelector("#recordAudio");

const recordAddButton = document.querySelector("#recordAddButton");
const recordForm = document.querySelector("#recordForm");
const recordNameInput = document.querySelector("#recordNameInput");
const recordScoreInput = document.querySelector("#recordScoreInput");
const recordSubmitButton = document.querySelector("#recordSubmitButton");
const recordCancelButton = document.querySelector("#recordCancelButton");
const recordList = document.querySelector("#recordList");
const recordCelebration = document.querySelector("#recordCelebration");
const celebrationClose = document.querySelector("#celebrationClose");
const celebrationScore = document.querySelector("#celebrationScore");
const celebrationName = document.querySelector("#celebrationName");
const confettiField = document.querySelector("#confettiField");
const settingLabels = {
  gameMode: document.querySelector("#gameModeLabel"),
  teamCount: document.querySelector("#teamCountLabel"),
  difficulty: document.querySelector("#difficultyLabel"),
  duration: document.querySelector("#durationLabel"),
};

let audioUnlocked = false;
let audioContext = null;
let bgmTimer = null;
let bgmStep = 0;
let scoreRecords = loadScoreRecords();
let editingRecordId = null;
let activeRecordId = null;

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  return audioContext;
}

function playTone(frequency, duration = 0.12, volume = 0.12, type = "square", delay = 0) {
  const context = getAudioContext();
  if (!context) return;

  const startAt = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.03);
}

async function unlockAudio() {
  if (audioUnlocked) return;

  const context = getAudioContext();
  let contextReady = !context;
  try {
    if (context?.state === "suspended") await context.resume();
    contextReady = !context || context.state !== "suspended";
  } catch (error) {
    contextReady = false;
  }

  const mediaReady = await Promise.all([scoreAudio, bgmAudio, recordAudio]
    .filter(Boolean)
    .map(unlockMediaElement));
  audioUnlocked = contextReady && mediaReady.every(Boolean);
}

async function unlockMediaElement(audio) {
  const previousVolume = audio.volume;
  const previousMuted = audio.muted;
  try {
    audio.muted = true;
    audio.volume = 0;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    return true;
  } catch (error) {
    return false;
  } finally {
    audio.volume = previousVolume;
    audio.muted = previousMuted;
  }
}

async function playBgm() {
  try {
    await unlockAudio();
    if (bgmAudio) {
      bgmAudio.muted = false;
      bgmAudio.volume = 0.7;
      await bgmAudio.play();
      return;
    }
  } catch (error) {
  }
  await startGeneratedBgm();
}

async function startGeneratedBgm() {
  const context = getAudioContext();
  if (context?.state === "suspended") await context.resume();
  if (bgmTimer) return;
  const notes = [196, 247, 294, 247, 220, 262, 330, 262];
  bgmTimer = window.setInterval(() => {
    const note = notes[bgmStep % notes.length];
    playTone(note, 0.16, 0.055, "sawtooth");
    if (bgmStep % 2 === 0) playTone(note / 2, 0.18, 0.04, "triangle", 0.01);
    bgmStep += 1;
  }, 220);
}

function pauseBgm() {
  if (bgmAudio) bgmAudio.pause();
  window.clearInterval(bgmTimer);
  bgmTimer = null;
}

async function playScoreSound() {
  try {
    await unlockAudio();
    if (scoreAudio) {
      const sound = scoreAudio.cloneNode(true);
      sound.volume = 1;
      sound.currentTime = 0;
      sound.addEventListener("ended", () => sound.remove(), { once: true });
      document.body.append(sound);
      await sound.play();
      return;
    }
  } catch (error) {
  }

  playTone(880, 0.08, 0.22, "square");
  playTone(1320, 0.10, 0.18, "square", 0.06);
}

function playScoreBurst(count = 1) {
  const plays = Math.max(1, Math.min(6, Number(count) || 1));
  for (let index = 0; index < plays; index += 1) {
    if (index === 0) {
      playScoreSound();
    } else {
      window.setTimeout(playScoreSound, index * 90);
    }
  }
}

async function playRecordCelebrationSound() {
  try {
    await unlockAudio();
    if (recordAudio) {
      const sound = recordAudio.cloneNode(true);
      sound.volume = 0.95;
      sound.currentTime = 0;
      sound.addEventListener("ended", () => sound.remove(), { once: true });
      document.body.append(sound);
      await sound.play();
      return;
    }
  } catch (error) {
  }

  playTone(523, 0.12, 0.18, "square");
  playTone(659, 0.12, 0.18, "square", 0.08);
  playTone(784, 0.16, 0.2, "square", 0.16);
  playTone(1047, 0.3, 0.18, "triangle", 0.28);
}

function renderConfetti() {
  if (!confettiField) return;
  const colors = ["#42ffd2", "#5ffcff", "#2cff9a", "#ffffff", "#b8fff1"];
  confettiField.innerHTML = Array.from({ length: 58 }, (_, index) => {
    const x = 5 + Math.random() * 90;
    const delay = Math.random() * 0.36;
    const duration = 1.1 + Math.random() * 0.9;
    const color = colors[index % colors.length];
    const rotate = Math.round(Math.random() * 360);
    return `<i style="--x:${x}%;--delay:${delay}s;--duration:${duration}s;--color:${color};--rotate:${rotate}deg"></i>`;
  }).join("");
}

function showRecordCelebration(record) {
  if (!recordCelebration) return;
  celebrationScore.textContent = `${record.score}점`;
  celebrationName.textContent = record.name;
  renderConfetti();
  document.body.classList.add("is-record-celebrating");
  recordCelebration.classList.remove("hidden");
  playRecordCelebrationSound();
}

function hideRecordCelebration() {
  recordCelebration?.classList.add("hidden");
  document.body.classList.remove("is-record-celebrating");
}

function showScoreResultModal(team, onClose) {
  if (!scoreResultModal || !team) {
    onClose?.();
    return;
  }

  scoreResultTitle.textContent = "이번 점수";
  scoreResultValue.textContent = `${team.score}점`;
  scoreResultTeam.textContent = team.name;
  state.pendingScoreResultAction = onClose || null;
  scoreResultModal.classList.remove("hidden");
  scoreResultClose?.focus({ preventScroll: true });
}

function isScoreResultModalOpen() {
  return Boolean(scoreResultModal && !scoreResultModal.classList.contains("hidden"));
}

function hideScoreResultModal({ runAction = true } = {}) {
  if (!scoreResultModal || scoreResultModal.classList.contains("hidden")) return;
  scoreResultModal.classList.add("hidden");
  const action = state.pendingScoreResultAction;
  state.pendingScoreResultAction = null;
  if (runAction) action?.();
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

function loadScoreRecords() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(recordStorageKey) || "[]");
    if (!Array.isArray(parsed)) return [...defaultScoreRecords];
    const records = parsed
      .map((record, index) => ({
        id: String(record.id || `saved-${Date.now()}-${index}`),
        name: String(record.name || "").trim() || "기록",
        score: Math.max(0, Math.min(999, Math.trunc(Number(record.score) || 0))),
      }))
      .filter((record) => record.score > 0)
      .filter((record) => {
        if (legacyDefaultRecordIds.has(record.id)) return false;
        return !legacyDefaultRecordKeys.has(`${record.name}:${record.score}`);
      });
    window.localStorage.setItem(recordStorageKey, JSON.stringify(records));
    return records;
  } catch (error) {
    return [...defaultScoreRecords];
  }
}

function saveScoreRecords() {
  window.localStorage.setItem(recordStorageKey, JSON.stringify(scoreRecords));
}

function todayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayRoundStorageKey() {
  return `${dailyRoundStorageKeyPrefix}${todayDateKey()}`;
}

function todayRoundMinimum() {
  return dailyRoundMinimums[todayDateKey()] || 0;
}

function normalizeTodayRoundCount(value) {
  return Math.max(todayRoundMinimum(), 0, Math.trunc(Number(value) || 0));
}

function seedTodayRoundCountIfNeeded(count) {
  if (count <= 0) {
    return;
  }
  try {
    const key = todayRoundStorageKey();
    const storedCount = Math.max(0, Math.trunc(Number(window.localStorage.getItem(key)) || 0));
    if (storedCount < count) {
      window.localStorage.setItem(key, String(count));
    }
  } catch (error) {
  }
}

function loadTodayRoundCount() {
  try {
    const count = normalizeTodayRoundCount(window.localStorage.getItem(todayRoundStorageKey()));
    seedTodayRoundCountIfNeeded(count);
    return count;
  } catch (error) {
    return todayRoundMinimum();
  }
}

function saveTodayRoundCount() {
  try {
    window.localStorage.setItem(todayRoundStorageKey(), String(state.todayRoundCount));
  } catch (error) {
  }
}

function incrementTodayRoundCount() {
  state.todayRoundCount += 1;
  saveTodayRoundCount();
  renderRoundLabel();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character]);
}

function renderScoreRecords() {
  if (!recordList) return;
  const sortedRecords = [...scoreRecords].sort((a, b) => b.score - a.score);
  const scoreCounts = sortedRecords.reduce((counts, record) => {
    counts.set(record.score, (counts.get(record.score) || 0) + 1);
    return counts;
  }, new Map());
  let displayRank = 0;
  let previousScore = null;
  recordList.innerHTML = sortedRecords
    .map((record, index) => {
      if (record.score !== previousScore) {
        displayRank += 1;
        previousScore = record.score;
      }
      const rankLabel = scoreCounts.get(record.score) > 1
        ? `공동 ${displayRank}위`
        : `${displayRank}위`;

      return `
        <li
          data-record-id="${escapeHtml(record.id)}"
          class="${record.id === activeRecordId ? "is-active" : ""}"
          tabindex="0"
          aria-expanded="${record.id === activeRecordId ? "true" : "false"}"
        >
          <div class="record-main">
            <span>${rankLabel} ${escapeHtml(record.name)}</span>
            <b>${record.score}점</b>
          </div>
          <div class="record-actions" aria-label="${escapeHtml(record.name)} 기록 관리">
            <button type="button" data-record-action="edit">수정</button>
            <button type="button" data-record-action="delete">삭제</button>
          </div>
        </li>
      `;
    })
    .join("");
}

function resetRecordForm() {
  editingRecordId = null;
  recordNameInput.value = "";
  recordScoreInput.value = "";
  recordSubmitButton.textContent = "점수 기록하기";
  recordCancelButton.classList.add("hidden");
  recordForm.classList.add("hidden");
}

function setActiveRecord(recordId = null) {
  activeRecordId = activeRecordId === recordId ? null : recordId;
  renderScoreRecords();
}

function openRecordForm(record = null) {
  editingRecordId = record?.id || null;
  recordNameInput.value = record?.name || "";
  recordScoreInput.value = record?.score || "";
  recordSubmitButton.textContent = record ? "수정 저장" : "점수 기록하기";
  recordCancelButton.classList.toggle("hidden", !record);
  recordForm.classList.remove("hidden");
  recordNameInput.focus();
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
  if (state.gameMode === "versus") {
    settingLabels.teamCount.innerHTML = "<span>2팀</span><span>2명씩</span>";
  }
  renderTeamInputs();
}

function openSettingModal(settingKey) {
  const config = setupOptions[settingKey];
  modalTitle.textContent = config.title;
  modalOptions.innerHTML = "";

  const options = settingKey === "teamCount" && state.gameMode === "versus"
    ? [{ value: 2, label: "2팀 · 2명씩" }]
    : config.options;

  options.forEach((option) => {
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

function normalizeSetupState(changedKey = "") {
  if (state.gameMode === "versus") {
    state.teamCount = 2;
  } else if (changedKey === "gameMode" && state.teamCount < 1) {
    state.teamCount = 1;
  }
}

function showScreen(screen) {
  [setupScreen, gameScreen, resultScreen].forEach((target) => target.classList.add("hidden"));
  screen.classList.remove("hidden");
}

function buildGameFromSetup() {
  stopTimer();
  state.remaining = state.duration;
  state.remainingMs = state.duration * 1000;
  state.running = false;
  state.phase = "ready";
  state.countdownActive = false;
  state.activeTeamIndex = 0;
  state.ballCountTeamReady = false;
  state.teams = Array.from({ length: state.teamCount }, (_, index) => ({
    name: defaultNames[index],
    score: 0,
    completed: false,
    accent: accents[index % accents.length],
  }));

  renderGame();
  showScreen(gameScreen);
  eventMarquee.textContent = state.gameMode === "versus"
    ? `대결 모드 READY · 2팀 / 2명씩 · ${labelFor("difficulty")}`
    : `점수 내기 READY · ${labelFor("difficulty")} · 기록 도전`;
}

function readyGameFromSetup() {
  unlockAudio();
  buildGameFromSetup();
  sendEspCommand("READY");
}

function renderRoundLabel() {
  roundLabel.textContent = `ROUND ${String(state.round).padStart(2, "0")} · 오늘 총 ${state.todayRoundCount}R`;
}

function renderGame() {
  timerText.textContent = formatClock(state.remainingMs);
  renderRoundLabel();
  modeLabel.textContent = state.gameMode === "versus"
    ? `VERSUS · ${labelFor("difficulty")}`
    : `SCORE TRIAL · ${labelFor("difficulty")}`;
  gameScreen.classList.toggle("is-single-player", state.teamCount === 1);
  scoreGrid.classList.toggle("is-single-player", state.teamCount === 1);
  scoreGrid.style.gridTemplateColumns = `repeat(${Math.min(state.teams.length, 4)}, minmax(0, 1fr))`;
  scoreGrid.innerHTML = "";

  state.teams.forEach((team, index) => {
    const card = document.createElement("article");
    card.className = "team-card";
    card.classList.toggle("is-active", index === state.activeTeamIndex);
    card.classList.toggle("is-complete", team.completed);
    card.style.setProperty("--accent", team.accent);
    card.dataset.teamIndex = String(index);
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${team.name} 선택`);
    const statusLabel = state.teamCount === 1
      ? "1 PLAYER"
      : index === state.activeTeamIndex
        ? "ACTIVE"
        : team.completed ? "DONE" : "TEAM SELECT";
    card.innerHTML = `
      <div class="team-name">
        <span>${team.name}</span>
      </div>
      <div class="score-value" aria-label="${team.name} 점수">${team.score}</div>
      <div class="team-status">${statusLabel}</div>
    `;
    scoreGrid.append(card);
  });

  updateFeverState();
}

function sortedTeams() {
  return [...state.teams].sort((a, b) => b.score - a.score);
}

function rankedTeams() {
  let previousScore = null;
  let currentRank = 0;

  return sortedTeams().map((team) => {
    if (team.score !== previousScore) {
      currentRank += 1;
      previousScore = team.score;
    }
    return { team, rank: currentRank };
  });
}

function renderResultBoard() {
  const ranked = rankedTeams();
  const winner = ranked[0]?.team;
  if (!winner) return;
  const tied = ranked.filter(({ team }) => team.score === winner.score);

  winnerText.textContent = tied.length > 1 ? "공동 1등" : `${winner.name} WIN`;
  const resultPrefix = state.gameMode === "versus" ? "대결" : "점수 내기";
  resultSummary.textContent = tied.length > 1
    ? `${tied.map(({ team }) => team.name).join(" · ")} · ${winner.score}점`
    : `${resultPrefix} 우승 · ${winner.score}점`;

  podium.innerHTML = ranked
    .map(({ team, rank }, index) => {
      const originalIndex = state.teams.indexOf(team);
      const isTied = ranked.some(({ team: otherTeam, rank: otherRank }, otherIndex) => (
        otherIndex !== index && otherRank === rank && otherTeam.score === team.score
      ));
      const rankLabel = isTied ? `공동 ${rank}등` : `${rank}등`;
      return `
        <div class="podium-row" data-team-index="${originalIndex}">
          <span>${rankLabel}. ${team.name}</span>
          <div class="podium-score-edit" aria-label="${team.name} 결과 점수 수동 수정">
            <input
              class="manual-score-input"
              type="number"
              inputmode="numeric"
              min="0"
              max="999"
              step="1"
              value="${team.score}"
              data-score-input
              aria-label="${team.name} 점수 직접 입력"
            />
          </div>
        </div>
      `;
    })
    .join("");
}

function setManualScore(index, value, { announce = true, playSound = false, rerender = true } = {}) {
  const team = state.teams[index];
  if (!team) return;

  const nextScore = Math.max(0, Math.min(999, Math.trunc(Number(value) || 0)));
  const previousScore = team.score;
  team.score = nextScore;

  if (playSound && nextScore > previousScore) playScoreBurst(Math.min(6, nextScore - previousScore));
  if (announce) {
    const delta = nextScore - previousScore;
    const deltaLabel = delta === 0 ? "수정" : delta > 0 ? `+${delta}` : String(delta);
    eventMarquee.textContent = `${team.name} ${deltaLabel} · SCORE ${team.score}`;
  }

  if (!rerender) return;
  if (!resultScreen.classList.contains("hidden")) {
    renderResultBoard();
    return;
  }
  renderGame();
}

function addScore(index, point) {
  if (!state.running) return;
  const team = state.teams[index];
  if (!team) return;

  const gained = Math.max(0, point);
  if (gained > 0) playScoreBurst(1);
  team.score = Math.max(0, team.score + gained);
  eventMarquee.textContent = `${team.name} +${gained} · SCORE ${team.score}`;
  renderGame();
}

function ensureTeamScoreSlot(index) {
  if (index < 0 || index > 3) return null;
  while (state.teams.length <= index) {
    const nextIndex = state.teams.length;
    state.teams.push({
      name: defaultNames[nextIndex],
      score: 0,
      completed: false,
      accent: accents[nextIndex % accents.length],
    });
  }
  if (state.teamCount <= index) {
    state.teamCount = index + 1;
    state.gameMode = state.teamCount > 1 ? "versus" : "score";
    normalizeSetupState("teamCount");
    renderSetupLabels();
  }
  return state.teams[index];
}

function addManualTeamScore(index, point = 1) {
  const team = state.teams[index];
  if (!team) return;
  const delta = Math.trunc(Number(point) || 0);
  if (delta === 0) return;
  const previousScore = team.score;
  team.score = Math.max(0, Math.min(999, team.score + delta));
  const appliedDelta = team.score - previousScore;
  const deltaLabel = appliedDelta > 0 ? `+${appliedDelta}` : String(appliedDelta);
  eventMarquee.textContent = `KEY ${index + 1} · ${team.name} ${deltaLabel} · SCORE ${team.score}`;
  if (appliedDelta > 0) playScoreBurst(Math.min(6, appliedDelta));
  if (!resultScreen.classList.contains("hidden")) renderResultBoard();
  renderGame();
}

function adjustActiveTeamScore(delta) {
  const team = state.teams[state.activeTeamIndex];
  if (!team) return;
  setManualScore(state.activeTeamIndex, team.score + delta, { playSound: delta > 0 });
}

function isBallCountModalOpen() {
  return ballCountModal && !ballCountModal.classList.contains("hidden");
}

function suspendMainGameForBallCount() {
  if (state.countdownActive) {
    state.countdownActive = false;
    hideCountdown();
    startButton.disabled = false;
  }

  if (state.running || state.timerEndsAt) {
    pauseGame();
  } else {
    stopTimer();
  }
}

function updateBallCountUi(message = "") {
  const team = state.teams[state.activeTeamIndex];
  const bleLive = isBleActuallyConnected();
  const displayMessage = sanitizeEspDisplayMessage(message);
  if (ballCountValue) ballCountValue.textContent = String(state.ballCountValue);
  if (ballCountTeam) ballCountTeam.textContent = team?.name || "TEAM";
  if (ballCountConnect) {
    ballCountConnect.textContent = bleLive ? "BLE 연결됨" : "BLE 연결";
    ballCountConnect.classList.toggle("is-connected", bleLive);
  }
  if (ballCountStatus) {
    ballCountStatus.textContent = displayMessage || (
      bleLive
        ? `${team?.name || "팀"} 점수 세기 연결됨`
        : `${team?.name || "팀"} 선택됨 · BLE 연결 대기`
    );
  }
}

function isEspStatusText(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  return /^(?:ESP\s*[•·-]\s*)?STATUS\s*:/i.test(text) ||
    /"?(?:COUNT|IR|BITS|ENABLED|RUNNING|MOTION|REMAINING)"?\s*[:=]/i.test(text);
}

function sanitizeEspDisplayMessage(message) {
  return isEspStatusText(message) ? "" : String(message || "");
}

function setEventMessage(message) {
  const displayMessage = sanitizeEspDisplayMessage(message);
  if (displayMessage && eventMarquee) eventMarquee.textContent = displayMessage;
}

function sanitizeEventMarqueeNow() {
  if (!eventMarquee || !isEspStatusText(eventMarquee.textContent)) return;
  eventMarquee.textContent = isBleActuallyConnected()
    ? "BLE 연결됨 · 센서 데이터 수신 대기"
    : "READY · READY · READY";
}

if (eventMarquee && "MutationObserver" in window) {
  const eventMarqueeObserver = new MutationObserver(sanitizeEventMarqueeNow);
  eventMarqueeObserver.observe(eventMarquee, { childList: true, characterData: true, subtree: true });
}

function isBleActuallyConnected() {
  return Boolean(
    state.bleConnected &&
    state.bleDevice?.gatt?.connected &&
    state.bleWriteCharacteristic
  );
}

function openBallCountModal(teamIndex = state.activeTeamIndex) {
  if (!state.teams.length || !setupScreen.classList.contains("hidden")) {
    buildGameFromSetup();
  }
  const normalizedTeamIndex = Math.max(0, Math.min(state.teams.length - 1, Number(teamIndex) || 0));
  if (state.teams[normalizedTeamIndex] && !state.running && !state.countdownActive) {
    state.activeTeamIndex = normalizedTeamIndex;
    state.phase = "ready";
    state.ballCountTeamReady = true;
    setRemainingMs(state.duration * 1000);
    startButton.disabled = false;
    eventMarquee.textContent = `${state.teams[normalizedTeamIndex].name} SCORE COUNT · 점수 세기 준비`;
    renderGame();
    sendEspCommand("READY");
  }
  suspendMainGameForBallCount();
  ballCountModal?.classList.remove("hidden");
  updateBallCountUi();
}

function closeBallCountModal() {
  ballCountModal?.classList.add("hidden");
}

async function postBallCountToCloud(score) {
  try {
    await fetch(cloudScoreUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        score,
        hits: score,
        running: state.ballCountActive,
        reason: "ble-ball-count",
      }),
    });
  } catch (error) {
    eventMarquee.textContent = `SCORE SYNC 실패 · ${error.message || error}`;
  }
}

function applyBallCountScore(nextScore) {
  const normalizedScore = Math.max(0, Math.min(999, Math.trunc(Number(nextScore) || 0)));
  const previousSensorScore = state.ballCountValue;
  if (normalizedScore < previousSensorScore) {
    state.ballCountValue = normalizedScore;
    updateBallCountUi("IR 카운터 리셋");
    return;
  }
  if (normalizedScore === previousSensorScore) return;

  const gained = normalizedScore - previousSensorScore;
  state.ballCountValue = normalizedScore;
  const team = state.teams[state.activeTeamIndex];
  if (team) {
    team.score = Math.max(0, Math.min(999, team.score + gained));
    playScoreBurst(Math.min(6, gained));
    renderGame();
  }
  updateBallCountUi("IR 감지됨 · 점수 반영");
  void postBallCountToCloud(normalizedScore);
}

function applyRemoteScorePulse(source = "SENSOR") {
  const team = state.teams[state.activeTeamIndex];
  if (!team) return;

  const now = performance.now();
  if (now - state.lastRemoteScorePulseAt < remoteScorePulseLockMs) {
    return;
  }
  state.lastRemoteScorePulseAt = now;

  if (isBallCountModalOpen() || state.ballCountActive) {
    applyBallCountScore(state.ballCountValue + 1);
    updateBallCountUi(`IR 감지됨 · ${source}`);
    return;
  }

  state.ballCountValue = Math.max(0, Math.min(999, state.ballCountValue + 1));
  team.score = Math.max(0, Math.min(999, team.score + 1));
  playScoreBurst(1);
  eventMarquee.textContent = `ESP GOAL · ${team.name} +1`;
  renderGame();
}

function clearPendingRemoteScorePulse() {
  if (!state.pendingRemoteScorePulseTimer) return;
  window.clearTimeout(state.pendingRemoteScorePulseTimer);
  state.pendingRemoteScorePulseTimer = null;
}

function queueRemoteScorePulseFallback(source = "SENSOR") {
  clearPendingRemoteScorePulse();
  state.pendingRemoteScorePulseTimer = window.setTimeout(() => {
    state.pendingRemoteScorePulseTimer = null;
    applyRemoteScorePulse(source);
  }, remoteScoreFallbackMs);
}

function noteSensorSignal(source = "SENSOR", { fallback = true, quiet = false } = {}) {
  if (isBallCountModalOpen() || state.ballCountActive) {
    updateBallCountUi(`IR 감지됨 · ${source} · 점수 수신 대기`);
  }
  if (!quiet) {
    eventMarquee.textContent = `ESP SENSOR · ${source} · SCORE 대기`;
  }
  if (fallback) queueRemoteScorePulseFallback(source);
}

function applyIncomingScoreValue(nextScore, { silent = false } = {}) {
  const team = state.teams[state.activeTeamIndex];
  if (!team) return;

  clearPendingRemoteScorePulse();

  const normalizedScore = Math.max(0, Math.min(999, Math.trunc(Number(nextScore) || 0)));

  if (isBallCountModalOpen() || state.ballCountActive) {
    applyBallCountScore(normalizedScore);
    return;
  }

  const previousSensorScore = state.ballCountValue;
  if (normalizedScore < previousSensorScore) {
    state.ballCountValue = normalizedScore;
    return;
  }
  const gained = normalizedScore - previousSensorScore;
  if (gained === 0) return;
  if (gained > 0) playScoreBurst(gained);
  state.ballCountValue = normalizedScore;
  team.score = Math.max(0, Math.min(999, team.score + gained));
  if (!silent) {
    eventMarquee.textContent = `ESP SCORE · ${team.name} +${gained} · TOTAL ${team.score}`;
  }
  renderGame();
}

async function connectBallCountBle() {
  const connected = await connectEspBle();
  const team = state.teams[state.activeTeamIndex];
  updateBallCountUi(connected ? `${team?.name || "팀"} 점수 세기 연결됨` : "BLE 연결 실패 · 보드 전원/이름 확인");
  return connected;
}

async function sendBallCountCommand(command, message = "") {
  if (!isBleActuallyConnected() && !(await connectBallCountBle())) return false;
  const sent = await sendEspCommand(command);
  updateBallCountUi(sent ? message : "명령 전송 실패 · BLE 연결 확인");
  return sent;
}

async function startBallCounting() {
  await unlockAudio();
  if (!state.teams.length || !gameScreen || gameScreen.classList.contains("hidden")) {
    buildGameFromSetup();
  }
  suspendMainGameForBallCount();
  state.ballCountActive = true;
  state.ballCountValue = 0;
  const team = state.teams[state.activeTeamIndex];
  if (team) team.score = 0;
  renderGame();
  updateBallCountUi(`${team?.name || "팀"} 점수 세기 준비`);

  await sendBallCountCommand("RESET", "점수 리셋");
  await sendBallCountCommand(`SPEED ${defaultBallCountSpeed}`, `속도 ${defaultBallCountSpeed}us 설정`);
  await sendBallCountCommand("START", "IR 점수 감지 대기 중");
  void sendEspCommand("GO");
  await sendBallCountCommand(`ROT ${defaultBallCountDegrees}`, `${defaultBallCountDegrees}도 천천히 회전 · 점수 집계 중`);
}

async function stopBallCounting() {
  state.ballCountActive = false;
  await sendBallCountCommand("FINISH", "점수 세기 정지");
}

async function resetBallCounting() {
  if (blockResetWhileRunning("SCORE RESET")) return;
  state.ballCountActive = false;
  state.ballCountValue = 0;
  const team = state.teams[state.activeTeamIndex];
  if (team) team.score = 0;
  renderGame();
  updateBallCountUi("점수 리셋");
  await sendBallCountCommand("RESET", "점수 리셋");
}

async function pressMainRemoteButton() {
  if (state.countdownActive) return;

  if (!setupScreen.classList.contains("hidden")) {
    readyGameFromSetup();
    return;
  }

  if (state.running) {
    pauseGame();
    return;
  }

  if (!resultScreen.classList.contains("hidden") || state.phase === "ended") {
    resetGame(true);
    return;
  }

  if (!state.teams.length) {
    readyGameFromSetup();
    return;
  }

  runCountdownAndStart();
}

function switchPlayModeFromRemoteDoublePress() {
  window.clearTimeout(state.remoteMainButtonReleaseTimer);
  state.remoteMainButtonLatched = false;
  state.remoteMainButtonReleaseTimer = null;
  state.lastRemoteMainButtonPressedAt = 0;

  if (state.countdownActive) {
    cancelCountdown();
  }
  if (state.running) {
    pauseGame({ sendCommand: false });
  } else {
    stopTimer();
  }

  state.gameMode = "score";
  state.teamCount = state.teamCount === 1 ? 2 : 1;
  normalizeSetupState("gameMode");
  renderSetupLabels();
  buildGameFromSetup();
  eventMarquee.textContent = state.teamCount === 1
    ? "REMOTE DOUBLE · 1인 플레이"
    : "REMOTE DOUBLE · 일반 플레이";
}

function toggleTeamOneModeFromShortcut() {
  if (state.countdownActive) {
    cancelCountdown();
  }
  if (state.running) {
    pauseGame({ sendCommand: false });
  } else {
    stopTimer();
  }

  state.gameMode = "score";
  state.teamCount = state.teamCount === 1 ? 2 : 1;
  normalizeSetupState("gameMode");
  renderSetupLabels();
  buildGameFromSetup();
  eventMarquee.textContent = state.teamCount === 1
    ? "CMD + M · TEAM 1"
    : "CMD + M · 일반 플레이";
}

function handleRemoteMainButtonPress() {
  window.clearTimeout(state.remoteMainButtonReleaseTimer);

  if (isScoreResultModalOpen()) {
    hideScoreResultModal();
    return;
  }

  const now = Date.now();
  const isEnded = !resultScreen.classList.contains("hidden") || state.phase === "ended";
  if (
    !isEnded &&
    state.lastRemoteMainButtonPressedAt &&
    now - state.lastRemoteMainButtonPressedAt <= remoteMainButtonDoublePressMs
  ) {
    switchPlayModeFromRemoteDoublePress();
    return;
  }
  state.lastRemoteMainButtonPressedAt = now;

  if (state.running) {
    state.remoteMainButtonLatched = true;
    pauseGame();
    state.remoteMainButtonReleaseTimer = window.setTimeout(() => {
      state.remoteMainButtonLatched = false;
      state.remoteMainButtonReleaseTimer = null;
    }, remoteMainButtonLockMs);
    return;
  }

  if (state.remoteMainButtonLatched) {
    state.remoteMainButtonReleaseTimer = window.setTimeout(() => {
      state.remoteMainButtonLatched = false;
      state.remoteMainButtonReleaseTimer = null;
    }, remoteMainButtonLockMs);
    return;
  }

  state.remoteMainButtonLatched = true;
  state.remoteMainButtonReleaseTimer = window.setTimeout(() => {
    state.remoteMainButtonLatched = false;
    state.remoteMainButtonReleaseTimer = null;
  }, remoteMainButtonLockMs);
  void pressMainRemoteButton();
}

function cycleTeam(direction = 1) {
  if (!state.teams.length) return;
  const nextIndex = (state.activeTeamIndex + direction + state.teams.length) % state.teams.length;
  selectTeam(nextIndex);
}

function cycleSetting(settingKey, direction = 1) {
  const config = setupOptions[settingKey];
  if (!config || state.running || state.countdownActive) return;

  const options = settingKey === "teamCount" && state.gameMode === "versus"
    ? [{ value: 2, label: "2팀 · 2명씩" }]
    : config.options;
  const currentIndex = Math.max(0, options.findIndex((option) => option.value === state[settingKey]));
  const nextOption = options[(currentIndex + direction + options.length) % options.length];
  state[settingKey] = nextOption.value;
  normalizeSetupState(settingKey);
  renderSetupLabels();

  if (!setupScreen.classList.contains("hidden")) return;
  buildGameFromSetup();
}

function handleOperatorCommand(command) {
  const normalized = String(command || "").trim().toUpperCase();
  if (!normalized) return false;

  const teamMatch = normalized.match(/^(?:TEAM|SELECT_TEAM):?([1-4])$/);
  if (teamMatch) {
    selectTeam(Number(teamMatch[1]) - 1);
    return true;
  }

  const durationMatch = normalized.match(/^DURATION:?([0-9]+)$/);
  if (durationMatch) {
    const nextDuration = Number(durationMatch[1]);
    if (setupOptions.duration.options.some((option) => option.value === nextDuration)) {
      state.duration = nextDuration;
      setRemainingMs(nextDuration * 1000);
      renderSetupLabels();
      renderGame();
      eventMarquee.textContent = `REMOTE · 제한 시간 ${labelFor("duration")}`;
    }
    return true;
  }

  const difficultyMatch = normalized.match(/^DIFFICULTY:?(EASY|MIDDLE|HARD)$/);
  if (difficultyMatch) {
    state.difficulty = difficultyMatch[1].toLowerCase();
    renderSetupLabels();
    renderGame();
    eventMarquee.textContent = `REMOTE · ${labelFor("difficulty")}`;
    return true;
  }

  const modeMatch = normalized.match(/^MODE:?(SCORE|VERSUS)$/);
  if (modeMatch) {
    state.gameMode = modeMatch[1].toLowerCase() === "versus" ? "versus" : "score";
    normalizeSetupState("gameMode");
    renderSetupLabels();
    buildGameFromSetup();
    eventMarquee.textContent = `REMOTE · ${state.gameMode === "versus" ? "대결 모드" : "점수 내기"}`;
    return true;
  }

  const teamScoreMatch = normalized.match(/^TEAM_SCORE:([1-4])$/);
  if (teamScoreMatch) {
    const index = Number(teamScoreMatch[1]) - 1;
    addManualTeamScore(index, 1);
    return true;
  }

  const teamScoreMinusMatch = normalized.match(/^TEAM_SCORE_MINUS:([1-4])$/);
  if (teamScoreMinusMatch) {
    const index = Number(teamScoreMinusMatch[1]) - 1;
    addManualTeamScore(index, -1);
    return true;
  }

  switch (normalized) {
    case "READY":
      if (isBallCountModalOpen() || state.ballCountActive) {
        return true;
      }
      if (!setupScreen.classList.contains("hidden")) readyGameFromSetup();
      else resetGame(true);
      return true;
    case "START":
    case "GO":
      if (isBallCountModalOpen() || state.ballCountActive) {
        updateBallCountUi("IR 점수 감지 실행 중");
        return true;
      }
      handleRemoteMainButtonPress();
      return true;
    case "PAUSE":
      if (state.running) pauseGame();
      return true;
    case "TOGGLE":
    case "PLAY_PAUSE":
      handleRemoteMainButtonPress();
      return true;
    case "RESET":
      if (isBallCountModalOpen() || state.ballCountActive) {
        updateBallCountUi("점수 리셋");
        return true;
      }
      if (blockResetWhileRunning("REMOTE RESET")) return true;
      resetGame(true);
      return true;
    case "FINISH":
      if (isBallCountModalOpen() || state.ballCountActive) {
        updateBallCountUi("점수 세기 정지");
        return true;
      }
      if (state.running) pauseGame();
      return true;
    case "OPTION":
    case "SETUP":
      pauseGame();
      showScreen(setupScreen);
      return true;
    case "NEXT_TEAM":
      cycleTeam(1);
      return true;
    case "PREV_TEAM":
      cycleTeam(-1);
      return true;
    case "SCORE_PLUS":
    case "SCORE:+1":
    case "+1":
    case "PLUS":
      state.running ? addScore(state.activeTeamIndex, 1) : adjustActiveTeamScore(1);
      return true;
    case "SCORE_MINUS":
    case "SCORE:-1":
    case "-1":
    case "MINUS":
      adjustActiveTeamScore(-1);
      return true;
    case "MODE_NEXT":
      cycleSetting("gameMode", 1);
      return true;
    case "DIFFICULTY_NEXT":
      cycleSetting("difficulty", 1);
      return true;
    case "DURATION_NEXT":
      cycleSetting("duration", 1);
      return true;
    default:
      return false;
  }
}

function handleEspLine(line) {
  const rawLine = String(line || "").trim();
  const message = rawLine.toUpperCase();
  if (!message) return;

  if (isEspStatusText(rawLine)) {
    const statusPayload = rawLine.replace(/^(?:ESP\s*[•·-]\s*)?STATUS\s*:/i, "");
    handleBleLooseMessage(statusPayload);
    return;
  }

  if (message.startsWith("ACK:")) {
    const ack = message.slice(4).trim();
    if (ack && !["READY", "START", "GO", "FINISH"].includes(ack)) {
      eventMarquee.textContent = `ESP ACK · ${ack.slice(0, 24)}`;
    }
    return;
  }

  if (message.startsWith("STATUS:")) {
    handleBleLooseMessage(rawLine.slice(rawLine.indexOf(":") + 1));
    return;
  }

  if (["RESET_CURRENT_TEAM", "RESET_TEAM", "TEAM_RESET"].includes(message)) {
    if (blockResetWhileRunning("ESP RESET")) return;
    const team = state.teams[state.activeTeamIndex];
    if (team) {
      team.score = 0;
      team.completed = false;
      if (!state.running && !state.countdownActive) {
        state.phase = "ready";
        setRemainingMs(state.duration * 1000);
        startButton.disabled = false;
      }
      eventMarquee.textContent = `ESP RESET · ${team.name}`;
      renderGame();
      renderResultBoard();
    }
    return;
  }

  if (["SCORE_PLUS", "SCORE:+1", "+1", "PLUS"].includes(message)) {
    applyRemoteScorePulse(message);
    return;
  }

  if (handleOperatorCommand(message.replace(/^REMOTE:/, ""))) return;

  const scoreMatch = message.match(/^SCORE:(\d+)$/);
  if (scoreMatch) {
    applyIncomingScoreValue(Number(scoreMatch[1]));
    return;
  }

  if (/^[+]?\s*1$/.test(message)) {
    applyRemoteScorePulse("RAW 1");
    return;
  }

  if (/^\d{1,3}$/.test(message)) {
    applyIncomingScoreValue(Number(message));
    return;
  }

  const hitMatch = message.match(/^(?:HIT|GOAL|DETECT)(?::|\s+)?(.+)?$/);
  if (hitMatch) {
    noteSensorSignal(hitMatch[1] || "SENSOR");
    return;
  }

  if (message.startsWith("SCORE_PLUS")) {
    noteSensorSignal(message.split(/\s+/)[1] || "SCORE_PLUS");
    return;
  }

  if (message.startsWith("SENSOR_ON") || message.startsWith("IR_ON")) {
    noteSensorSignal(message.split(/\s+/)[1] || "SENSOR", { fallback: false, quiet: true });
    return;
  }

  if (["TEAM1", "TEAM1+1", "BOOT", "GOAL:1"].includes(message)) {
    applyRemoteScorePulse(message);
    return;
  }

  if (message === "D4") {
    applyRemoteScorePulse("REMOTE D4");
    return;
  }
}

function handleBleLooseMessage(rawText) {
  const rawMessage = String(rawText || "").trim();
  if (!rawMessage) return false;

  const statusPrefixMatch = rawMessage.match(/^STATUS\s*:\s*(.+)$/i);
  if (statusPrefixMatch) {
    return handleBleLooseMessage(statusPrefixMatch[1]);
  }

  try {
    const parsed = JSON.parse(rawMessage);
    const isStatusPayload = (
      parsed.bits !== undefined ||
      parsed.enabled !== undefined ||
      parsed.running !== undefined ||
      parsed.motion !== undefined ||
      parsed.remaining !== undefined ||
      parsed.ir !== undefined ||
      parsed.count !== undefined
    );
    const score = parsed.score ?? parsed.count ?? parsed.hits;
    if (score !== undefined && Number.isFinite(Number(score))) {
      applyIncomingScoreValue(Number(score), { silent: isStatusPayload });
      return true;
    }
    if (isStatusPayload) return true;
    const eventName = String(parsed.event || parsed.type || parsed.status || "").toUpperCase();
    if (/HIT|GOAL|DETECT|SCORE_PLUS/.test(eventName)) {
      noteSensorSignal(eventName);
      return true;
    }
  } catch (error) {
  }

  const normalized = rawMessage.toUpperCase();
  if (isEspStatusText(normalized) && !/(?:HIT|GOAL|DETECT|SCORE_PLUS|TEAM1\+1|SENSOR_ON|IR_ON)/.test(normalized)) {
    return true;
  }

  if (normalized === "D4") {
    applyRemoteScorePulse("REMOTE D4");
    return true;
  }

  const scoreMatch = normalized.match(/(?:^|[^A-Z])(?:SCORE|COUNT|HITS?)\s*[:= ]\s*(\d{1,3})(?:\D|$)/);
  if (scoreMatch) {
    const isStatusText = /STATUS|BITS|ENABLED|RUNNING|MOTION|REMAINING/.test(normalized);
    applyIncomingScoreValue(Number(scoreMatch[1]), { silent: isStatusText });
    return true;
  }

  if (/(?:HIT|GOAL|DETECT|SCORE_PLUS|TEAM1\+1|^D4$)/.test(normalized)) {
    noteSensorSignal(normalized.slice(0, 24));
    return true;
  }

  if (/(?:SENSOR_ON|IR_ON)/.test(normalized)) {
    noteSensorSignal(normalized.slice(0, 24), { fallback: false, quiet: true });
    return true;
  }

  if (/^[+]?\s*1$/.test(normalized)) {
    applyRemoteScorePulse("RAW 1");
    return true;
  }

  const numberOnlyMatch = normalized.match(/^\d{1,3}$/);
  if (numberOnlyMatch) {
    applyIncomingScoreValue(Number(numberOnlyMatch[0]));
    return true;
  }

  return false;
}

function handleBleNotification(event) {
  const chunk = new TextDecoder().decode(event.target.value);
  state.lastBleRxAt = Date.now();
  state.bleBuffer += chunk;
  const lines = state.bleBuffer.split(/\r?\n/);
  state.bleBuffer = lines.pop() || "";
  lines.forEach(handleEspLine);
  if (state.bleBuffer.length > 160) {
    state.bleBuffer = state.bleBuffer.slice(-80);
  }

  const bufferedMessage = state.bleBuffer.trim();
  if (handleBleLooseMessage(bufferedMessage)) {
    state.bleBuffer = "";
  }
}

function handleBleDisconnect() {
  clearPendingRemoteScorePulse();
  state.bleConnected = false;
  state.bleDevice = null;
  state.bleServer = null;
  state.bleNotifyCharacteristic = null;
  state.bleWriteCharacteristic = null;
  state.bleProfileLabel = "";
  state.bleConnectedAt = 0;
  state.lastBleRxAt = 0;
  if (bleButton) {
    bleButton.textContent = "바구니 BLE";
    bleButton.classList.remove("is-connected");
  }
  updateBallCountUi("BLE 연결 끊김 · 다시 연결 필요");
  eventMarquee.textContent = "BLE DISCONNECTED · 다시 연결 대기";
}

function isRemoteBleActuallyConnected() {
  return Boolean(
    state.remoteBleConnected &&
    state.remoteBleDevice?.gatt?.connected
  );
}

function handleRemoteBleNotification(event) {
  const chunk = new TextDecoder().decode(event.target.value);
  state.lastRemoteBleRxAt = Date.now();
  state.remoteBleBuffer += chunk;
  const lines = state.remoteBleBuffer.split(/\r?\n/);
  state.remoteBleBuffer = lines.pop() || "";
  lines.forEach((line) => handleEspLine(line.replace(/^REMOTE:/i, "")));
  if (state.remoteBleBuffer.length > 160) {
    state.remoteBleBuffer = state.remoteBleBuffer.slice(-80);
  }

  const bufferedMessage = state.remoteBleBuffer.trim();
  if (handleBleLooseMessage(bufferedMessage.replace(/^REMOTE:/i, ""))) {
    state.remoteBleBuffer = "";
  }
}

function handleRemoteBleDisconnect() {
  state.remoteBleConnected = false;
  state.remoteBleDevice = null;
  state.remoteBleServer = null;
  state.remoteBleNotifyCharacteristic = null;
  state.remoteBleWriteCharacteristic = null;
  state.remoteBleProfileLabel = "";
  state.remoteBleConnectedAt = 0;
  state.lastRemoteBleRxAt = 0;
  if (remoteBleButton) {
    remoteBleButton.textContent = "리모컨 BLE";
    remoteBleButton.classList.remove("is-connected");
  }
  eventMarquee.textContent = "REMOTE BLE DISCONNECTED · 다시 연결 대기";
}

async function getBleProfileConnection(server) {
  const errors = [];

  for (const profile of bleProfiles) {
    try {
      const service = await server.getPrimaryService(profile.serviceUuid);
      let notifyCharacteristic = null;
      let writeCharacteristic = null;

      try {
        notifyCharacteristic = await service.getCharacteristic(profile.notifyUuid);
        writeCharacteristic = profile.writeUuid === profile.notifyUuid
          ? notifyCharacteristic
          : await service.getCharacteristic(profile.writeUuid);
      } catch (error) {
        const characteristics = await service.getCharacteristics();
        notifyCharacteristic = characteristics.find((characteristic) => (
          characteristic.properties.notify ||
          characteristic.properties.indicate
        ));
        writeCharacteristic = characteristics.find((characteristic) => (
          characteristic.properties.writeWithoutResponse ||
          characteristic.properties.write
        ));
      }

      if (!notifyCharacteristic && !writeCharacteristic) {
        throw new Error("notify/write characteristic 없음");
      }

      if (!writeCharacteristic) {
        throw new Error("write characteristic 없음");
      }

      return { profile, notifyCharacteristic, writeCharacteristic };
    } catch (error) {
      errors.push(`${profile.label}: ${error.message || error}`);
    }
  }

  throw new Error(`지원 BLE 서비스 없음 (${errors.join(" / ")})`);
}

async function connectEspBle() {
  unlockAudio();
  if (!navigator.bluetooth) {
    eventMarquee.textContent = "WEB BLUETOOTH 미지원 · CHROME/EDGE 필요";
    return false;
  }
  if (isBleActuallyConnected()) return true;
  handleBleDisconnect();
  if (state.bleConnecting) return false;

  state.bleConnecting = true;
  if (bleButton) bleButton.textContent = "바구니 연결 중";

  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: bleOptionalServices,
    });
    device.addEventListener("gattserverdisconnected", handleBleDisconnect);
    const server = await device.gatt.connect();
    const { profile, notifyCharacteristic, writeCharacteristic } = await getBleProfileConnection(server);

    if (notifyCharacteristic && (notifyCharacteristic.properties.notify || notifyCharacteristic.properties.indicate)) {
      await notifyCharacteristic.startNotifications();
      notifyCharacteristic.addEventListener("characteristicvaluechanged", handleBleNotification);
    }

    state.bleDevice = device;
    state.bleServer = server;
    state.bleNotifyCharacteristic = notifyCharacteristic;
    state.bleWriteCharacteristic = writeCharacteristic;
    state.bleConnected = true;
    state.bleBuffer = "";
    state.bleProfileLabel = profile.label;
    state.bleConnectedAt = Date.now();
    state.lastBleRxAt = 0;
    if (bleButton) {
      bleButton.textContent = "바구니 연결됨";
      bleButton.classList.add("is-connected");
    }
    updateBallCountUi(`BLE CONNECTED · ${device.name || profile.label}`);
    eventMarquee.textContent = `BLE CONNECTED · ${profile.label}`;
    await sendBleCommand("READY");
    window.setTimeout(() => {
      if (!isBleActuallyConnected()) return;
      if (state.lastBleRxAt >= state.bleConnectedAt) return;
      updateBallCountUi("BLE 연결됨 · 바구니 데이터 없음");
      eventMarquee.textContent = "BLE 연결됨 · 센서 데이터 수신 대기";
    }, 1600);
    return true;
  } catch (error) {
    state.bleConnected = false;
    eventMarquee.textContent = `BLE 연결 실패 · ${error.message || error}`;
    if (bleButton) {
      bleButton.textContent = "바구니 BLE";
      bleButton.classList.remove("is-connected");
    }
    return false;
  } finally {
    state.bleConnecting = false;
  }
}

async function connectRemoteBle() {
  unlockAudio();
  if (!navigator.bluetooth) {
    eventMarquee.textContent = "WEB BLUETOOTH 미지원 · CHROME/EDGE 필요";
    return false;
  }
  if (isRemoteBleActuallyConnected()) return true;
  handleRemoteBleDisconnect();
  if (state.remoteBleConnecting) return false;

  state.remoteBleConnecting = true;
  if (remoteBleButton) remoteBleButton.textContent = "리모컨 연결 중";

  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: bleOptionalServices,
    });
    device.addEventListener("gattserverdisconnected", handleRemoteBleDisconnect);
    const server = await device.gatt.connect();
    const { profile, notifyCharacteristic, writeCharacteristic } = await getBleProfileConnection(server);

    if (notifyCharacteristic && (notifyCharacteristic.properties.notify || notifyCharacteristic.properties.indicate)) {
      await notifyCharacteristic.startNotifications();
      notifyCharacteristic.addEventListener("characteristicvaluechanged", handleRemoteBleNotification);
    }

    state.remoteBleDevice = device;
    state.remoteBleServer = server;
    state.remoteBleNotifyCharacteristic = notifyCharacteristic;
    state.remoteBleWriteCharacteristic = writeCharacteristic;
    state.remoteBleConnected = true;
    state.remoteBleBuffer = "";
    state.remoteBleProfileLabel = profile.label;
    state.remoteBleConnectedAt = Date.now();
    state.lastRemoteBleRxAt = 0;
    if (remoteBleButton) {
      remoteBleButton.textContent = "리모컨 연결됨";
      remoteBleButton.classList.add("is-connected");
    }
    eventMarquee.textContent = `REMOTE BLE CONNECTED · ${device.name || profile.label}`;
    window.setTimeout(() => {
      if (!isRemoteBleActuallyConnected()) return;
      if (state.lastRemoteBleRxAt >= state.remoteBleConnectedAt) return;
      eventMarquee.textContent = "리모컨 BLE 연결됨 · 버튼 입력 대기";
    }, 1600);
    return true;
  } catch (error) {
    state.remoteBleConnected = false;
    eventMarquee.textContent = `리모컨 BLE 연결 실패 · ${error.message || error}`;
    if (remoteBleButton) {
      remoteBleButton.textContent = "리모컨 BLE";
      remoteBleButton.classList.remove("is-connected");
    }
    return false;
  } finally {
    state.remoteBleConnecting = false;
  }
}

async function sendBleCommand(command) {
  if (!isBleActuallyConnected()) {
    handleBleDisconnect();
    return false;
  }
  try {
    const data = new TextEncoder().encode(`${command}\n`);
    const canWriteWithoutResponse = state.bleWriteCharacteristic.properties.writeWithoutResponse;
    const canWrite = state.bleWriteCharacteristic.properties.write;

    if (canWriteWithoutResponse) {
      try {
        await state.bleWriteCharacteristic.writeValueWithoutResponse(data);
      } catch (error) {
        if (!canWrite) throw error;
        await state.bleWriteCharacteristic.writeValue(data);
      }
    } else if (canWrite) {
      await state.bleWriteCharacteristic.writeValue(data);
    } else {
      eventMarquee.textContent = "BLE 쓰기 미지원 · 바구니 펌웨어 확인";
      return false;
    }
    return true;
  } catch (error) {
    state.bleConnected = false;
    eventMarquee.textContent = `BLE 명령 실패 · ${error.message || error}`;
    return false;
  }
}

function setBleStatus({ checking = false, message = "" } = {}) {
  bleButton?.classList.toggle("is-connected", isBleActuallyConnected());
  bleButton?.classList.toggle("is-checking", checking);

  if (checking) {
    if (bleButton) bleButton.textContent = "바구니 확인";
    return;
  }

  if (bleButton) bleButton.textContent = isBleActuallyConnected() ? "바구니 연결됨" : "바구니 BLE";
  if (message) eventMarquee.textContent = message;
}

async function sendEspCommand(command) {
  if (String(command).startsWith("TEAM:")) return true;

  if (isBleActuallyConnected() && await sendBleCommand(command)) {
    return true;
  }

  eventMarquee.textContent = "BLE 미연결 · LUD-COUNT 다시 연결";
  return false;
}

function isFeverTime() {
  return state.feverTime > 0 && state.remaining <= state.feverTime;
}

function updateFeverState() {
  const fever = isFeverTime();
  document.body.classList.toggle("is-fever", fever && state.running);
  timerBox?.classList.toggle("is-fever", fever && state.running);
  feverBox?.classList.toggle("is-fever", fever && state.running);
  if (feverText) feverText.textContent = fever ? "2X NOW" : state.feverTime > 0 ? "READY" : "OFF";
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isGameClockRunning() {
  return state.running && !!state.timerEndsAt && state.remainingMs > 0;
}

function blockResetWhileRunning(source = "RESET") {
  if (!isGameClockRunning()) return false;
  eventMarquee.textContent = `${source} BLOCKED · 경기 중 점수 유지`;
  return true;
}

function resetEspCounterForActiveTeam() {
  clearPendingRemoteScorePulse();
  state.ballCountValue = 0;
  state.lastRemoteScorePulseAt = 0;
  void sendEspCommand("RESET");
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
  state.ballCountTeamReady = false;
  state.teams[index].score = 0;
  state.teams[index].completed = false;
  setRemainingMs(state.duration * 1000);
  startButton.disabled = false;
  eventMarquee.textContent = `${state.teams[index].name} SELECTED`;
  resetEspCounterForActiveTeam();
  renderGame();
}

function hideCountdown() {
  countdownOverlay.classList.add("hidden");
  countdownOverlay.classList.remove("is-go", "is-pulse");
}

function cancelCountdown() {
  state.countdownRunId += 1;
  hideCountdown();
  state.countdownActive = false;
  startButton.disabled = false;
}

function stopTimer() {
  window.clearInterval(state.intervalId);
  state.intervalId = null;
  state.timerEndsAt = null;
}

function ensureTimerLoop() {
  if (state.intervalId) return;

  state.intervalId = window.setInterval(() => {
    if (!state.timerEndsAt) return;

    setRemainingMs(state.timerEndsAt - performance.now());
    updateFeverState();

    if (state.remaining <= 0) {
      endGame();
    }
  }, 10);
}

async function runCountdownAndStart() {
  if (state.running || state.countdownActive) return;
  const activeTeam = state.teams[state.activeTeamIndex];
  if (!activeTeam) return;
  const countdownRunId = state.countdownRunId + 1;

  await unlockAudio();
  if (countdownRunId !== state.countdownRunId + 1) return;

  if (state.phase === "paused") {
    hideCountdown();
    startButton.disabled = false;
    startGame();
    return;
  }

  activeTeam.score = 0;
  activeTeam.completed = false;
  resetEspCounterForActiveTeam();
  setRemainingMs(state.duration * 1000);
  renderGame();
  state.countdownRunId = countdownRunId;
  state.countdownActive = true;
  state.phase = "countdown";
  startButton.disabled = true;
  eventMarquee.textContent = `${activeTeam.name} COUNTDOWN · 준비`;

  void sendEspCommand(`TEAM:${state.activeTeamIndex + 1}`);

  showCountdownStep("3", "READY");
  await sleep(700);
  if (countdownRunId !== state.countdownRunId || !state.countdownActive) return;
  showCountdownStep("2", "READY");
  await sleep(700);
  if (countdownRunId !== state.countdownRunId || !state.countdownActive) return;
  showCountdownStep("1", "SET");
  await sleep(700);
  if (countdownRunId !== state.countdownRunId || !state.countdownActive) return;
  showCountdownStep("GO!", "GAME START");
  await sleep(450);
  if (countdownRunId !== state.countdownRunId || !state.countdownActive) return;
  hideCountdown();

  state.countdownActive = false;
  startButton.disabled = false;
  startGame();
}

function startGame() {
  if (state.running) return;
  void playBgm();
  state.phase = "running";
  state.running = true;
  if (!state.timerEndsAt) {
    state.timerEndsAt = performance.now() + state.remainingMs;
  }
  const activeTeam = state.teams[state.activeTeamIndex];
  eventMarquee.textContent = state.gameMode === "versus"
      ? `${activeTeam.name} START · 2명씩 대결`
      : `${activeTeam.name} START · ${labelFor("difficulty")} 기록 도전`;
  void sendEspCommand("START");
  void sendEspCommand("GO");
  updateFeverState();
  ensureTimerLoop();
}

function pauseGame({ sendCommand = true } = {}) {
  if (state.running && state.timerEndsAt) {
    setRemainingMs(state.timerEndsAt - performance.now());
  }
  pauseBgm();
  state.running = false;
  if (state.phase === "running") state.phase = "paused";
  stopTimer();
  eventMarquee.textContent = "PAUSED · 시간 정지";
  if (sendCommand) void sendEspCommand("FINISH");
  updateFeverState();
}

async function resetGame(keepScreen = true) {
  if (blockResetWhileRunning("RESET")) return;
  clearPendingRemoteScorePulse();
  hideScoreResultModal({ runAction: false });
  pauseGame({ sendCommand: false });
  stopTimer();
  hideCountdown();
  state.countdownActive = false;
  state.phase = "ready";
  startButton.disabled = false;
  state.ballCountTeamReady = false;
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
  stopTimer();
  state.phase = "ended";
  sendEspCommand("FINISH");
  state.remaining = 0;
  state.remainingMs = 0;
  timerText.textContent = formatClock(0);
  const activeTeam = state.teams[state.activeTeamIndex];
  if (activeTeam) {
    activeTeam.completed = true;
    incrementTodayRoundCount();
  }
  renderResultBoard();

  showScoreResultModal(activeTeam, () => advanceAfterEndGame(activeTeam));
}

function advanceAfterEndGame(activeTeam) {
  state.round += 1;
  const nextIndex = state.teams.findIndex((team) => !team.completed);
  if (nextIndex >= 0) {
    state.activeTeamIndex = nextIndex;
    state.phase = "ready";
    state.ballCountTeamReady = false;
    state.teams[nextIndex].score = 0;
    state.teams[nextIndex].completed = false;
    setRemainingMs(state.duration * 1000);
    eventMarquee.textContent = `${activeTeam.name} DONE · 다음 ${state.teams[nextIndex].name} 선택됨`;
    resetEspCounterForActiveTeam();
    renderGame();
    showScreen(gameScreen);
    return;
  }

  showScreen(resultScreen);
}

document.querySelectorAll("[data-setting]").forEach((button) => {
  button.addEventListener("click", () => openSettingModal(button.dataset.setting));
});

window.addEventListener("pointerdown", unlockAudio, { once: true });

modalOptions.addEventListener("click", (event) => {
  const optionButton = event.target.closest("[data-setting-key]");
  if (!optionButton) return;

  const key = optionButton.dataset.settingKey;
  const rawValue = optionButton.dataset.settingValue;
  state[key] = Number.isNaN(Number(rawValue)) ? rawValue : Number(rawValue);
  normalizeSetupState(key);
  renderSetupLabels();
  closeSettingModal();
});

modalClose.addEventListener("click", closeSettingModal);
settingModal.addEventListener("click", (event) => {
  if (event.target === settingModal) closeSettingModal();
});
celebrationClose?.addEventListener("click", hideRecordCelebration);
recordCelebration?.addEventListener("click", (event) => {
  if (event.target === recordCelebration) hideRecordCelebration();
});
scoreResultClose?.addEventListener("click", hideScoreResultModal);
scoreResultModal?.addEventListener("click", (event) => {
  if (event.target === scoreResultModal) hideScoreResultModal();
});

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  readyGameFromSetup();
});

scoreGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-team-index]");
  if (!card) return;
  const teamIndex = Number(card.dataset.teamIndex);
  selectTeam(teamIndex);
});

scoreGrid.addEventListener("keydown", (event) => {
  if (!["Enter", "Space"].includes(event.code)) return;
  const card = event.target.closest("[data-team-index]");
  if (!card) return;
  event.preventDefault();
  const teamIndex = Number(card.dataset.teamIndex);
  selectTeam(teamIndex);
});

podium.addEventListener("change", (event) => {
  const input = event.target.closest("[data-score-input]");
  if (!input) return;
  const row = input.closest("[data-team-index]");
  if (!row) return;
  setManualScore(Number(row.dataset.teamIndex), input.value, { playSound: true });
});

recordAddButton?.addEventListener("click", () => {
  if (!recordForm.classList.contains("hidden") && !editingRecordId) {
    resetRecordForm();
    return;
  }
  openRecordForm();
});

recordCancelButton?.addEventListener("click", resetRecordForm);

recordList?.addEventListener("click", (event) => {
  const row = event.target.closest("[data-record-id]");
  if (!row) return;

  const actionButton = event.target.closest("[data-record-action]");
  if (!actionButton) {
    setActiveRecord(row.dataset.recordId);
    return;
  }

  const recordId = row?.dataset.recordId;
  const record = scoreRecords.find((item) => item.id === recordId);
  if (!record) return;

  if (actionButton.dataset.recordAction === "edit") {
    openRecordForm(record);
    return;
  }

  if (actionButton.dataset.recordAction === "delete") {
    const shouldDelete = window.confirm(`${record.name} ${record.score}점 기록을 삭제할까요?`);
    if (!shouldDelete) return;
    scoreRecords = scoreRecords.filter((item) => item.id !== recordId);
    if (activeRecordId === recordId) activeRecordId = null;
    saveScoreRecords();
    renderScoreRecords();
    if (editingRecordId === recordId) resetRecordForm();
    eventMarquee.textContent = `RECORD DELETED · ${record.name} ${record.score}점`;
  }
});

recordForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = recordNameInput.value.trim() || "기록";
  const score = Math.max(0, Math.min(999, Math.trunc(Number(recordScoreInput.value) || 0)));
  if (score <= 0) {
    recordScoreInput.focus();
    return;
  }

  const previousBest = [...scoreRecords].sort((a, b) => b.score - a.score)[0]?.score || 0;
  const editingRecord = scoreRecords.find((record) => record.id === editingRecordId);
  const isNewRecord = !editingRecord && score > previousBest;

  if (editingRecord) {
    editingRecord.name = name;
    editingRecord.score = score;
  } else {
    scoreRecords.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      score,
    });
  }

  saveScoreRecords();
  renderScoreRecords();
  resetRecordForm();
  eventMarquee.textContent = editingRecord
    ? `RECORD UPDATED · ${name} ${score}점`
    : isNewRecord
    ? `NEW RECORD · ${name} ${score}점`
    : `RECORD ADDED · ${name} ${score}점`;
  if (isNewRecord) showRecordCelebration({ name, score });
});

recordList?.addEventListener("keydown", (event) => {
  if (!["Enter", "Space"].includes(event.code)) return;
  const row = event.target.closest("[data-record-id]");
  if (!row) return;
  event.preventDefault();
  setActiveRecord(row.dataset.recordId);
});

bleButton?.addEventListener("click", connectEspBle);
remoteBleButton?.addEventListener("click", connectRemoteBle);
ballCountClose?.addEventListener("click", closeBallCountModal);
ballCountModal?.addEventListener("click", (event) => {
  if (event.target === ballCountModal) closeBallCountModal();
});
ballCountConnect?.addEventListener("click", connectBallCountBle);
ballCountStart?.addEventListener("click", startBallCounting);
ballCountStop?.addEventListener("click", stopBallCounting);
ballCountReset?.addEventListener("click", resetBallCounting);
startButton.addEventListener("click", runCountdownAndStart);
document.querySelector("#pauseButton").addEventListener("click", pauseGame);
document.querySelector("#resetButton").addEventListener("click", () => resetGame(true));
document.querySelector("#setupButton").addEventListener("click", () => {
  pauseGame();
  showScreen(setupScreen);
});
document.querySelector("#replayButton").addEventListener("click", () => resetGame(true));
document.querySelector("#resultSetupButton").addEventListener("click", () => showScreen(setupScreen));

window.ludballShowTeamOneOnly = toggleTeamOneModeFromShortcut;
window.ludballToggleTeamOneMode = toggleTeamOneModeFromShortcut;

window.addEventListener("keydown", (event) => {
  const targetTag = event.target?.tagName?.toLowerCase();
  const isTyping = ["input", "textarea", "select"].includes(targetTag);
  if (isTyping) return;
  if (isScoreResultModalOpen()) {
    if (["Enter", "Space", "Escape"].includes(event.code)) {
      event.preventDefault();
      hideScoreResultModal();
    }
    return;
  }
  if (isBallCountModalOpen()) {
    if (event.code === "Escape") {
      event.preventDefault();
      closeBallCountModal();
    }
    return;
  }
  if (!settingModal.classList.contains("hidden") && event.code !== "Escape") return;

  const isTeamOneShortcut = event.code === "KeyM"
    && !event.shiftKey
    && !event.altKey
    && (event.metaKey || event.ctrlKey || (!event.metaKey && !event.ctrlKey));

  if (isTeamOneShortcut) {
    event.preventDefault();
    event.stopPropagation();
    toggleTeamOneModeFromShortcut();
    return;
  }

  const keyMap = {
    Digit1: "TEAM_SCORE:1",
    Digit2: "TEAM_SCORE:2",
    Digit3: "TEAM_SCORE:3",
    Digit4: "TEAM_SCORE:4",
    KeyQ: "TEAM_SCORE_MINUS:1",
    KeyW: "TEAM_SCORE_MINUS:2",
    KeyE: "TEAM_SCORE_MINUS:3",
    KeyR: "TEAM_SCORE_MINUS:4",
    Numpad1: "TEAM_SCORE:1",
    Numpad2: "TEAM_SCORE:2",
    Numpad3: "TEAM_SCORE:3",
    Numpad4: "TEAM_SCORE:4",
    Enter: "START",
    KeyS: "START",
    Space: "PLAY_PAUSE",
    KeyP: "PAUSE",
    KeyO: "OPTION",
    ArrowRight: "NEXT_TEAM",
    ArrowLeft: "PREV_TEAM",
    Equal: "SCORE:+1",
    NumpadAdd: "SCORE:+1",
    Minus: "SCORE:-1",
    NumpadSubtract: "SCORE:-1",
    KeyM: "MODE_NEXT",
    KeyD: "DIFFICULTY_NEXT",
    KeyT: "DURATION_NEXT",
    Escape: "OPTION",
  };

  const command = keyMap[event.code];
  if (!command) return;
  event.preventDefault();

  if (!setupScreen.classList.contains("hidden") && ["START", "PLAY_PAUSE"].includes(command)) {
    readyGameFromSetup();
    return;
  }

  handleOperatorCommand(command);
}, { capture: true });

renderSetupLabels();
renderScoreRecords();
setBleStatus({
  message: "BLE 연결 대기 · LUD-COUNT 선택",
});
