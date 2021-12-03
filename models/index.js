const mongoose = require('mongoose');

const User = require('./User');
const Coin = require('./Coin');
const Balance = require('./Balance');
const Key = require('./Key');

const mongoURL =
  'mongodb+srv://test0:test0@testmongo.kfy77.mongodb.net/coinServer?retryWrites=true&w=majority';
mongoose.connect(mongoURL);

module.exports = {
  User,
  Coin,
  Balance,
  Key,
};
