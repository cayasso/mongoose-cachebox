/**
 * Module dependencies.
 */

var redis = require('redis');
var noop = function(){};

/**
 * Expose `Redis`.
 */

module.exports = Redis;

/**
 * Initialize a new Redis driver.
 *
 * @api public
 */

function Redis(options) {
  this.init(options);
}

/**
 * Inherits from `Adapter`.
 */

Redis.prototype.__proto__ = Adapter.prototype;

/**
 * Initiate driver
 *
 * @api private
 */

Redis.prototype.init = function (options, fn) {
  options = options || {};
  var port = options.port;
  var host = options.host;
  var opt = options.options;
  var pass = options.pass;
  this.expires = options.expires || 60; // default is 60 seconds
  this.db = redis.createClient(port, host, opt);
  if (pass) this.db.auth(pass, fn);
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

Redis.prototype.set = function (key, data, fn) {
  fn = fn || noop;
  var val = JSON.stringify(data);
  this.db.set(key, val, fn);
  this.db.expire(key, this.expires);
  return this;
};

/**
 * Get `key` value.
 *
 * @param {String} key
 * @param {Function} [fn]
 * @api public
 */

Redis.prototype.get = function (key, fn) {
  var result;
  fn = fn || noop;
  this.db.get(key, function (err, data) {
    if (err) return fn(err);
    result = JSON.parse(data);
    fn(null, result);
  });
  return this;
};