import { create } from "domain";
import mongoose from "mongoose";

const PptsSchema = new mongoose.Schema({
  userid: {
    type: String,
    required: true,
    unique: true,
  },
  titles:{
    type: Array,
    default: [],
  }
  , 
  ppt_History: {
    type: Array,
    default: [],
  }, 
  createdAt: {
    type: Date,
    default: Date.now
  }
});


export default mongoose.models.Ppts || mongoose.model("Ppts", PptsSchema);
