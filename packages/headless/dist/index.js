// src/index.ts
function emitEvent(event) {
  process.stdout.write(JSON.stringify(event) + `
`);
}
function emitSessionStart(sessionId, model, mode, project) {
  emitEvent({
    type: "session.start",
    session_id: sessionId,
    model,
    mode,
    project,
    ts: Date.now()
  });
}
function emitThinking(sessionId, text) {
  emitEvent({
    type: "thinking",
    session_id: sessionId,
    text,
    ts: Date.now()
  });
}
function emitContentDelta(sessionId, text, model, role) {
  emitEvent({
    type: "content.delta",
    session_id: sessionId,
    text,
    model,
    role,
    ts: Date.now()
  });
}
function emitToolStart(sessionId, tool, input) {
  emitEvent({
    type: "tool.start",
    session_id: sessionId,
    tool,
    input,
    ts: Date.now()
  });
}
function emitToolDone(sessionId, tool, output) {
  emitEvent({
    type: "tool.done",
    session_id: sessionId,
    tool,
    output,
    ts: Date.now()
  });
}
function emitContentDone(sessionId, text, model, tokens, durationMs) {
  emitEvent({
    type: "content.done",
    session_id: sessionId,
    text,
    model,
    tokens,
    duration_ms: durationMs,
    ts: Date.now()
  });
}
function emitSessionEnd(sessionId) {
  emitEvent({
    type: "session.end",
    session_id: sessionId,
    ts: Date.now()
  });
}
function emitError(sessionId, message, code) {
  emitEvent({
    type: "error",
    session_id: sessionId,
    message,
    code,
    ts: Date.now()
  });
}
function emitModelStart(sessionId, model, role) {
  emitEvent({
    type: "model.start",
    session_id: sessionId,
    model,
    role,
    ts: Date.now()
  });
}
function emitModelDone(sessionId, model, role) {
  emitEvent({
    type: "model.done",
    session_id: sessionId,
    model,
    role,
    ts: Date.now()
  });
}
function emitSynthesisStart(sessionId, model, role) {
  emitEvent({
    type: "synthesis.start",
    session_id: sessionId,
    model,
    role,
    ts: Date.now()
  });
}
function emitSynthesisDone(sessionId) {
  emitEvent({
    type: "synthesis.done",
    session_id: sessionId,
    ts: Date.now()
  });
}
function readPromptFromStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data.trim()));
    process.stdin.on("error", reject);
    process.stdin.resume();
  });
}
function isHeadlessMode(options) {
  if (options.print || options.json || options.pipe || options.oneshot)
    return true;
  if (process.env.NEXUS_HEADLESS === "1")
    return true;
  if (!process.stdout.isTTY)
    return true;
  return false;
}
export {
  readPromptFromStdin,
  isHeadlessMode,
  emitToolStart,
  emitToolDone,
  emitThinking,
  emitSynthesisStart,
  emitSynthesisDone,
  emitSessionStart,
  emitSessionEnd,
  emitModelStart,
  emitModelDone,
  emitEvent,
  emitError,
  emitContentDone,
  emitContentDelta
};
