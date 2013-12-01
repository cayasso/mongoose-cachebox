/**
 * Module dependencies.
 */

var Cache = require('./cache')
  , finder = require('./finder')
  , debug = require('debug')('mongoose-cachebox');

/**
 * Expose module.
 */

module.exports = function mongooseCacheBox(mongoose, options, cb) {

  // make sure options is declared
  options = options || {};

  // get our adapter `memory` is assumed by default
  options.engine = options.engine || 'memory';

  // default time to live in ms
  var TTL = options.ttl || 60
    , CACHED = 'cache' in options ? options.cache : false
    , Query = mongoose.Query
    , bind = Query.prototype.bind
    , exec = Query.prototype.exec
    , execFind = Query.prototype.execFind;

  /**
   * Bind query options.
   *
   * @api private
   */

  Query.prototype.bind = function (model, op, updateArg) {

    bind.call(this, model, op, updateArg);

    var obj = {};

    this._recache = false;
    this._expiredCb = null;
    this._hasMiddleware = false;

    // generate cache key
    for (var k in this) obj[k] = this[k];

    obj.model = this.model.modelName;

    this.key = JSON.stringify(obj);

    this.initCache(model.schema.options);
        
    return this;
  };

  /**
   * Initialize cache and set instance.
   *
   * @param {Object} opt
   * @return {Query} this
   * @api private
   */

  Query.prototype.initCache = function (opt) {

    // setting cache instance
    this._cache = Cache(this, options, finder(this, execFind));

    if ('cache' in opt) {
      this._cache.cache(opt.cache);
    }

    if ('ttl' in opt && 'number' === typeof opt.ttl) {
      this._cache.ttl(opt.ttl);
    }

    return this;

  };

  /**
   * Time to live setter and getter.
   *
   * @param {Number} ttl
   * @return {Query|Number} this
   * @api public
   */

  Query.prototype.ttl = function (ttl) {
    var cache = this._cache;
    var _ttl = cache.ttl();
    if (!arguments.length) return _ttl;
    if (_ttl !== ttl) {
      this._recache = true;
      cache.ttl(ttl);
    }
    return this;
  };
  
  /**
   * Time to live setter and getter.
   *
   * @param {Boolean} cached
   * @param {Number} ttl
   * @return {Query} this
   * @api public
   */

  Query.prototype.cache = function (cached, ttl) {

    if (!arguments.length) {
      cached = true;
    } else {

      if (!this._hasMiddleware) {
        if ('function' === typeof cached) {
          this._cache.use(cached);
          this._hasMiddleware = true;
        }

        if ('function' === typeof ttl) {
          this._cache.use(ttl);
          this._hasMiddleware = true;
        }
      }

      if (/string|number/.test(typeof cached)) {
        ttl = cached;
        cached = true;
      }
    }

    if ('undefined' !== typeof ttl) {
      this.ttl(ttl);
    }

    this._cache.cache(!!cached);

    return this;
  };
  
  /**
   * Execute find.
   *
   * @param {Function} fn
   * @return {Query} this
   * @api private
   */

  Query.prototype.execFind = function (fn) {
    if (!this._cache || !this._cache.cache()) return execFind.call(this, fn);
    this._cache.autocache(fn);
    return this;
  };

  /**
   * Execute query.
   *
   * @param {String|Function} op
   * @param {Function} fn
   * @return {Query} this
   * @api private
   */

  Query.prototype.exec = function (op, fn) {
    if (!this.cached) return exec.call(this, op, fn);
    if ('function' === typeof op) {
      fn = op;
      op = null;
    }
    exec.call(this, op, fn);
    return this;
  };

  /**
   * Check if results from this query is from cache.
   *
   * @type {Boolean}
   * @api public
   */

  Object.defineProperty(Query.prototype, 'isFromCache', {
    get: function () {
      return !!(this._cache && this._cache.cached());
    }
  });

  /**
   * Check if this query has caching enabled.
   *
   * @type {Boolean}
   * @api public
   */

  Object.defineProperty(Query.prototype, 'isCacheEnabled', {
    get: function () {
      return !!(this._cache && this._cache.cache());
    }
  });

  return mongoose;

};