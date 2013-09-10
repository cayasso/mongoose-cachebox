/**
 * Module dependencies.
 */

var catbox = require('catbox');

/**
 * Expose module.
 */

module.exports = function mongooseCacheBox(mongoose, options, cb) {

  // make sure options is declared
  options = options || {};

  // cached flag
  var cached = false;

  // get our adapter `memory` is assumed by default
  options.engine = options.engine || 'memory';

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

  /**
   * Cache this query.
   *
   * @param {Number} expires time to live
   * @api public
   */

  Query.prototype.cache = function (expires) {
    TTL = expires;
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
    client.drop(___cacheKey, fn);
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

    if ('expires' in options) {
      TTL = options.expires;
    }

    if (!cached) {
      console.log('NOT CACHED ===============');
      return execFind.call(query, fn);
    }

    // lets get the key for use when caching
    var key = this.___cacheKey = {
      segment: query.model.modelName,
      id: getKey(query)
    };

    // get docs from cache
    client.get(key, function getValue(err, res) {

      // handle error
      if (err) return fn(err);

      // if no results then we call original 
      // function and then we cache the result
      if (!res || TTL != oldTTL) {
        return execFind.call(query, function find(err, docs) {

          // handle error
          if (err) return fn(err);

          //console.log('caching for ttl ', ttl);
          console.log(TTL);

          // save docs to cache
          client.set(key, docs, TTL, function setValue(err) {
            //console.log('Caching .............................................', key);
            if (err) console.warn('Cache Error:', err);
          });

          oldTTL = TTL;

          // return the callback with results
          fn(null, docs);
        });
      }

      // we did found docs so we are in good shape
      // lets return the callback with cached results
      fn(null, res);
    });

    return this;

  };

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