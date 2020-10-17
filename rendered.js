
const { spawn } = require('child_process');
const { dialog } = require('electron').remote;
const winston = require('winston');
const fs = require('fs');
const os = require('os');

const alarmAudio = new Audio('./alarm.mp3');
alarmAudio.loop = true;

const LiveDownDetector = require('./LiveDownDetector');

Notification.requestPermission();

let downDetector;

const form = document.getElementById('log-form');
let loggingInProgress = false;
toggleLoggingInProgress(false);
let logger;
form.onsubmit = startLogging;

const osPlatform = os.platform();

if (osPlatform === 'win32') {
  const logIntervalEl = document.getElementById('logging-interval');
  logIntervalEl.value = 1;
  logIntervalEl.disabled = true;
}

const processes = {
  'server-1': undefined,
  'server-2': undefined,
  'server-3': undefined
};

const formats = {
  txt: winston.format.printf(info => `${new Date().toISOString()} [${info.ip}] ${info.message}`.trim()),
  json: winston.format.combine(
    winston.format.timestamp(),
    winston.format.prettyPrint()
  )
}

window.onbeforeunload = function(e) {
  if (loggingInProgress) {
    const clickedIndex = dialog.showMessageBoxSync(
      {
        type: 'warning',
        buttons: [
          'Continue Logging',
          'Stop Logging'
        ],
        message: "Logging will be cancelled if the window is closed or reloaded."
      }
    )
    if (clickedIndex === 0) { // continue logging
      e.returnValue = true;
    } else {
      stopLogging();
      window.destroy();
    }

    return e;
  }
  return;
}

function getDowntimeAlertingOptions() {
  return {
    alarm: document.getElementById('alarm').checked,
    notifications: document.getElementById('notifications').checked
  };
}

function alarmTest(e) {
  e.disabled = true;
  alarmAudio.play();
  setTimeout(() => {
    alarmAudio.pause();
    e.disabled = false;
  }, 3000);
}

function toggleLoggingInProgress(setValue) {
  loggingInProgress = setValue;

  const runForm = document.getElementById('log-form');
  const runningStats = document.getElementById('logging-in-progress');
  if (loggingInProgress) {
    runForm.classList.add('hide');
    runForm.classList.remove('show');
    runningStats.classList.add('show');
    runningStats.classList.remove('hide');
  } else {
    runForm.classList.add('show');
    runForm.classList.remove('hide');
    runningStats.classList.add('hide');
    runningStats.classList.remove('show');
  }
}

function liveLogRender(serverKey, txt, timestamp) {
  const key = `${serverKey}-tail`;
  document.getElementById(key).textContent = `[${timestamp}]\n${txt}`;
}

function renderLastDowntime(event = {}) {
  const key = `last-downtime-display`;
  const secondsDiff = Math.floor(event.duration / 1000);
  document.getElementById(key).textContent = `
    ${event.start.toLocaleTimeString()} - ${event.end.toLocaleTimeString()}

    ${secondsDiff} second${secondsDiff === 1 ? 's' : ''}
  `;
}

function renderDowntimeTable() {
  const downtimeTable = document.getElementById('downtime-table');
  const tBody = downtimeTable.children[1];

  const buildRow = (event, index) => {
    const secondsDiff = Math.floor(event.duration / 1000);
    return `<tr>
      <td>${index + 1}</td>
      <td>${secondsDiff}</td>
      <td>${event.start.toLocaleTimeString()}</td>
      <td>${event.end.toLocaleTimeString()}</td>
      <td>${event.start.toLocaleDateString()}</td>
    </tr>`;
  };

  const tBodyHtml = downDetector.recordedEvents.map(buildRow);
  tBody.innerHTML = tBodyHtml.join('\n');
}

/**
 * @param {string} serverKey server key identifier ie: server-1
 * @param {string} serverIp
 * @param {winston.Logger} logger
 * @param {number} logInterval ping interval in seconds
 * @returns {ChildProcess}
 */
function wrapSpawn(serverKey, serverIp, logger, logInterval) {
  const args = [serverIp];
  if (osPlatform === 'win32') {
    args.push('-t');
  } else {
    args.push('-i', logInterval);
  }
  const proc = spawn('ping', args, { shell: true });
  proc.stdout.on('data', (data) => {
    const ts = new Date();
    downDetector.handle({
      ip: serverIp,
      message: data.toString(),
      timestamp: ts
    });
    liveLogRender(serverKey, data.toString(), ts.toISOString());
    logger.verbose(data.toString(), { ip: serverIp });
  });
  proc.stderr.on('data', (data) => {
    const ts = new Date();
    downDetector.handle({
      ip: serverIp,
      message: data.toString(),
      timestamp: ts
    });
    liveLogRender(serverKey, data.toString(), ts.toISOString());
    logger.error(data.toString(), { ip: serverIp });
  });
  proc.on('close', () => {
    logger.info(`Logging Stopped`, { ip: serverIp });
  });
  return proc;
}


/**
 * @param {string} filename
 * @param {string} filePath
 * @returns {winston.Logger}
 */
function getLogger(filename, filePath, format = 'json') {
  const useFormatter = formats[format];
  logger = winston.createLogger({
    level: 'silly',
    format: useFormatter,
    transports: [
      new winston.transports.File({ filename: `${filePath}/${filename}` }),
    ]
  });
  return logger;
}

function validateFormElement(el) {
  if (!el.value) {
    if (!el.classList.contains('invalid')) {
      el.classList.add('invalid');
    }
    return false;
  } else {
    if (el.classList.contains('invalid')) {
      el.classList.remove('invalid');
    }
  }
  return true;
}

function onNetworkDown(timestamp) {
  const opts = getDowntimeAlertingOptions();
  if (opts.notifications) {
    new Notification('Network Down', {
      body: `Network is down as of ${timestamp.toLocaleTimeString()}`
    });
  }
  if (opts.alarm) {
    alarmAudio.play();
  }
}

function onNetworkBackUp(recordedEvent = {}) {
  const opts = getDowntimeAlertingOptions();
  alarmAudio.pause();
  renderLastDowntime(recordedEvent);
  renderDowntimeTable();
  if (opts.notifications) {
    new Notification('Network Up', {
      body: `Network is back up as of ${recordedEvent.end.toLocaleTimeString()}`
    });
  }
}

function startLogging(e) {
  e.preventDefault();
  if (loggingInProgress) {
    console.warn('Logging already in progress!!');
  }
  const logIntervalEl = document.getElementById('logging-interval');
  const logDirEl = document.getElementById('logging-directory');
  const logFileEl = document.getElementById('logging-filename');
  const serverElements = Object.keys(processes).map((k) => document.getElementById(k));
  const allValid = [logDirEl, logFileEl, logIntervalEl, ...serverElements]
    .map(validateFormElement)
    .every(val => val);

  if (!allValid) {
    return;
  }

  const logger = getLogger(
    logFileEl.value,
    logDirEl.value,
    document.getElementById('logging-format').value
  );

  const ips = serverElements.map((serverInput) => {
    console.log(serverInput);
    const serverIp = serverInput.value;
    return serverIp;
  });

  downDetector = new LiveDownDetector(ips, onNetworkDown, onNetworkBackUp);

  for (const [key, existingProcess] of Object.entries(processes)) {
    const serverIp = document.getElementById(key).value;
    if (existingProcess) {
      existingProcess.kill('SIGINT');
    }
    processes[key] = wrapSpawn(key, serverIp, logger, logIntervalEl.value);
  }
  toggleLoggingInProgress(true);
}

async function selectLoggingDir() {
  const resolved = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (resolved.canceled) {
    return;
  }
  if (!resolved.filePaths || resolved.filePaths.length < 0) {
    return;
  }
  const logDir = document.getElementById('logging-directory');
  logDir.value = resolved.filePaths[0];
}

function stopLogging() {
  if (!loggingInProgress) {
    console.warn('Logging already not running!!');
  }

  for (const existingProcess of Object.values(processes)) {
    existingProcess.kill('SIGINT');
  }
  downDetector = undefined;
  toggleLoggingInProgress(false);
}
