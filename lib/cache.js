/**
 * Module dependencies.
 */

var Cacheman = require('cacheman')
  , debug = require('debug')('mongoose-cachebox:cache');

/**
 * Expose `Cache`.
 */

module.exports = Cache;

/**
 * Cache instances.
 *
 * @type {Object}
 * @api public
 */

Cache.instances = {};

/**
 * Bucket instances.
 *
 * @type {Object}
 * @api public
 */

Cache.buckets = {};

/**
 * Cache constructor.
 *
 * @param {Query} query
 * @param {Object} options
 * @api public
 */

function Cache(query, options, middleware) {

  var id = query.key;

  if (!(this instanceof Cache)) {
    return (id in Cache.instances) ?
      Cache.instances[id] :
      new Cache(query, options, middleware);
  }

  this.id = id;
  this._name = query.model.modelName;
  this.ttl(60);
  this.cache(false);
  this.cached(false);
  this.client = (this._name in Cache.buckets) ?
  Cache.buckets[this._name] : 
  new Cacheman(this._name, options);
  Cache.instances[id] = this;
  Cache.buckets[this._name] = this.client;
  if (middleware) this.client._fns[0] = middleware.bind(this);
}

/**
 * Add a middleware for intercepting cache values.
 *
 * @param {Function} fn
 * @return {Cache} this
 * @api public
 */

Cache.prototype.use = function use(fn) {
  this.client._fns[1] = null;
  this.client._fns[1] = fn;
  return this;
};

/**
 * Enable or disable caching.
 *
 * @param {Boolean} cached
 * @return {Cache|Boolean} self or cached
 * @api public
 */

Cache.prototype.cache = function cache(val) {
  if (!arguments.length) return this._cache;
  this._cache = val;
  return this;
};

/**
 * Set or get cached value.
 *
 * @param {Boolean} cached
 * @return {Cache|Boolean} self or cached
 * @api public
 */

Cache.prototype.cached = function cached(val) {
  if (!arguments.length) return this._cached;
  this._cached = val;
  return this;
};

/**
 * Time to live setter and getter.
 *
 * @param {Number} ttl
 * @return {Cache|Number} this
 * @api public
 */

Cache.prototype.ttl = function ttl(val) {
  if (!arguments.length) return this._ttl;
  this._ttl = val;
  return this;
};

/**
 * Autocache docs
 *
 * @param {Function} fn
 * @return {Cache} this
 * @api private
 */

Cache.prototype.autocache = function autocache(fn) {
  var cache = this;
  cache.client.cache(cache.id, undefined, cache._ttl, function autocache(err, res) {    
    if (err) return fn(err);
    cache.cached(true);
    fn(null, res);
  });
  return this;
};

/**
 * Cache query.
 *
 * @param {Object} val
 * @param {Function} fn
 * @return {Cache} this
 * @api public
 */

Cache.prototype.set = function set(val, fn) {
  var cache = this;
  cache.client.set(cache.id, val, cache._ttl, function set(err, res) {
    if (err) return fn(err);
    cache.cached(true);
    fn(null, res);
  });
  return this;
};

/**
 * Get cached query.
 *
 * @param {Function} fn
 * @return {Cache} this
 * @api public
 */

Cache.prototype.get = function get(fn) {
  var cache = this;
  cache.client.get(cache.id, function get(err, res) {
    if (err) return fn(err);
    cache.cached(!!res);
    fn(null, res);
  });
  return this;
};

/**
 * Delete cached query.
 *
 * @param {Function} fn
 * @return {Cache} this
 * @api public
 */

Cache.prototype.del = function del(fn) {
  var cache = this;
  cache.client.del(cache.id, function del(err, res) {
    if (err) return fn(err);
    cache.cached(false);
    fn(null, res);
  });
  return this;
};