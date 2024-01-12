const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  location: { type: String, required: true },
  weatherData: [{
    date: Date,
    weather: mongoose.Schema.Types.Mixed, 
  }],
});

const User = mongoose.model('User', userSchema);

module.exports = { User };
