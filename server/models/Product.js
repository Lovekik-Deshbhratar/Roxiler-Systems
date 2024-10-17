import mongoose, { Schema } from "mongoose";

const productSchema = new Schema({
  title: { type: String },
  price: { type: Number },
  description: { type: String },
  category: { type: String },
  image: { type: String },
  sold: { type: Boolean },
  dateOfSale: { type: Date },
});

const ProductModel = mongoose.model("Product", productSchema);
export default ProductModel;
