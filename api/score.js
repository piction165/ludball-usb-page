let state = globalThis.__ludballScoreState;

if (!state) {
  state = {
    score: 0,
    hits: 0,
    running: false,
    detected: false,
    bits: "00000000",
    green: false,
    ip: "",
    updatedAt: 0,
    reason: "boot",
    command: "READY",
    commandSeq: 1,
  };
  globalThis.__ludballScoreState = state;
}

function send(res, status, body) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}

function setCommand(command) {
  state.command = command;
  state.commandSeq += 1;
  if (command === "RESET" || command === "READY") {
    state.score = 0;
    state.hits = 0;
    state.detected = false;
    state.bits = "00000000";
    state.running = false;
  } else if (command === "START" || command === "GO") {
    state.running = true;
  } else if (command === "FINISH" || command === "STOP") {
    state.running = false;
  }
}

export default function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).end();
    return;
  }

  if (req.method === "GET") {
    const action = String(req.query.action || "").toUpperCase();
    if (action) setCommand(action);
    send(res, 200, state);
    return;
  }

  if (req.method === "POST") {
    const payload = typeof req.body === "object" && req.body ? req.body : {};
    state.score = Number.isFinite(Number(payload.score)) ? Number(payload.score) : state.score;
    state.hits = Number.isFinite(Number(payload.hits)) ? Number(payload.hits) : state.hits;
    state.running = typeof payload.running === "boolean" ? payload.running : state.running;
    state.detected = typeof payload.detected === "boolean" ? payload.detected : state.detected;
    state.bits = typeof payload.bits === "string" ? payload.bits : state.bits;
    state.green = typeof payload.green === "boolean" ? payload.green : state.green;
    state.ip = typeof payload.ip === "string" ? payload.ip : state.ip;
    state.reason = typeof payload.reason === "string" ? payload.reason : "post";
    state.updatedAt = Date.now();
    send(res, 200, state);
    return;
  }

  send(res, 405, { error: "method_not_allowed" });
}
