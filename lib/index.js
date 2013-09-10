/**
 * Module dependencies.
 */

var catbox = require('catbox');
var debug = require('debug')('mongoose-cachebox');

/**
 * Expose module.
 */

module.exports = function mongooseCacheBox(mongoose, options, cb) {

  // make sure options is declared
  options = options || {};

  // get our adapter `memory` is assumed by default
  options.engine = options.engine || 'memory';

  // cached flag
  var cached = false;

  // default time to live
  var TTL = options.expires || (1000 * 60); // 60 seconds

  // default time to live
  var oldTTL = null;

  // get mongoose `Query` object
  var Query = mongoose.Query;

  // here we cache our original execFind method
  var execFind = Query.prototype.execFind;

  // options is mainly for the adapter
  var client = new catbox.Client(options);

  // start connection
  client.start(cb || function () {});
  debug('starting cachebox');

  /**
   * Cache this query.
   *
   * @param {Number} expires time to live
   * @api public
   */

  Query.prototype.cache = function (expires) {
    if ('number' === typeof expires) {
      TTL = expires;
      debug('caching query with %d expiration', expires);
    }
    cached = true;
    return this;
  };

  /**
   * Uncache this query.
   *
   * @api public
   */

  Query.prototype.uncache = function (fn) {
    cached = false;
    client.drop(this.___cacheKey, fn);
    debug('uncaching query %j', this.___cacheKey);
    return this;
  };

  /**
   * Execute find.
   *
   * @api private
   */

  Query.prototype.execFind = function exec(fn) {
    var query = this;
    var model = this.model;
    var options = model.schema.options;

    if ('cache' in options) {
      cached = !!options.cache;
    }

    if ('expires' in options && 'number' === typeof options.expires) {
      TTL = options.expires;
    }

    if (!cached) return execFind.call(query, fn);

    // lets get the key for use when caching
    var key = this.___cacheKey = {
      segment: query.model.modelName,
      id: getKey(query)
    };

    // drop cache and start over when old TTL
    // is different than thew new TTL
    if (oldTTL === TTL) {

      debug('query key is: %j', key);

      // get docs from cache
      getCache(query, key, fn);

    } else {

      // drop the existing cached query
      client.drop(key, function (err) {
        if (err) return console.error(err);
        setCache(query, key, fn);
        oldTTL = TTL;
        debug('query key is: %j', key);
      });

    }

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

  function getCache(query, key, fn) {

    // get docs from cache
    client.get(key, function get(err, res) {

      // handle error
      if (err) return fn(err);

      // if no results then we call original 
      // function and then we cache the result
      if (!res) return setCache(query, key, fn);

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

  function setCache(query, key, fn) {

    return execFind.call(query, function find(err, docs) {

      // handle error
      if (err) return fn(err);

      debug('caching query %j', docs);

      // save docs to cache
      client.set(key, docs, TTL, function set(err) {
        debug('cached query %j', key);
        if (err) console.warn('Cache Error:', err);
      });

      // return the callback with results
      fn(null, docs);
    });
  }

  /**
   * Generate key for storing our cache under.
   *
   * @param {Object} q the query instance
   * @api private
   */

  function getKey(q) {
    var o = {};
    for (var k in q) o[k] = q[k];
    return JSON.stringify(o);
  }

  return mongoose;

};