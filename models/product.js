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
        available: { type: Boolean, default: true },
        sale: {
          startTime: String,
          endTime: String,
          salePrice: Number,
        },
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
    deleted: { type: Boolean, default: false },
  },
  {
    collection: "products",
  }
);

ProductSchema.plugin(timestamps);

ProductSchema.index({ createdAt: 1, updatedAt: 1 });

ProductSchema.plugin(mongooseAlgolia, {
  appId: "E69WTTSMZF",
  apiKey: "26fa38d2eef93164155c64ba76284a3d",
  indexName: "products", //The name of the index in Algolia, you can also pass in a function
  selector:
    "description id sale available category images variants deleted name createdAt additionalInformation",
  filter: (doc) => !doc.deleted,
});

export const Product = mongoose.model("Product", ProductSchema);

Product.SyncToAlgolia(); //Clears the Algolia index for this schema and synchronizes all documents to Algolia (based on the settings defined in your plugin settings)
Product.SetAlgoliaSettings({
  searchableAttributes: ["name", "category"], //Sets the settings for this schema, see [Algolia's Index settings parameters](https://www.algolia.com/doc/api-client/javascript/settings#set-settings) for more info.
  attributesForFaceting: ["category"],
});
