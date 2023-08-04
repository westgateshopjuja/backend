import mongoose from "mongoose";
import timestamps from "mongoose-timestamp";

const { Schema } = mongoose;

export const UserSchema = new Schema(
  {
    name: String,
    email: String,
    image: String,
    phoneNumber: String,
    cart: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product" },
        quantity: Number,
        variant: String,
      },
    ],
    saved: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    addresses: [
      {
        label: String,
        lat: Number,
        lng: Number,
        default: Boolean,
      },
    ],
  },
  {
    collection: "users",
  }
);

UserSchema.plugin(timestamps);

UserSchema.index({ createdAt: 1, updatedAt: 1 });

export const User = mongoose.model("User", UserSchema);
