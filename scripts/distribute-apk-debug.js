/**
 * Debug script: run Firebase App Distribution and log result to .cursor/debug.log
 * Used to capture exact CLI error for fixing "not able to share APK" issue.
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const LOG_PATH = path.join(__dirname, '..', '.cursor', 'debug.log');

function writeLog(payload) {
  const line = JSON.stringify({ ...payload, timestamp: Date.now(), sessionId: 'debug-session' }) + '\n';
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, line);
  } catch (e) {
    console.error('Failed to write debug.log:', e.message);
  }
}

const projectRoot = path.join(__dirname, '..');
const firebasercPath = path.join(projectRoot, '.firebaserc');
const firebaseJsonPath = path.join(projectRoot, 'firebase.json');
const apkPath = path.join(projectRoot, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');

// #region agent log
const hasFirebaserc = fs.existsSync(firebasercPath);
const hasFirebaseJson = fs.existsSync(firebaseJsonPath);
const apkExists = fs.existsSync(apkPath);
let firebasercProject = null;
if (hasFirebaserc) {
  try {
    firebasercProject = JSON.parse(fs.readFileSync(firebasercPath, 'utf8'));
  } catch (_) {}
}
writeLog({
  hypothesisId: 'H1',
  location: 'scripts/distribute-apk-debug.js:env',
  message: 'Firebase App Distribution env check',
  data: { hasFirebaserc, hasFirebaseJson, apkExists, apkPath, firebasercProject },
});
// #endregion

// Android app ID from google-services.json (Indiapropertys.com)
const FIREBASE_APP_ID = '1:387721645160:android:77059b638b915c22a6bfdd';

const args = [
  'appdistribution:distribute',
  apkPath,
  '--app', FIREBASE_APP_ID,
  '--release-notes', 'Debug distribution run',
  '--testers', 'test@example.com',
];

// #region agent log
writeLog({
  hypothesisId: 'H2',
  location: 'scripts/distribute-apk-debug.js:args',
  message: 'Firebase CLI command args',
  data: { command: 'firebase ' + args.join(' '), appId: FIREBASE_APP_ID },
});
// #endregion

const proc = spawn('firebase', args, {
  cwd: projectRoot,
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stdout = '';
let stderr = '';
proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

proc.on('close', (code, signal) => {
  // #region agent log
  writeLog({
    hypothesisId: 'H4',
    location: 'scripts/distribute-apk-debug.js:result',
    message: 'Firebase distribute command finished',
    data: { exitCode: code, signal, stdout: stdout.slice(0, 2000), stderr: stderr.slice(0, 2000) },
  });
  // #endregion
  if (code === 0) {
    console.log('Distribution succeeded.');
    console.log(stdout);
  } else {
    console.error('Distribution failed. Check .cursor/debug.log for details.');
    console.error('stderr:', stderr);
    console.error('stdout:', stdout);
    process.exit(code || 1);
  }
});

proc.on('error', (err) => {
  // #region agent log
  writeLog({
    hypothesisId: 'H4',
    location: 'scripts/distribute-apk-debug.js:spawnError',
    message: 'Firebase CLI spawn error',
    data: { error: err.message, code: err.code },
  });
  // #endregion
  console.error('Failed to run firebase:', err.message);
  process.exit(1);
});
