/**
 * Module dependencies.
 */

var Cache = require('./cache');
var debug = require('debug')('mongoose-cachebox');

/**
 * Expose module.
 */

module.exports = function mongooseCacheBox(mongoose, options, cb) {

  // make sure options is declared
  options = options || {};

  // get our adapter `memory` is assumed by default
  options.engine = options.engine || 'memory';

  // default time to live in ms
  var TTL = options.ttl || 60000
    , CACHED = 'cached' in options ? options.cached : false
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

    if ('cache' in schemaOptions) {
      cached = schemaOptions.cache;
    }

    if ('ttl' in schemaOptions && 'number' === typeof schemaOptions.ttl) {
      ttl = schemaOptions.ttl;
    }

    // generate cache key
    for (var k in this) obj[k] = this[k];
    obj.model = model.modelName;
    key = { segment: this.model.modelName, id: JSON.stringify(obj) };

    //console.log('\n', '\n', key.id.toString());

    // set cache options
    opt = { options: options, key: key, ttl: ttl, cached: cached };

    // setting cache instance
    this._cache = Cache(key.id, opt);

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
    if (cache.ttl() !== ttl) {
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

    var cache = this._cache;

    if (!arguments.length) {
      cached = true;
    } else {

      if ('number' === typeof cached) {
        ttl = cached;
        cached = true;
      }

      if ('number' === typeof ttl) {
        this.ttl(ttl);
      }
    }

    cache.cached(cached);

    return this;
  };

  /**
   * Execute find.
   *
   * @api private
   */

  Query.prototype.execFind = function (fn) {

    var query = this
      , cache = this._cache
      , key = cache.key();

    if (!cache.cached()) return execFind.call(query, fn);

    // drop cache and start over when old TTL
    // is different than thew new TTL
    if (!this._recache) {

      // get docs from cache
      getCache(query, fn);

    } else {

      this._recache = false;
      // drop the existing cached query
      cache.drop(function (err) {
        if (err) return console.error(err);
        setCache(query, fn);

        debug('query key is: %j', key);
      });

    }

    return this;

  };

  /**
   * Execute query.
   *
   * @api private
   */

  Query.prototype.exec = function (op, fn) {

    var cache = this._cache;

    if (!cache.cached()) return exec.call(this, op, fn);

    if ('function' === typeof op) {
      fn = op;
      op = null;
    }

    function cb (err, res) {
      if ('objec' === typeof res && 'item' in res && 'stored' in res && 'ttl' in res) {
        res.item.stored = res.stored;
        res.item.ttl = res.ttl;
        return fn(null, res.item);
      }
      fn(err, res);
    }

    exec.call(this, op, fn ? cb : null);

    return this;
  };

  /**
   * Get cached query.
   *
   * @param {Object} query 
   * @param {String} key
   * @param {Function} fn
   * @api private
   */

  function getCache(query, fn) {

    var cache = query._cache
      , key = cache.key();

    // get docs from cache
    cache.get(function get(err, res) {

      // handle error
      if (err) return fn(err);

      // if no results then we call original 
      // function and then we cache the result
      if (!res) return setCache(query, fn);

      debug('getting cached results %j', res);

      // we did found docs so we are in good shape
      // lets return the callback with cached results
      fn(null, res);
    });
  }

  /**
   * Cache query.
   *
   * @param {Object} query 
   * @param {String} key
   * @param {Function} fn
   * @api private
   */

  function setCache(query, fn) {

    var cache = query._cache
      , key = cache.key();

    return execFind.call(query, function find(err, docs) {

      // handle error
      if (err) return fn(err);

      debug('caching query %j', docs);

      // save docs to cache
      cache.set(docs, function set(err) {
        debug('cached query %j', key);
        if (err) console.warn('Cache Error:', err);
      });

      // return the callback with results
      fn(null, docs);
    });
  }

  return mongoose;

};