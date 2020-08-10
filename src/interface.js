const { execSync } = require('child_process');

/**
 * @returns {string[]}
 */
function darwinFindActiveInterfaces(str) {
  const splt = str.split('\n');
  const parsedEntries = [];
  let startI = null;
  for (i = 0; i < splt.length; i++) {
    const entry = splt[i];
    if (entry.charAt(0) === '\t') {
      continue;
    }
    if (startI !== null) {
      parsedEntries.push(splt.slice(startI, i).join('\n'));
    }
    startI = i;
  }
  parsedEntries.push(splt.slice(startI, splt.length).join('\n'));

  const hasIp = (str) => (/inet\s\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g).test(str);
  const isActive = (str) => str.includes('status: active');
  const isNotLoopback = (str) => !str.startsWith('lo');
  const activeEntries = parsedEntries
    .filter(hasIp)
    .filter(isActive)
    .filter(isNotLoopback);

  return activeEntries.map(entry => (entry.split(':')[0]));
}

function listNetworkInterfaces(osPlatform) {
    let cmd;
    let findActiveInterfaces = () => [];
    if (osPlatform === 'win32') {
      cmd = 'ipconfig';
      // findActiveInterfaces = () => {};
    } else if (osPlatform === 'darwin') {
      cmd = 'ifconfig';
      findActiveInterfaces = darwinFindActiveInterfaces;
    } else {
      console.warn(`Unsupported OS ${osPlatform} to check network interfaces`);
      return [];
    }
    try {
      const output = execSync(cmd, {
        windowsHide: true
      });
      // console.log(output.toString());
      return findActiveInterfaces(output.toString());
    } catch (e) {
      console.warn('Failed to check network interfaces', e);
      return [];
    }
}

module.exports = {
  listNetworkInterfaces
}
