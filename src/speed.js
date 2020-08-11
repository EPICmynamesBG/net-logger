
const https = require('https');

class IntervalSpeedTest {
  constructor(logger, minuteInterval = 5, onMessage = () => {}, url = 'https://google.com') {
    this.timeInterval = minuteInterval;
    this._testUrl = url;
    this._interval = undefined;
    this._logger = logger;
    this._onMessage = onMessage;
  }

  static humanize(nb) {
    if (nb < 10 ** 3) return `${Math.floor(nb)}`;
    if (nb < 10 ** 6) return `${Math.floor(nb / 10 ** 3)}K`;
    if (nb < 10 ** 9) return `${Math.floor(nb / 10 ** 6)}M`;
    return `${Math.floor(nb / 10 ** 9)}G`;
  }

  go() {
    if (this._interval) {
      clearInterval(this._interval);
    }

    this._interval = setInterval(
      () => this.once(),
      this.timeInterval * 1000 * 60
    );
    this.once();
  }

  _report(bits, time, isLast = false) {
    const seconds = (time - this._startTime) / 1000;
    const bitsPerSecond = bits / seconds;
    this._onMessage(`${IntervalSpeedTest.humanize(bitsPerSecond)}b/s`, isLast);
    if (isLast) {
      this._logger.verbose(`${IntervalSpeedTest.humanize(bitsPerSecond)}b/s`, { ip: url });
    }
  }

  _test() {
    this._startTime = new Date();
    const url = new URL(this._testUrl);
    https.request(url, (res) => {
      console.log('statusCode:', res.statusCode);
      let bits = 0;
      res.on('data', (chunk) => {
        bits += chunk.length * 8;
        this._report(bits, new Date(), false);
      });
      res.on('error', (e) => {
        console.error(e);
        this._onMessage(e, false);
        this._logger.error(e);
      });
      res.on('end', () => {
        this._report(bits, new Date(), true);
        this._startTime = undefined;
      });
    }).on('error', (e) => {
      console.error(e);
      this._onMessage(e, false);
      this._logger.error(e);
    }).end();
  }

  once() {
    this._test();
  }

  cancel() {
    clearInterval(this._interval);
  }
}

module.exports = IntervalSpeedTest;
