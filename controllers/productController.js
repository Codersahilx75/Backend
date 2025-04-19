import Product from "../models/Product.js";
import { v4 as uuidv4 } from "uuid";

// Add Product
export const addProduct = async (req, res) => {
 
  try {
    // Validate required fields
    const { name, price,category } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Name are required." });
    }

    if (!price) {
      return res.status(400).json({ message: "Price are required." });
    }

    // Ensure the image is uploaded
    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: "Product image is required." });
    }

    const img = req.file.path; // Get the uploaded image path

    // Create new product instance
    const newProduct = new Product({
      productId: uuidv4(),
      name,
      price,
      img,
      category,
    });

    // Save product to database
    await newProduct.save();

    return res.status(201).json({
      success: true,
      message: "Product added successfully",
      product: newProduct,
    });
  } catch (error) {
    console.error("Error adding product:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// Get All Products
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find();

    if (!products.length) {
      return res.status(404).json({ success: false, message: "No products found." });
    }

    return res.status(200).json({ success: true, products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

// ✅ Update Product
export const updateProduct = async (req, res) => {
  try {
    const { name, price,category } = req.body;
    const img = req.file?.path; // Optional image update

    if (!name && !price && !img) {
      return res.status(400).json({ success: false, message: "At least one field (name, price, or image) is required for update." });
    }

    const updatedProduct = await Product.findOneAndUpdate(
      { productId: req.params.id },
      { name, price, img,category },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    return res.status(200).json({ success: true, message: "Product updated successfully", product: updatedProduct });
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

// ✅ Delete Product
export const deleteProduct = async (req, res) => {
  try {
    const deletedProduct = await Product.findOneAndDelete({ productId: req.params.id });

    if (!deletedProduct) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    return res.status(200).json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};



// ✅ Get Single Product by ID
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({ productId: req.params.id });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    return res.status(200).json({ success: true, product });
  } catch (error) {
    console.error("Error fetching product:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};



