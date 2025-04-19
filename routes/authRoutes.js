import express from "express";
import { register, verifyOtp, login ,sendForgotOtp,verifyForgotOtp,getVerifiedUserCount,getAllUsers} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.post("/send-forgot-otp", sendForgotOtp);
router.post("/verify-forgot-otp", verifyForgotOtp);
router.get("/verified-user-count", getVerifiedUserCount);
router.get("/all-users", getAllUsers);

export default router;
