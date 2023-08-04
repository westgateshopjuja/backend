import mongoose from "mongoose";
import timestamps from "mongoose-timestamp";
import mongooseAlgolia from "mongoose-algolia";

const { Schema } = mongoose;

export const ProductSchema = new Schema(
  {
    name: String,
    description: String,
    category: String,
    images: [String],
    variants: [
      {
        price: Number,
        thumbnail: String,
        label: String,
      },
    ],
    additionalInformation: [
      {
        label: String,
        value: String,
      },
    ],
    reviews: [
      {
        name: String,
        rating: Number,
        timestamp: String,
        message: String,
      },
    ],
  },
  {
    collection: "products",
  }
);

ProductSchema.plugin(timestamps);

ProductSchema.index({ createdAt: 1, updatedAt: 1 });

ProductSchema.plugin(mongooseAlgolia, {
  appId: "YTL735AQT8",
  apiKey: "b2ea580efc532f0628015e8b2048d7a2",
  indexName: "thrifthub", //The name of the index in Algolia, you can also pass in a function
});

export const Product = mongoose.model("Product", ProductSchema);

Product.SyncToAlgolia(); //Clears the Algolia index for this schema and synchronizes all documents to Algolia (based on the settings defined in your plugin settings)
Product.SetAlgoliaSettings({
  searchableAttributes: ["name", "category"], //Sets the settings for this schema, see [Algolia's Index settings parameters](https://www.algolia.com/doc/api-client/javascript/settings#set-settings) for more info.
  attributesForFaceting: ["category"],
});
