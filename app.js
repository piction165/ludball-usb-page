const accents = ["#42ffd2", "#5ffcff", "#2cff9a", "#b8fff1"];
const defaultNames = ["TEAM 1", "TEAM 2", "TEAM 3", "TEAM 4"];
const recordStorageKey = "ludballScoreRecords";
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
  serialPort: null,
  serialReader: null,
  serialWriter: null,
  serialConnected: false,
  serialConnecting: false,
  bleDevice: null,
  bleServer: null,
  bleNotifyCharacteristic: null,
  bleWriteCharacteristic: null,
  bleConnected: false,
  bleConnecting: false,
  bleBuffer: "",
  wifiBaseUrl: "",
  wifiConnected: false,
  wifiChecking: false,
  wifiPollId: null,
  wifiPollMs: 150,
  wifiHits: 0,
  wifiScore: 0,
  wifiRunning: false,
  ballCountActive: false,
  ballCountValue: 0,
  ballCountTeamReady: false,
  phase: "setup",
  countdownActive: false,
  remoteMainButtonLatched: false,
  remoteMainButtonReleaseTimer: null,
};

const cloudScoreUrl = "https://ludball-usb-page.vercel.app/api/score";
const directEspBaseUrl = "/api";
const bleServiceUuid = "8f7a2d80-4f3b-4e62-9d1d-3c5484e6b201";
const bleNotifyUuid = "8f7a2d81-4f3b-4e62-9d1d-3c5484e6b201";
const bleWriteUuid = "8f7a2d82-4f3b-4e62-9d1d-3c5484e6b201";
const remoteMainButtonLockMs = 240;
const defaultBallCountDegrees = 360;
const defaultBallCountSpeed = 2000;
const legacyConnectionStorageKeys = ["ludballWifiIp"];

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

document.querySelectorAll("#usbButton, .stage-actions button").forEach((button) => {
  if (button.id === "usbButton" || button.textContent.trim().includes("USB")) {
    button.remove();
  }
});
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

  try {
    const context = getAudioContext();
    if (context?.state === "suspended") await context.resume();

    if (scoreAudio) {
      const previousVolume = scoreAudio.volume;
      scoreAudio.volume = 0;
      await scoreAudio.play();
      scoreAudio.pause();
      scoreAudio.currentTime = 0;
      scoreAudio.volume = previousVolume;
    }

    if (bgmAudio) {
      const previousVolume = bgmAudio.volume;
      bgmAudio.volume = 0;
      await bgmAudio.play();
      bgmAudio.pause();
      bgmAudio.currentTime = 0;
      bgmAudio.volume = previousVolume;
    }

    if (recordAudio) {
      const previousVolume = recordAudio.volume;
      recordAudio.volume = 0;
      await recordAudio.play();
      recordAudio.pause();
      recordAudio.currentTime = 0;
      recordAudio.volume = previousVolume;
    }
    audioUnlocked = true;
  } catch (error) {
    audioUnlocked = Boolean(audioContext);
  }
}

async function playBgm() {
  try {
    await unlockAudio();
    if (bgmAudio) {
      bgmAudio.volume = 0.7;
      await bgmAudio.play();
      return;
    }
    startGeneratedBgm();
  } catch (error) {
    startGeneratedBgm();
  }
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
  const sortedRecords = [...scoreRecords].sort((a, b) => b.score - a.score).slice(0, 8);
  recordList.innerHTML = sortedRecords
    .map((record, index) => `
      <li
        data-record-id="${escapeHtml(record.id)}"
        class="${record.id === activeRecordId ? "is-active" : ""}"
        tabindex="0"
        aria-expanded="${record.id === activeRecordId ? "true" : "false"}"
      >
        <div class="record-main">
          <span>${index + 1}위 ${escapeHtml(record.name)}</span>
          <b>${record.score}점</b>
        </div>
        <div class="record-actions" aria-label="${escapeHtml(record.name)} 기록 관리">
          <button type="button" data-record-action="edit">수정</button>
          <button type="button" data-record-action="delete">삭제</button>
        </div>
      </li>
    `)
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

function readyGameFromSetup({ requestSerial = true } = {}) {
  unlockAudio();
  buildGameFromSetup();
  sendEspCommand("READY");
}

function renderGame() {
  timerText.textContent = formatClock(state.remainingMs);
  roundLabel.textContent = `ROUND ${String(state.round).padStart(2, "0")}`;
  modeLabel.textContent = state.gameMode === "versus"
    ? `VERSUS · ${labelFor("difficulty")}`
    : `SCORE TRIAL · ${labelFor("difficulty")}`;
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
    card.setAttribute("aria-label", `${team.name} 점수 세기 열기`);
    card.innerHTML = `
      <div class="team-name">
        <span>${team.name}</span>
      </div>
      <div class="score-value" aria-label="${team.name} 점수">${team.score}</div>
      <div class="team-status">${index === state.activeTeamIndex ? "점수 세기" : team.completed ? "DONE" : "TEAM SELECT"}</div>
    `;
    scoreGrid.append(card);
  });

  updateFeverState();
}

function sortedTeams() {
  return [...state.teams].sort((a, b) => b.score - a.score);
}

function renderResultBoard() {
  const sorted = sortedTeams();
  const winner = sorted[0];
  if (!winner) return;
  const tied = sorted.filter((team) => team.score === winner.score);

  winnerText.textContent = tied.length > 1 ? "DRAW GAME" : `${winner.name} WIN`;
  const resultPrefix = state.gameMode === "versus" ? "대결" : "점수 내기";
  resultSummary.textContent = tied.length > 1
    ? `공동 1등 · ${winner.score}점`
    : `${resultPrefix} 우승 · ${winner.score}점`;

  podium.innerHTML = sorted
    .map((team, index) => {
      const originalIndex = state.teams.indexOf(team);
      return `
        <div class="podium-row" data-team-index="${originalIndex}">
          <span>${index + 1}. ${team.name}</span>
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
  if (ballCountValue) ballCountValue.textContent = String(state.ballCountValue);
  if (ballCountTeam) ballCountTeam.textContent = team?.name || "TEAM";
  if (ballCountConnect) {
    ballCountConnect.textContent = bleLive ? "BLE 연결됨" : "BLE 연결";
    ballCountConnect.classList.toggle("is-connected", bleLive);
  }
  if (ballCountStatus) {
    ballCountStatus.textContent = message || (
      bleLive
        ? `${team?.name || "팀"} 점수 세기 연결됨`
        : `${team?.name || "팀"} 선택됨 · BLE 연결 대기`
    );
  }
}

function clearLegacyConnectionCache() {
  legacyConnectionStorageKeys.forEach((key) => window.localStorage.removeItem(key));
  state.serialPort = null;
  state.serialReader = null;
  state.serialWriter = null;
  state.serialConnected = false;
  state.serialConnecting = false;
  state.wifiBaseUrl = "";
  state.wifiConnected = false;
  state.wifiChecking = false;
  state.wifiHits = 0;
  state.wifiScore = 0;
  window.clearInterval(state.wifiPollId);
  state.wifiPollId = null;
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
  const previousScore = state.ballCountValue;
  state.ballCountValue = normalizedScore;
  const team = state.teams[state.activeTeamIndex];
  if (team) {
    team.score = normalizedScore;
    if (normalizedScore > previousScore) playScoreBurst(Math.min(6, normalizedScore - previousScore));
    renderGame();
  }
  updateBallCountUi(normalizedScore > previousScore ? "IR 감지됨 · 점수 반영" : undefined);
  void postBallCountToCloud(normalizedScore);
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
  await sendBallCountCommand(`ROT ${defaultBallCountDegrees}`, `${defaultBallCountDegrees}도 천천히 회전 · 점수 집계 중`);
}

async function stopBallCounting() {
  state.ballCountActive = false;
  await sendBallCountCommand("FINISH", "점수 세기 정지");
}

async function resetBallCounting() {
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
    void resetGame(true);
    await sleep(150);
    runCountdownAndStart();
    return;
  }

  if (!state.teams.length) {
    readyGameFromSetup();
    return;
  }

  runCountdownAndStart();
}

function handleRemoteMainButtonPress() {
  window.clearTimeout(state.remoteMainButtonReleaseTimer);

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

  switch (normalized) {
    case "READY":
      if (isBallCountModalOpen() || state.ballCountActive) {
        updateBallCountUi("점수 세기 준비 완료");
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

function handleSerialLine(line) {
  const message = line.trim().toUpperCase();
  if (!message) return;

  if (["RESET_CURRENT_TEAM", "RESET_TEAM", "TEAM_RESET"].includes(message)) {
    const team = state.teams[state.activeTeamIndex];
    if (team) {
      team.score = 0;
      team.completed = false;
      state.wifiHits = 0;
      state.wifiScore = 0;
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

  if (handleOperatorCommand(message.replace(/^REMOTE:/, ""))) return;

  const scoreMatch = message.match(/^SCORE:(\d+)$/);
  if (scoreMatch) {
    const team = state.teams[state.activeTeamIndex];
    if (team) {
      const nextScore = Number(scoreMatch[1]);
      if (isBallCountModalOpen() || state.ballCountActive) {
        applyBallCountScore(nextScore);
      } else {
        const gained = Math.max(0, nextScore - team.score);
        if (gained > 0) playScoreBurst(gained);
        team.score = nextScore;
        eventMarquee.textContent = `ESP SCORE · ${team.name} ${team.score}`;
        renderGame();
      }
    }
    return;
  }

  if (message.startsWith("HIT:")) {
    updateBallCountUi("IR 센서 감지 · 점수 수신 대기");
    eventMarquee.textContent = `ESP GOAL · SENSOR ${message.slice(4)}`;
    return;
  }

  if (message.startsWith("SCORE_PLUS") || message.startsWith("SENSOR_ON")) {
    eventMarquee.textContent = "ESP SENSOR · 감지됨";
    playScoreBurst(1);
    return;
  }

  if (["TEAM1", "TEAM1+1", "BOOT", "GOAL:1"].includes(message)) {
    if (state.running) {
      addScore(state.activeTeamIndex, 1);
      eventMarquee.textContent = `ESP GOAL · ${state.teams[state.activeTeamIndex]?.name || "TEAM"} +1`;
    } else {
      playScoreBurst(1);
      eventMarquee.textContent = "ESP SENSOR · 효과음 테스트";
    }
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
    usbButton.textContent = "BLE 연결";
    usbButton.classList.remove("is-connected");
  }
  eventMarquee.textContent = "USB 연결 비활성화 · BLE만 사용";
  readSerialPort(port).catch((error) => {
    state.serialConnected = false;
    state.serialWriter = null;
    eventMarquee.textContent = `USB 비활성화 · ${error.message || error}`;
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

function handleBleNotification(event) {
  const chunk = new TextDecoder().decode(event.target.value);
  state.bleBuffer += chunk;
  const lines = state.bleBuffer.split(/\r?\n/);
  state.bleBuffer = lines.pop() || "";
  lines.forEach(handleSerialLine);
}

function handleBleDisconnect() {
  state.bleConnected = false;
  state.bleDevice = null;
  state.bleServer = null;
  state.bleNotifyCharacteristic = null;
  state.bleWriteCharacteristic = null;
  if (wifiButton) {
    wifiButton.textContent = "BLE 연결";
    wifiButton.classList.remove("is-connected");
  }
  updateBallCountUi("BLE 연결 끊김 · 다시 연결 필요");
  eventMarquee.textContent = "BLE DISCONNECTED · 다시 연결 대기";
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
  if (wifiButton) wifiButton.textContent = "BLE 연결 중";

  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [bleServiceUuid],
    });
    device.addEventListener("gattserverdisconnected", handleBleDisconnect);
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(bleServiceUuid);
    const notifyCharacteristic = await service.getCharacteristic(bleNotifyUuid);
    const writeCharacteristic = await service.getCharacteristic(bleWriteUuid);

    await notifyCharacteristic.startNotifications();
    notifyCharacteristic.addEventListener("characteristicvaluechanged", handleBleNotification);

    state.bleDevice = device;
    state.bleServer = server;
    state.bleNotifyCharacteristic = notifyCharacteristic;
    state.bleWriteCharacteristic = writeCharacteristic;
    state.bleConnected = true;
    state.bleBuffer = "";
    if (wifiButton) {
      wifiButton.textContent = "BLE 연결됨";
      wifiButton.classList.add("is-connected");
    }
    updateBallCountUi(`BLE CONNECTED · ${device.name || "LUD-COUNT"}`);
    eventMarquee.textContent = "BLE CONNECTED · ESP 버튼 대기";
    await sendBleCommand("READY");
    return true;
  } catch (error) {
    state.bleConnected = false;
    eventMarquee.textContent = `BLE 연결 실패 · ${error.message || error}`;
    if (wifiButton) {
      wifiButton.textContent = "BLE 연결";
      wifiButton.classList.remove("is-connected");
    }
    return false;
  } finally {
    state.bleConnecting = false;
  }
}

async function sendBleCommand(command) {
  if (!isBleActuallyConnected()) {
    handleBleDisconnect();
    return false;
  }
  try {
    const data = new TextEncoder().encode(`${command}\n`);
    if (state.bleWriteCharacteristic.properties.writeWithoutResponse) {
      await state.bleWriteCharacteristic.writeValueWithoutResponse(data);
    } else {
      await state.bleWriteCharacteristic.writeValue(data);
    }
    return true;
  } catch (error) {
    state.bleConnected = false;
    eventMarquee.textContent = `BLE 명령 실패 · ${error.message || error}`;
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
  wifiButton.classList.toggle("is-connected", isBleActuallyConnected());
  wifiButton.classList.toggle("is-checking", checking);

  if (checking) {
    wifiButton.textContent = "BLE 확인";
    return;
  }

  wifiButton.textContent = isBleActuallyConnected() ? "BLE 연결됨" : "BLE 연결";
  if (message) eventMarquee.textContent = message;
}

function normalizeWifiBaseUrl(value) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (trimmed === "/api") return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

function wifiUrlFor(path = "/score") {
  if (!state.wifiBaseUrl || state.wifiBaseUrl === "/api") {
    if (path === "/score") return cloudScoreUrl;
    const action = path.replace(/^\//, "").toUpperCase();
    return `${cloudScoreUrl}?action=${encodeURIComponent(action)}`;
  }
  return `${state.wifiBaseUrl}${path}`;
}

async function fetchWifiState(path = "/score", { waitForResponse = true } = {}) {
  const request = fetch(wifiUrlFor(path), {
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
  if (typeof payload.running === "boolean" && payload.running !== state.wifiRunning) {
    state.wifiRunning = payload.running;
    if (payload.running && !state.running && !state.countdownActive) {
      if (!state.teams.length || !setupScreen.classList.contains("hidden")) {
        buildGameFromSetup();
      }
      startGame();
    } else if (!payload.running && state.running) {
      pauseGame();
    }
  }

  const team = state.teams[state.activeTeamIndex];
  if (!team) return;

  let changed = false;
  let soundPlayedForHit = false;
  if (typeof payload.hits === "number" && payload.hits !== state.wifiHits) {
    const gainedHits = payload.hits > state.wifiHits ? payload.hits - state.wifiHits : 0;
    state.wifiHits = payload.hits;
    if (gainedHits > 0) {
      addScore(state.activeTeamIndex, gainedHits);
      soundPlayedForHit = true;
      changed = true;
      eventMarquee.textContent = state.running
        ? `WIFI SENSOR · ${team.name} +${gainedHits}`
        : "WIFI SENSOR · 효과음 테스트";
    }
  }

  if (payload.score !== state.wifiScore) {
    const gainedScore = payload.score > state.wifiScore ? payload.score - state.wifiScore : 0;
    state.wifiScore = payload.score;
    if (gainedScore > 0 && !soundPlayedForHit) {
      addScore(state.activeTeamIndex, gainedScore);
      changed = true;
      eventMarquee.textContent = `WIFI SCORE · ${team.name} +${gainedScore}`;
    }
  }

  if (changed) {
    renderGame();
  }

}

function startWifiPolling() {
  return;
  window.clearInterval(state.wifiPollId);
  state.wifiPollId = window.setInterval(async () => {
    if (!state.wifiBaseUrl || state.wifiChecking) return;
    try {
      const payload = await fetchWifiState("/score");
      if (!state.wifiConnected) {
        setWifiStatus({ connected: false, message: "Wi-Fi 연결 비활성화 · BLE만 사용" });
      }
      applyWifiScore(payload);
    } catch (error) {
      setWifiStatus({ connected: false, message: `ESP 끊김 · ${error.message || error}` });
    }
  }, state.wifiPollMs);
}

async function checkEspWifi({ announce = true } = {}) {
  state.wifiBaseUrl = "";
  setWifiStatus({
    connected: false,
    checking: false,
    message: announce ? "Wi-Fi 연결 비활성화 · BLE만 사용" : "",
  });
  return false;

  if (!state.wifiBaseUrl) return false;
  setWifiStatus({ connected: false, checking: true });

  try {
    const payload = await fetchWifiState("/score");
    setWifiStatus({
      connected: false,
      message: announce ? "Wi-Fi 연결 비활성화 · BLE만 사용" : "",
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
  unlockAudio();
  eventMarquee.textContent = "Wi-Fi/USB 연결 비활성화 · BLE만 사용";
  return false;
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
  state.ballCountTeamReady = true;
  setRemainingMs(state.duration * 1000);
  startButton.disabled = false;
  eventMarquee.textContent = `${state.teams[index].name} SELECTED · 점수 세기 버튼 준비`;
  renderGame();
  sendEspCommand("READY");
}

function hideCountdown() {
  countdownOverlay.classList.add("hidden");
  countdownOverlay.classList.remove("is-go", "is-pulse");
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

  await unlockAudio();

  if (state.phase === "paused") {
    hideCountdown();
    startButton.disabled = false;
    startGame();
    return;
  }

  activeTeam.score = 0;
  activeTeam.completed = false;
  state.wifiHits = 0;
  state.wifiScore = 0;
  setRemainingMs(state.duration * 1000);
  renderGame();
  state.countdownActive = true;
  state.phase = "countdown";
  startButton.disabled = true;
  eventMarquee.textContent = `${activeTeam.name} COUNTDOWN · 준비`;

  void sendEspCommand(`TEAM:${state.activeTeamIndex + 1}`);

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
  updateFeverState();
  ensureTimerLoop();
}

function pauseGame() {
  if (state.running && state.timerEndsAt) {
    setRemainingMs(state.timerEndsAt - performance.now());
  }
  pauseBgm();
  state.running = false;
  if (state.phase === "running") state.phase = "paused";
  stopTimer();
  eventMarquee.textContent = "PAUSED · 시간 정지";
  updateFeverState();
}

async function resetGame(keepScreen = true) {
  pauseGame();
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
  state.wifiHits = 0;
  state.wifiScore = 0;
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
  if (activeTeam) activeTeam.completed = true;
  renderResultBoard();

  state.round += 1;
  const nextIndex = state.teams.findIndex((team) => !team.completed);
  if (nextIndex >= 0) {
    state.activeTeamIndex = nextIndex;
    state.phase = "ready";
    state.ballCountTeamReady = false;
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

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  readyGameFromSetup();
});

scoreGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-team-index]");
  if (!card) return;
  const teamIndex = Number(card.dataset.teamIndex);
  openBallCountModal(teamIndex);
});

scoreGrid.addEventListener("keydown", (event) => {
  if (!["Enter", "Space"].includes(event.code)) return;
  const card = event.target.closest("[data-team-index]");
  if (!card) return;
  event.preventDefault();
  const teamIndex = Number(card.dataset.teamIndex);
  openBallCountModal(teamIndex);
});

podium.addEventListener("change", (event) => {
  const input = event.target.closest("[data-score-input]");
  if (!input) return;
  const row = input.closest("[data-team-index]");
  if (!row) return;
  setManualScore(Number(row.dataset.teamIndex), input.value);
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

wifiButton.addEventListener("click", connectEspBle);
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

window.addEventListener("keydown", (event) => {
  const targetTag = event.target?.tagName?.toLowerCase();
  const isTyping = ["input", "textarea", "select"].includes(targetTag);
  if (isTyping) return;
  if (isBallCountModalOpen()) {
    if (event.code === "Escape") {
      event.preventDefault();
      closeBallCountModal();
    }
    return;
  }
  if (!settingModal.classList.contains("hidden") && event.code !== "Escape") return;

  const keyMap = {
    Digit1: "TEAM:1",
    Digit2: "TEAM:2",
    Digit3: "TEAM:3",
    Digit4: "TEAM:4",
    Numpad1: "TEAM:1",
    Numpad2: "TEAM:2",
    Numpad3: "TEAM:3",
    Numpad4: "TEAM:4",
    Enter: "START",
    KeyS: "START",
    Space: "PLAY_PAUSE",
    KeyP: "PAUSE",
    KeyR: "RESET",
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
});

renderSetupLabels();
renderScoreRecords();
clearLegacyConnectionCache();
setWifiStatus({
  connected: false,
  message: "BLE 연결 대기 · LUD-COUNT 선택",
});

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
