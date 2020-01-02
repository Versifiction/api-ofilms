/* eslint-disable no-undef */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  firstname: String,
  lastname: String,
  sexe: String,
  mobilePhone: String,
  departement: Number,
  city: String,
  moviesLiked: Array,
  seriesLiked: Array,
  moviesDisliked: Array,
  seriesDisliked: Array,
  moviesFavorites: Array,
  seriesFavorites: Array,
  lists: Array,
  creationDate: {
    type: Date,
    default: Date.now
  },
  lastConnection: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  isVerified: Boolean,
  isFounder: Boolean,
  isAdmin: Boolean,
  isModerator: Boolean,
  isConnected: Boolean
});

module.exports = User = mongoose.model("users", UserSchema);
