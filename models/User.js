// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    trim: true,
  },
  // Users get exactly one username change; set when they use it.
  usernameChanged: {
    type: Boolean,
    default: false,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  contact: {
    type: String,
    default: "",
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  profession: {
    type: String,
    default: "",
  },
  credit: {
    type: Number,
    default: 5,
  },
  ppt_History: {
    type: [mongoose.Schema.Types.ObjectId],
    default: [],
    ref: "Ppts",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent model overwrite on hot-reload
export default mongoose.models.User || mongoose.model("User", userSchema);
