
class LiveDownDetector {
  constructor(ips = [], onDown = () => {}, onBackUp = () => {}) {
    /**
     * @example { '0.0.0.0': { success: true, message: '', timestamp: new Date() } }
     * @type {object<string,date>}
     */
    this._lastIpState = ips.reduce((obj, ip) => {
      return {
        ...obj,
        [ip]: {
          success: null,
          message: null,
          timestamp: null
        }
      }
    }, {});

    this.onDown = onDown;
    this.onBackUp = onBackUp;

    /**
     * timestamp of the start of the ongoing downtime
     * @type {Date?}
     */
    this._currentEvent = null;

    this._records = [];
    console.log(this);
  }

  get isNetworkDown() {
    return this._currentEvent !== null;
  }

  get recordedEvents() {
    return this._records;
  }

  get lastEvent() {
    return this._records[this._records.length - 1]
  }

  /**
   * @param {string} message
   * @returns {boolean}
   */
  static isSuccess(message) {
    return message.includes('bytes from');
  }

  /**
   * @param {string} message
   * @returns {boolean}
   */
  static isDown(message) {
    return message.startsWith('Request timeout');
  }

  /**
   * @public
   */
  handle({ ip, message, timestamp }) {
    let isSuccess = null;
    if (this.constructor.isSuccess(message)) {
      isSuccess = true;
    } else if (this.constructor.isDown(message)) {
      isSuccess = false;
    }
    this._lastIpState[ip] = {
      success: isSuccess,
      message: message,
      timestamp: timestamp
    };
    this.determineDownState(timestamp);
  }

  /**
   * @protected
   */
  determineDownState(timestamp) {
    const ips = Object.keys(this._lastIpState);
    const allDown = ips.every((ip) => this._lastIpState[ip].success === false);
    if (allDown) {
      if (this.isNetworkDown) {
        // still ongoing
        return;
      }
      this._currentEvent = this._lastIpState[ips[0]].timestamp;
      this.onDown(this._currentEvent);
    }
    // not allDown
    if (this.isNetworkDown) { // network WAS down
      // network is back up!
      this.recordEvent(timestamp);
      this._currentEvent = null;
      this.onBackUp(this.lastEvent);
      return;
    }
    console.log('None down');
    // not allDown, network wasn't down before. All is well and working
    return;
  }

  /**
   * @protected
   */
  recordEvent(timestamp) {
    const startTime = this._currentEvent;
    const endTime = timestamp;
    this._records.push({
      start: startTime,
      end: endTime,
      duration: endTime - startTime
    });
  }
}

module.exports = LiveDownDetector;
