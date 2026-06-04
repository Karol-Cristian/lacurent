const GUEST_SESSION_KEY = "lacurent_guest_session";

function createGuestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readGuestSession() {
  try {
    const existing = JSON.parse(localStorage.getItem(GUEST_SESSION_KEY) || "null");
    if (existing?.id) return existing;
  } catch {}
  return {
    id: createGuestId(),
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    homesAnalyzed: [],
    currentHomeDraft: null,
    reportsGenerated: [],
    scenariosViewed: [],
    consentState: {
      necessary: true,
      analytics: false,
      marketing: false,
      personalization: true
    }
  };
}

function writeGuestSession(session) {
  const next = { ...session, lastSeenAt: new Date().toISOString() };
  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(next));
  return next;
}

function saveHomeDraft(inputData, mode = "owner") {
  const session = readGuestSession();
  const draft = {
    id: session.currentHomeDraft?.id || createGuestId(),
    mode,
    updatedAt: new Date().toISOString(),
    inputData,
    completionPercent: Math.min(100, Math.round(Object.keys(inputData || {}).length / 45 * 100))
  };
  session.currentHomeDraft = draft;
  return writeGuestSession(session);
}

function saveReportResult(result) {
  const session = readGuestSession();
  const reportId = `guest-report-${Date.now()}`;
  const report = {
    reportId,
    accessType: "guest",
    savedLocally: true,
    savedToCloud: false,
    generatedAt: new Date().toISOString(),
    result
  };
  session.reportsGenerated = [report, ...(session.reportsGenerated || [])].slice(0, 5);
  if (session.currentHomeDraft) {
    session.currentHomeDraft.generatedReportId = reportId;
  }
  return writeGuestSession(session);
}

function latestReport() {
  return readGuestSession().reportsGenerated?.[0] || null;
}

function clearGuestSession() {
  localStorage.removeItem(GUEST_SESSION_KEY);
}

window.LaCurentGuest = {
  read: readGuestSession,
  saveHomeDraft,
  saveReportResult,
  latestReport,
  clear: clearGuestSession
};
