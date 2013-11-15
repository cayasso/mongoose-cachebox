# mongoose cachebox

[![Build Status](https://travis-ci.org/cayasso/mongoose-cachebox.png?branch=master)](https://travis-ci.org/cayasso/mongoose-cachebox)
[![NPM version](https://badge.fury.io/js/mongoose-cachebox.png)](http://badge.fury.io/js/mongoose-cachebox)

Caching [mongoose](http://http://mongoosejs.com/) queries easier with [cacheman](https://github.com/cayasso/cacheman) that supports in-memory, and Redis engines.

## Instalation

``` bash
$ npm install mongoose-cachebox
```

## Usage

``` javascript
var mongoose = require('mongoose');

var options = {
  cache: true, // start caching
  ttl: 30 // 30 seconds
};

// adding mongoose cachebox
mongooseCachebox(mongoose, options);
```

Then later any `find` query will be cached for 60 seconds.

You can also enable caching programatically by using the `cache` method directly from the query instance:

``` javascript
var Person = mongoose.model('Person');

Person.find({ active: true })
.cache('50s') // cache for 50 seconds
.exec(function (err, docs) { /* ... */
  
  if (err) throw error;

  console.log(docs.ttl) // time left for expiration in ms
  console.log(docs.stored); // timestamp this query was cached
  console.log(docs);

});

```

## API

This plugin will add two more methods to a mongoose query instance `cache` and `ttl`.

### query.cache([cached], [ttl])

Both parameters `cache` and `ttl` are optional, the first one is for enable caching the second is for specifying the cache expiration (time to live).

For start caching just call the `cache` method:

``` javascript
Person.find({ active: true })
.cache() // will enable caching with 60 seconds ttl
.exec(function (err, docs) {
  /* .... */
});
```

The above is equivalent to this:

``` javascript
Person.find({ active: true })
.cache(true) // start caching with 60 seconds ttl
.exec(function (err, docs) {
  /* .... */
});
```

You can specify the `ttl` (time to live) value directly:

``` javascript
Person.find({ active: true })
.cache(10) // cache for 10 seconds
.exec(function (err, docs) {
  /* .... */
});
```

The above is equivalent to this:

``` javascript
Person.find({ active: true })
.cache(true, 10) // enable caching with 10 seconds ttl
.exec(function (err, docs) {
  /* .... */
});
```

And to disable caching for specific query just pass `false`:

``` javascript
Person.find({ active: true })
.cache(false) // stop caching this query
.exec(function (err, docs) {
  /* .... */
});
```

### query.ttl(ttl)

By default the ttl value is `60000` (60 seconds) but you can use the `ttl` method to specify a different value:

``` javascript
Person.find({ active: true })
.cache() // cache query
.ttl(10) // caching for 10 seconds
.exec(function (err, docs) {
  /* .... */
});
```

## Redis

By default `mongoose-cachebox` will use the memory engine to cache queries but it can cache queries using `Redis` by specifying redis engine when initializing the plugin:

``` javascript
var mongoose = require('mongoose');

var options = {
  engine: 'redis',
  host: '127.0.0.1',
  port: '6379',
  password: 'secret'
};

// adding mongoose cachebox
mongooseCachebox(mongoose, options);
```

This module use [cacheman](https://github.com/cayasso/cacheman) for the caching magic, so check out the project for more details and options.

## Run tests

``` bash
$ make test
```

## License

(The MIT License)

Copyright (c) 2013 Jonathan Brumley &lt;cayasso@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
