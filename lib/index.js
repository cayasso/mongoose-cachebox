/**
 * Module dependencies.
 */

var Cache = require('./cache')
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

  Query.prototype.bind = function () {

    bind.apply(this, arguments);

    var key
      , opt
      , obj = {}
      , ttl = TTL
      , cached = CACHED
      , model = this.model
      , schemaOptions = model.schema.options;

    this._recache = false;

    // generate cache key
    for (var k in this) obj[k] = this[k];
    obj.model = model.modelName;

    this.key = JSON.stringify(obj);

    // setting cache instance
    this._cache = Cache(this, options);

    if ('cache' in schemaOptions) {
      this._cache.cache(schemaOptions.cache);
    }

    if ('ttl' in schemaOptions && 'number' === typeof schemaOptions.ttl) {
      this._cache.ttl(schemaOptions.ttl);
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
      if ('boolean' !== typeof cached) {
        ttl = cached;
        cached = true;
      }
    }

    if ('undefined' !== typeof ttl) {
      this.ttl(ttl);
    }

    this._cache.cache(cached);

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

    var query = this
      , cache = this._cache
      , shouldCache = cache.cache()
      , isCached = cache.cached();

    if (!shouldCache) return execFind.call(query, fn);

    if (!this._recache) {

      // get docs from cache
      query.getCache(fn);

    } else {

      this._recache = false;
      // drop the existing cached query
      cache.del(function (err) {
        if (err) return console.error(err);
        query.setCache(fn);

        debug('query key is: %j', query.key);
      });
    }

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
   * Get cached query.
   *
   * @param {Function} fn
   * @return {Query} this
   * @api private
   */

  Query.prototype.getCache = function getCache(fn) {

    var query = this;
    var cache = query._cache;

    // get docs from cache
    cache.get(function get(err, res) {
      if (err) return fn(err);
      // if no results then we call original 
      // function and then we cache the result
      if (!res) return query.setCache(fn);

      debug('getting cached results');
      // we did found docs so we are in good shape
      // lets return the callback with cached results
      fn(null, res);

    });

    return this;
  };

  /**
   * Cache query.
   *
   * @param {Function} fn
   * @api private
   */

  Query.prototype.setCache = function setCache(fn) {

    var query = this;
    var cache = query._cache;

    return execFind.call(query, function find(err, docs) {

      // handle error
      if (err) return fn(err);

      debug('caching query', docs);
      // save docs to cache
      cache.set(docs, function set(err) {
        debug('cached query %j', query.key);
        if (err) console.warn('Cache Error:', err);
      });

      fn(null, docs);
    });
  };

  /**
   * Check if results from this query is from cache.
   *
   * @type {Boolean}
   * @api public
   */

  Object.defineProperty(Query.prototype, 'isFromCache', {
    get: function () {
      return this._cache.cached();
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
      return this._cache.cache();
    }
  });

  return mongoose;

};