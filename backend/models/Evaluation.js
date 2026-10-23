const mongoose = require("mongoose");

const evaluationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  bodyImage: {
    type: String
  },
  result: {
    species: {
      type: String
    },
    confidence: {
      type: Number
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Evaluation", evaluationSchema);
