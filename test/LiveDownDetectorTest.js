
const assert = require('assert');
const LiveDownDetector = require('../LiveDownDetector');

const testIp = '0.0.0.0';
const failMessage = 'Request timeout ...';
const successMessage = '64 bytes from ...';

const baseDate = Date.now();
const timestamps = [
  baseDate,
  new Date(baseDate + 1000),
  new Date(baseDate + 2000),
  new Date(baseDate + 3000)
];


describe('LiveDownDetector', () => {
  describe('end-to-end', () => {
    it('should do expected', () => {
      const instance = new LiveDownDetector([testIp]);
      assert.strictEqual(instance._currentEvent, null);

      instance.handle({
        ip: testIp,
        message: failMessage,
        timestamp: timestamps[0]
      });
      assert.strictEqual(instance._currentEvent, timestamps[0]);
      assert.deepStrictEqual(instance._records, []);

      instance.handle({
        ip: testIp,
        message: failMessage,
        timestamp: timestamps[1]
      });
      assert.strictEqual(instance._currentEvent, timestamps[0]);
      assert.deepStrictEqual(instance._records, []);

      instance.handle({
        ip: testIp,
        message: failMessage,
        timestamp: timestamps[2]
      });
      assert.strictEqual(instance._currentEvent, timestamps[0]);
      assert.deepStrictEqual(instance._records, []);

      instance.handle({
        ip: testIp,
        message: successMessage,
        timestamp: timestamps[3]
      });
      assert.strictEqual(instance._currentEvent, null);
      assert.deepStrictEqual(instance._records, [{
        start: timestamps[0],
        end: timestamps[3],
        duration: timestamps[3] - timestamps[0]
      }]);
    });
  });
});
