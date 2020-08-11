
const os = require('os');
const { spawn } = require('child_process');


const osPlatform = os.platform();

function ping(ipAddr, args = {}, opts = {}) {
  const {
    interval = 3,
    interface = undefined
  } = args;

  const cliArgs = [ipAddr];
  if (osPlatform === 'win32') {
    args.push('-t');
  } else {
    args.push('-i', interval);
    if (interface) {
      args.push('-I', interface);
    }
  }
  console.debug('ping', ...cliArgs);
  const proc = spawn('ping', cliArgs, { shell: true, ...opts });
  return proc;
}

module.exports = ping;
