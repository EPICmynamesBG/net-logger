const os = require('os');
const { dialog } = require('electron').remote;

const { getSpeedLogger, getPingLogger } = require('./src/logger');
const {
  listNetworkInterfaces
} = require('./src/interface');
const ping = require('./src/ping');
const IntervalSpeedTest = require('./src/speed');


const pingForm = document.getElementById('ping-form');
let pingLoggingInProgress = false;
togglePingLoggingInProgress(false);
pingForm.onsubmit = startPingLogging;

const speedForm = document.getElementById('speedtest-form');
let speedLoggingInProgress = false;
toggleSpeedLoggingInProgress(false);
speedForm.onsubmit = startSpeedLogging;

let speedtest = undefined;

const osPlatform = os.platform();

if (osPlatform === 'win32') {
  const logIntervalEl = document.getElementById('ping-logging-interval');
  logIntervalEl.value = 1;
  logIntervalEl.disabled = true;
}

const processes = {
  'server-1': undefined,
  'server-2': undefined,
  'server-3': undefined
};

window.onbeforeunload = function(e) {
  if (pingLoggingInProgress || speedLoggingInProgress) {
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
      if (pingLoggingInProgress) stopPingLogging();
      if (speedLoggingInProgress) stopSpeedLogging();
      window.destroy();
    }

    return e;
  }
  return;
}

function togglePingLoggingInProgress(setValue) {
  pingLoggingInProgress = setValue;

  const runForm = document.getElementById('ping-form');
  const runningStats = document.getElementById('ping-logging-in-progress');
  if (pingLoggingInProgress) {
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

function toggleSpeedLoggingInProgress(setValue) {
  speedLoggingInProgress = setValue;

  const runForm = document.getElementById('speedtest-form');
  const runningStats = document.getElementById('speedtest-in-progress');
  if (speedLoggingInProgress) {
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

/**
 * @param {string} serverKey server key identifier ie: server-1
 * @param {string} serverIp
 * @param {winston.Logger} logger
 * @param {number} logInterval ping interval in seconds
 * @returns {ChildProcess}
 */
function wrapSpawn(serverKey, serverIp, logger, logInterval, interface) {
  const proc = ping(serverIp, {
    interval: logInterval,
    interface
  });
  proc.stdout.on('data', (data) => {
    liveLogRender(serverKey, data.toString(), (new Date()).toISOString());
    logger.verbose(data.toString(), { ip: serverIp });
  });
  proc.stderr.on('data', (data) => {
    liveLogRender(serverKey, data.toString(), (new Date()).toISOString());
    logger.error(data.toString(), { ip: serverIp });
  });
  proc.on('close', () => {
    logger.info(`Logging Stopped`, { ip: serverIp });
  });
  return proc;
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


function startPingLogging(e) {
  e.preventDefault();
  if (pingLoggingInProgress) {
    console.warn('Logging already in progress!!');
  }
  const logIntervalEl = document.getElementById('ping-logging-interval');
  const logDirEl = document.getElementById('ping-logging-directory');
  const logFileEl = document.getElementById('ping-logging-filename');
  const serverElements = Object.keys(processes).map((k) => document.getElementById(k));
  const allValid = [logDirEl, logFileEl, logIntervalEl, ...serverElements]
    .map(validateFormElement)
    .every(val => val);

  if (!allValid) {
    return;
  }

  const logger = getPingLogger(
    logFileEl.value,
    logDirEl.value,
    document.getElementById('ping-logging-format').value
  );

  for (const [key, existingProcess] of Object.entries(processes)) {
    const serverIp = document.getElementById(key).value;
    if (existingProcess) {
      existingProcess.kill('SIGINT');
    }
    processes[key] = wrapSpawn(key, serverIp, logger, logIntervalEl.value);
  }
  togglePingLoggingInProgress(true);
}

function startSpeedLogging(e) {
  e.preventDefault();
  if (speedLoggingInProgress) {
    console.warn('Logging already in progress!!');
  }
  const logIntervalEl = document.getElementById('speed-logging-interval');
  const logDirEl = document.getElementById('speed-logging-directory');
  const logFileEl = document.getElementById('speed-logging-filename');
  const allValid = [logDirEl, logFileEl, logIntervalEl]
    .map(validateFormElement)
    .every(val => val);

  if (!allValid) {
    return;
  }

  const logger = getSpeedLogger(
    logFileEl.value,
    logDirEl.value,
    document.getElementById('speed-logging-format').value
  );

  speedtest = new IntervalSpeedTest(logger, logIntervalEl.value, (...args) => console.log(...args));
  speedtest.go();
  toggleSpeedLoggingInProgress(true);
}

async function selectLoggingDir(elementId) {
  const resolved = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (resolved.canceled) {
    return;
  }
  if (!resolved.filePaths || resolved.filePaths.length < 0) {
    return;
  }
  const element = document.getElementById(elementId);
  element.value = resolved.filePaths[0];
}

function stopPingLogging() {
  if (!pingLoggingInProgress) {
    console.warn('Logging already not running!!');
  }

  for (const existingProcess of Object.values(processes)) {
    existingProcess.kill('SIGINT');
  }
  togglePingLoggingInProgress(false);
}

function stopSpeedLogging() {
  if (!speedLoggingInProgress) {
    console.warn('Logging already not running!!');
  }

  if (speedtest) {
    speedtest.cancel();
  }
  toggleSpeedLoggingInProgress(false);
}

function generateInterfaceOptions() {
  const interfaces = listNetworkInterfaces(osPlatform);
  const selectEl = document.getElementById('network-interfaces');
  selectEl.innerHTML = undefined;
  interfaces.forEach((interface) => {
    const opt = document.createElement('option');
    opt.appendChild(document.createTextNode(interface));
    opt.value = interface;
    selectEl.appendChild(opt);
  });
}

function onInit() {
  generateInterfaceOptions();
}


onInit();
