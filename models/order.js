import mongoose from "mongoose";
import timestamps from "mongoose-timestamp";

const { Schema } = mongoose;

export const OrderSchema = new Schema(
  {
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product" },
        salePrice: Number,
        quantity: Number,
        variant: String,
      },
    ],
    customer: { type: Schema.Types.ObjectId, ref: "User" },
    deliveryLocation: {
      lat: Number,
      lng: Number,
    },
    payment: { type: Schema.Types.ObjectId, ref: "Transaction" },
    deliveryTimestamp: String,
    dispatchTimestamp: String,
    pickUpTimestamp: String,
  },
  {
    collection: "orders",
  }
);

OrderSchema.plugin(timestamps);

OrderSchema.index({ createdAt: 1, updatedAt: 1 });

export const Order = mongoose.model("Order", OrderSchema);
