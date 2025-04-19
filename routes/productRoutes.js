import express from "express";
import multer from "multer";
import {
  addProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  getProductById,
 
} from "../controllers/productController.js";

const router = express.Router();

// Multer configuration for image upload
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// Routes
router.post("/add", upload.single("img"), addProduct);
router.get("/all", getProducts);
router.put("/update/:id", upload.single("img"), updateProduct);
router.delete("/delete/:id", deleteProduct);
router.get("/:id", getProductById); // ✅ Add this new route




export default router;
