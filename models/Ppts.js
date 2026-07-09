import mongoose from "mongoose";

const PptsSchema = new mongoose.Schema({
  // Indexed: both fields are queried on every My Decks load.
  userid: {
    type: String,
    required: true,
    index: true,
  },
  titles:{
    type: String,
    default: "untitled",
  }
  , 
  ppt_History: {
    type: Array,
    default: [],
  },
  // Emails of users this deck is shared with (it shows up in their My Decks).
  sharedWith: {
    type: [String],
    default: [],
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});


export default mongoose.models.Ppts || mongoose.model("Ppts", PptsSchema);
