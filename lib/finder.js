/**
 * Expose `finder` middleware.
 */

module.exports = function finder(query, execFind) {

  /**
   * Middleware method.
   *
   * @param {String} key
   * @param {Mixed} data
   * @param {Number} ttl
   * @param {Function} next
   * @api public
   */

  return function middleware(key, data, ttl, next) {
    
    // dont do anything if the value is still in cache
    // just call the next handler
    if ('undefined' !== typeof data) {
      return next();
    }

    // here we execute the execFind method with
    // the query context
    execFind.call(query, function finding(err, docs) {

      // we raise an error if any
      if (err) return next(err);

      // if no error we call the next handler
      next(null, docs, ttl);

    });

  };
};