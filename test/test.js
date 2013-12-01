var mongooseCachebox = require('../')
  , mongoose = require('mongoose')
  , expect = require('expect.js')
  , Schema = mongoose.Schema
  , PeopleSchema
  , People
  , db
  , names = ["Jacob", "Sophia", "Mason", "Isabella", "William", "Emma", "Jayden", "Olivia", "Noah", "Ava", "Michael", "Emily", "Ethan", "Abigail", "Alexander", "Madison", "Aiden", "Mia", "Daniel", "Chloe"];

describe('mongoose-cachebox', function () {

  before(function (done) {
    // connecting to mongoose
    mongoose.connect('mongodb://127.0.0.1/mongoose-cachebox-testing');

    db = mongoose.connection;

    db.on('error', function (err) {
      done(err);
    });

    db.once('open', done);

    // adding mongoose cachebox
    mongooseCachebox(mongoose, { engine: 'memory' });

    PeopleSchema = new Schema({
      name: String,
      date: {
        type: String,
        "default": Date.now()
      },
      num: Number,
      test: Boolean
    });

    People = mongoose.model('People', PeopleSchema);
  });

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
    People.create(crowd, fn);
  }

  beforeEach(function(done){
    generate(10, done);
  });

  afterEach(function(done){
    People.remove(done);
  });

  it('should have `cache` method', function () {
    expect(People.find({}).cache).to.be.a('function');
  });

  it('should not cache query if `cache` method is not called', function (done) {
    var query = People.find({});
    query.exec(function (err, docs) {
      if (err) return done(err);
      People.find({}).exec(function (err, docs) {
        if (err) return done(err);
        if (docs) {
          expect(query.isFromCache).to.be(false);
          done();
        }
      });
    });
  });

  it('should cache query if the `cache` method is called', function (done) {
    this.timeout(0);
    var query = People.find({});
    query.cache(1).exec(function (err, docs) {
      if (err) return done(err);
      People.find({}).exec(function (err, docs) {
        if (err) return done(err);
        People.find({}).exec(function (err, docs) {
          if (err) return done(err);
          People.find({}).exec(function (err, docs) {
            if (err) return done(err);
            People.find({}).exec(function (err, docs) {
              if (err) return done(err);
              People.find({}).exec(function (err, docs) {
                if (err) return done(err);
                if (docs) {
                  expect(docs).to.be.ok();
                  expect(query.isFromCache).to.be(true);
                  done();
                }
              });
            });
          });
        });
      });
    });
  });

  it('should work with lean enabled', function (done) {
    var query = People.find({});
    query.lean().cache().exec(function (err, docs) {
      if (err) return done(err);
      People.find({}).exec(function (err, docs) {
        if (err) return done(err);
        if (docs) {
           expect(query.isFromCache).to.be(true);
          done();
        }
      });
    });
  });
  
  it('should cache query with specific ttl if passed to `cache` method', function (done) {
    var query = People.find({});
    query.cache(30).exec(function (err, docs) {
      if (err) return done(err);
      People.find({}).exec(function (err, docs) {
        if (err) return done(err);
        if (docs) {
           expect(query.isFromCache).to.be(true);
          done();
        }
      });
    });
  });

  it('should cache query with specific ttl is passed to `ttl` method', function (done) {
    var query = People.find({});
    query.cache().ttl(50).exec(function (err, docs) {
      if (err) return done(err);
        People.find({}).exec(function (err, docs) {
          if (err) return done(err);
          if (docs) {
            expect(query.ttl()).to.be(50);
            expect(query.isFromCache).to.be(true);
            done();
          }
        });
    });
  });

  it('should cache query with specific human readable ttl is passed to `ttl` method', function (done) {
    var query = People.find({});
    query.cache().ttl('5s').exec(function (err, docs) {
      if (err) return done(err);
        People.find({}).exec(function (err, docs) {
          if (err) return done(err);
          if (docs) {
            expect(query.ttl()).to.be('5s');
            expect(query.isFromCache).to.be(true);
            done();
          }
        });
    });
  });

  it('should stop caching', function (done) {
    var query = People.find({});
    query.cache().exec(function (err, docs) {
      if (err) return done(err);
      People.find({}).cache(false).exec(function (err, docs) {
        if (err) return done(err);
        if (docs) {
          expect(query.isCacheEnabled).to.be(false);
          done();
        }
      });
    });
  });

  it('should cache all queries by setting cache property to true on the schema', function (done) {
    var ModelSchema = new Schema({ field: String });
    var Model = mongoose.model('A', ModelSchema);
    ModelSchema.set('cache', true);
    Model.create([{ field: 'a' }, { field: 'b' }, { field: 'c' }], function () {
      var query = Model.find({});
      query.exec(function (err, docs) {
        if (err) return done(err);
        Model.find({}).exec(function (err, docs) {
          if (err) return done(err);
          if (docs) {
            expect(query.isFromCache).to.be(true);
            Model.remove();
            done();
          }
        });
      });
    });
  });

  it('should allow setting default ttl from schema', function (done) {
    var ModelSchema = new Schema({ a: String, b: Number });
    var Model = mongoose.model('B', ModelSchema);

    ModelSchema.set('cache', true);
    ModelSchema.set('ttl', 90);

    Model.create([{ a: 'a', b: 1 }, { a: 'b', b: 1 }, { a: 'c', b: 1 }], function () {
      var query = Model.find({ a: 'a'}, function (err, docs) {
        if (err) return done(err);
        Model.find({ a: 'a'}, function (err, docs) {
          if (err) return done(err);
          if (docs) {
            expect(query.ttl()).to.be(90);
            Model.remove();
            done();
          }
        });
      });
    });
  });

  it('should allow passing middleware for overwriting data', function (done) {
    var query = People.find({});
    var overwrite = ['overwrited'];
    query.cache(function (key, data, ttl, next) {
      if (data) return next(null, overwrite, ttl);
      next();
    }).exec(function (err, docs) {
      if (err) return done(err);
      People.find({}).exec(function (err, docs) {
        if (err) return done(err);
        if (docs) {
          expect(docs).to.be(overwrite);
          done();
        }
      });
    });
  });

  after(function(done){
    mongoose.disconnect();
    done();
  });

});

