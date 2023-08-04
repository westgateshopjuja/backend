import mongoose from "mongoose";
import timestamps from "mongoose-timestamp";

const { Schema } = mongoose;

export const AdminSchema = new Schema(
  {
    email: String,
    password: String,
    name: String,
    phoneNumber: String,
    levelClearance: String,
    removed: { type: Boolean, default: false },
  },
  {
    collection: "admins",
  }
);

AdminSchema.plugin(timestamps);

AdminSchema.index({ createdAt: 1, updatedAt: 1 });

export const Admin = mongoose.model("Admin", AdminSchema);
