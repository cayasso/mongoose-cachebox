var mongoose = require('mongoose');
var mongooseCachebox = require('../../');
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
  /*var crowd = [];
  var count = 0;
  while (count < amount) {
    crowd.push({
      name: names[Math.floor(Math.random() * names.length)],
      num: Math.random() * 10000
    });
    count++;
  }
  console.log('creating crowd');
  People.create(crowd, fn);*/
  fn();
}

generate(3, function (err) {
  if (err) throw error;
  //console.log(arguments.length);


  setTimeout(function () {
    People
    .find({})
    .cache(6000)
    .exec(function (err, docs) {
      console.log('We found these documents ===============>', typeof docs);
    });
  }, 5);


  setInterval(function () {
    People
    .find({})
    .cache(1)
    .exec(function (err, docs) {
      console.log('We found these documents ===============>', typeof docs);
    });
  }, 200);
  
});
