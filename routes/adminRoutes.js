import express from "express";
import {
    registerAdmin,
  verifyOTP,
  loginAdmin,
} from "../controllers/adminController.js";

const router = express.Router();

router.post("/register", registerAdmin);
router.post("/verify-otp", verifyOTP);
router.post("/login", loginAdmin);

export default router;
