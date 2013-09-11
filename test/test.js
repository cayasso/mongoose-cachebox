var mongooseCachebox = require('../');
var mongoose = require('mongoose');
var expect = require('expect.js');
var Schema = mongoose.Schema;

var names = ["Jacob", "Sophia", "Mason", "Isabella", "William", "Emma", "Jayden", "Olivia", "Noah", "Ava", "Michael", "Emily", "Ethan", "Abigail", "Alexander", "Madison", "Aiden", "Mia", "Daniel", "Chloe"];

// connecting to mongoose
mongoose.connect('mongodb://localhost/mongoose-cachebox-test-t');

// adding mongoose cachebox
mongooseCachebox(mongoose, {});

var PeopleSchema = new Schema({
  name: String,
  date: {
    type: String,
    "default": Date.now()
  },
  num: Number,
  test: Boolean
});


var People = mongoose.model('People', PeopleSchema);

function generate (amount, fn) {
  var crowd = [];
  var count = 0;
  while (count < amount) {
    crowd.push({
      name: names[Math.floor(Math.random() * names.length)],
      num: Math.random() * 10000
    });
    count++;
  }
  console.log('creating crowd');
  People.create(crowd, fn);
  //fn();
}

//generate(10, function () {});

describe('mongooseCachebox', function () {

  it('should have `cache` method', function () {
    expect(People.find({}).cache).to.be.a('function');
  });

  it('should not cache query if `cache` method is not called', function (done) {
    People.find({}).exec(function (err, docs) {
      if (err) return done(err);
      People.find({}).exec(function (err, docs, stored, ttl) {
        if (err) return done(err);
        if (docs) {
          expect(stored).to.be(undefined);
          expect(ttl).to.be(undefined);
          done();
        }
      });
    });
  });
  
  it('should cache query if the `cache` method is called', function (done) {
    People.find({}).cache().exec(function (err, docs) {
      if (err) return done(err);
      People.find({}).exec(function (err, docs, stored, ttl) {
        if (err) return done(err);
        if (docs) {
          expect(stored).to.be.a('number');
          expect(ttl).to.be.a('number');
          expect(60000).to.be.above(ttl);
          done();
        }
      });
    });
  });

  it('should work with lean enabled', function (done) {
    People.find({}).cache(60).exec(function (err, docs) {
      if (err) return done(err);
      People.find({}).lean().exec(function (err, docs, stored, ttl) {
        if (err) return done(err);
        if (docs) {
          expect(stored).to.be(undefined);
          expect(ttl).to.be(undefined);
          done();
        }
      });
    });
  });

  it('should cache query with specific ttl if passed to `cache` method', function (done) {
    People.find({}).cache(60).exec(function (err, docs) {
      if (err) return done(err);
      People.find({}).exec(function (err, docs, stored, ttl) {
        if (err) return done(err);
        if (docs) {
          expect(stored).to.be.a('number');
          expect(ttl).to.be.a('number');
          expect(60).to.be.above(ttl);
          done();
        }
      });
    });
  });

  it('should invalidate cache at specified ttl', function (done) {
    People.find({}).cache(100).exec(function (err, docs) {
      if (err) return done(err);
      People.find({}).exec(function (err, docs, stored, ttl) {
        if (err) return done(err);
        if (docs) {
          expect(stored).to.be.a('number');
          expect(ttl).to.be.a('number');
        }
        setTimeout(function () {
          People.find({}).exec(function (err, docs, stored, ttl) {
            if (err) return done(err);
            if (docs) {
              expect(stored).to.be(undefined);
              expect(ttl).to.be(undefined);
              done();
            }
          });
        }, 100);
      });
    });
  });

  it('should stop caching', function (done) {
    People.find({}).cache().exec(function (err, docs) {
      if (err) return done(err);
      People.find({}).uncache().exec(function (err, docs, stored, ttl) {
        if (err) return done(err);
        if (docs) {
          expect(stored).to.be(undefined);
          expect(ttl).to.be(undefined);
          done();
        }
      });
    });
  });

  it('should cache all queries by setting cache property to true on the schema', function (done) {
    PeopleSchema.set('cache', true);
    People.find({}).exec(function (err, docs) {
      if (err) return done(err);
      People.find({}).exec(function (err, docs, stored, ttl) {
        if (err) return done(err);
        if (docs) {
          expect(stored).to.be.a('number');
          expect(ttl).to.be.a('number');
          done();
        }
      });
    });
  });

  it('should allow setting ttl from schema', function (done) {
    PeopleSchema.set('cache', true);
    PeopleSchema.set('expires', 1000);
    People.find({}).exec(function (err, docs) {
      if (err) return done(err);
      People.find({}).exec(function (err, docs, stored, ttl) {
        if (err) return done(err);
        if (docs) {
          expect(stored).to.be.a('number');
          expect(ttl).to.be.a('number');
          expect(1000).to.be.above(ttl);
        }
      });
    });
  });

  describe('memory', function () {
    /*it('should allow passing `cache` method', function () {
      expect(People.find({}).cache).to.be.a('function');
    });*/
  });

  describe('redis', function () {

  });

});

