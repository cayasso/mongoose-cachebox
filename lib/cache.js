/**
 * Module dependencies.
 */

var catbox = require('catbox');
var debug = require('debug')('mongoose-cachebox:cache');

/**
 * Expose module.
 */

module.exports = Cache;

/**
 * Cache constructor.
 *
 * @param {String} id
 * @param {Query} query
 * @param {Object} opt
 * @param {Function} fn
 * @api public
 */

function Cache(id, opt, fn) {

  // singleton
  if (!(this instanceof Cache)) {
    return (id in Cache.instances) ?
    Cache.instances[id] :
    new Cache(id, opt, fn);
  }

  opt = opt || {};

  var options = opt.options;

  // set ttl
  this.key(opt.key);

  // set ttl
  this.ttl(('ttl' in opt) ? opt.ttl : 60000);

  // set cached
  this.cached(('cached' in opt) ? opt.cached : false);

  // get client instance
  this.client = new catbox.Client(opt.options);

  // start connection
  this.client.start(fn || function () {});
  debug('starting cachebox');

  // save instance to instance list
  Cache.instances[id] = this;
}

// Instances
Cache.instances = {};

/**
 * Set or get cache key.
 *
 * @param {Object} key
 * @return {Cache|Object} self or cache key
 * @api public
 */

Cache.prototype.key = function (key) {
  if (!arguments.length) return this._key;
  this._key = key;
  return this;
};

/**
 * Set or get cached value.
 *
 * @param {Boolean} cached
 * @return {Cache|Boolean} self or cached
 * @api public
 */

Cache.prototype.cached = function (cached) {
  if (!arguments.length) return this._cached;
  this._cached = cached;
  return this;
};

/**
 * Time to live setter and getter.
 *
 * @param {Number} ttl
 * @return {Cache|Number} this
 * @api public
 */

Cache.prototype.ttl = function (ttl) {
  if (!arguments.length) return this._ttl;
  this._ttl = ttl;
  return this;
};

/**
 * Cache query.
 *
 * @param {Object} val
 * @param {Function} fn
 * @return {Cache} self
 * @api public
 */

Cache.prototype.set = function (val, fn) {
  this.client.set(this._key, val, this._ttl, fn);
  return this;
};

/**
 * Get cached query.
 *
 * @param {Function} fn
 * @return {Cache} self
 * @api public
 */

Cache.prototype.get = function (fn) {
  this.client.get(this._key, fn);
  return this;
};

/**
 * Drop cached query.
 *
 * @param {Function} fn
 * @return {Cache} self
 * @api public
 */

Cache.prototype.drop = function (fn) {
  this.client.drop(this._key, fn);
  return this;
};
