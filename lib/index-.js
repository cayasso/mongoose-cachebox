/**
 * Module dependencies.
 */

var adapters = require('./adapters');

/**
 * Expose module.
 */

module.exports = function mongooseQueryCache(mongoose, options) {

  // make sure options is declared
  options = options || {};

  // get our adapter `memory` is by default

  var adapter = options.adapter;

  if ('string' === typeof adapter) {
    adapter = adapter.toLowerCase();
  } else {
    return console.error('Invalid adapter provided');
  }

  // load adapter
  var Adapter = (adapter in adapters) ? adapters[adapter] : 'memory';

  // get mongoose `Query` object
  var Query = mongoose.Query;

  // here we cache our original execFind method
  var execFind = Query.prototype.execFind;

  // options is mainly for the adapter
  var cache = new Adapter(options);

  /**
   * Cache this query.
   *
   * @api private
   */

  Query.prototype.cache = function () {
    this.__cached = true;
    return this;
  };

  /**
   * Execute find.
   *
   * @api private
   */

  Query.prototype.execFind = function exec(fn) {
    var query = this;

    if (!this.__cached) {
      return execFind.call(query, fn);
    }

    // lets get the key for use when caching
    var key = getKey(this);

    // get docs from cache
    cache.get(key, function getCached(err, docs) {

      // handle error
      if (err) {
        return console.error(err);
      }

      // if no results then we call original 
      // function and then we cache the result
      if (!result) {
        return execFind.call(query, function find(err, docs) {

          // handle error
          if (err) {
            return fn(err);
          }

          // save docs to cache
          cache.set(key, docs);

          // return the callback with results
          fn(null, docs);
        });
      }

      // we did found docs so we are in good shape
      // lets return the callback with cached results
      fn(null, docs);
    });

    return this;

  };

  /**
   * Generate key for storing our cache under.
   *
   * @api private
   */

  function getKey(query) {
    var out = {};
    for (var key in query) {
      out[key] = query[key];
    }
    out.model = out.model.modelName;
    return JSON.stringify(out);
  }

}