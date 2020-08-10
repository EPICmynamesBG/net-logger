
const { spawn } = require('child_process');
const { dialog } = require('electron').remote;
const winston = require('winston');
const fs = require('fs');
const os = require('os');

const {
  listNetworkInterfaces
} = require('./src/interface');

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
  toggleLoggingInProgress(false);
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
