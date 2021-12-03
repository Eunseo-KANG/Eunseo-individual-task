const mongoose = require('mongoose');
const { Schema } = mongoose;

const balanceSchema = new Schema({
  name: String,
  balance: Number,
  user: { type: Schema.Types.ObjectId, ref: 'User' },
});

balanceSchema.index({ name: 1, user: 1 }, { unique: true });
const Balance = mongoose.model('Balance', balanceSchema);

module.exports = Balance;
