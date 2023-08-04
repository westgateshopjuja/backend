import mongoose from "mongoose";
import timestamps from "mongoose-timestamp";
import mongooseAlgolia from "mongoose-algolia";

const { Schema } = mongoose;

export const TransactionSchema = new Schema(
  {
    code: String,
    timestamp: String,
    amount: Number,
    phoneNumber: String,
  },
  {
    collection: "transactions",
  }
);

TransactionSchema.plugin(timestamps);

TransactionSchema.index({ createdAt: 1, updatedAt: 1 });

TransactionSchema.plugin(mongooseAlgolia, {
  appId: "YTL735AQT8",
  apiKey: "b2ea580efc532f0628015e8b2048d7a2",
  indexName: "transactions", //The name of the index in Algolia, you can also pass in a function
});

export const Transaction = mongoose.model("Transaction", TransactionSchema);

Transaction.SyncToAlgolia(); //Clears the Algolia index for this schema and synchronizes all documents to Algolia (based on the settings defined in your plugin settings)
Transaction.SetAlgoliaSettings({
  searchableAttributes: ["code", "amount", "phoneNumber"], //Sets the settings for this schema, see [Algolia's Index settings parameters](https://www.algolia.com/doc/api-client/javascript/settings#set-settings) for more info.
});
