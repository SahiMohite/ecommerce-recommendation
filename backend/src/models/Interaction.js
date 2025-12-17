const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  type: {
    type: String,
    enum: ['view', 'cart', 'purchase', 'rating'],
    required: true
  },
  value: {
    type: Number,
    default: 1 // For ratings: 1-5, for others: 1
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

interactionSchema.index({ user: 1, product: 1 });
interactionSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Interaction', interactionSchema);
