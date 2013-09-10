/**
 * Module dependencies.
 */

var LRU = require('lru-cache');
var Adapter = require('../adapter');
var noop = function(){};

/**
 * Expose `Memory`.
 */

module.exports = Memory;

/**
 * Initialize a new Memory driver.
 *
 * @api public
 */

function Memory(options) {
  this.init(options);
}

/**
 * Inherits from `Adapter`.
 */

Memory.prototype.__proto__ = Adapter.prototype;

/**
 * Initiate driver
 *
 * @api private
 */

Memory.prototype.init = function (options, fn) {
  options = options || {};
  fn = fn || noop;
  options.maxAge = 1000 * (options.expires || 60); // default is 60 seconds
  this.cache = LRU(options);
  process.nextTick(fn.bind(null, null));
  return this;
};

/**
 * Set `key` / `val` pair.
 *
 * @param {String} key
 * @param {Mixed} val
 * @param {Function} [fn]
 * @api public
 */

Memory.prototype.set = function (key, val, fn) {
  fn = fn || noop;
  this.cache.set(key, val, fn);
  process.nextTick(fn.bind(null, null));
  return this;
};

/**
 * Get `key` value.
 *
 * @param {String} key
 * @param {Function} [fn]
 * @api public
 */

Memory.prototype.get = function (key, fn) {
  fn = fn || noop;
  var res = this.cache.get(key);
  process.nextTick(function () {
    fn(null, res);
  });
  return res;
};