import User from "../models/User.js";
import Otp from "../models/Otp.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// 📌 SMTP Email Configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT), // Convert port to integer
  secure: false, // 465 for true, 587 for false
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// ✅ SMTP Connection Test
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP Connection Error:", error);
  } else {
    console.log("SMTP Server is ready to send emails.");
  }
});

// 📌 Generate 6-Digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 📌 Send OTP Email
const sendOtpEmail = async (email, otp) => {
  try {
    console.log(`Sending OTP to ${email}: ${otp}`); // Debugging
    await transporter.sendMail({
      from: `"Ecommerce" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is: ${otp}\n\nThis OTP is valid for 10 minutes.`,
    });
    console.log("OTP sent successfully!");
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error("Failed to send OTP. Please try again.");
  }
};

// 📌 Register API
// 📌 Register API
export const register = async (req, res) => {
  try {
    const { name, mobile, email, password } = req.body;
    console.log("Register request received for:", email);

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: "Email already registered" });

    const existingMobile = await User.findOne({ mobile });
    if (existingMobile) return res.status(400).json({ message: "Mobile number already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ name, mobile, email, password: hashedPassword, isVerified: false });

    const otp = generateOTP();
    await Otp.create({ email, otp, expiresAt: Date.now() + 10 * 60 * 1000 });
    await sendOtpEmail(email, otp);

    res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
};


// 📌 OTP Verification API
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log("Verifying OTP for:", email);

    const otpRecord = await Otp.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // ✅ Check OTP Expiry
    if (otpRecord.expiresAt < Date.now()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // ✅ Verify User
    const user = await User.findOneAndUpdate({ email }, { isVerified: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Delete OTP from DB (Used)
    await Otp.deleteOne({ email });

    res.status(200).json({ message: "Registration successful. You can now log in." });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ message: "OTP verification failed", error: error.message });
  }
};

// 📌 Login API
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.isVerified) return res.status(400).json({ message: "User not verified" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
}; 


export const getVerifiedUserCount = async (req, res) => {
  try {
    const count = await User.countDocuments({ isVerified: true });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user count", error: error.message });
  }
};





export const sendForgotOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Email not registered" });

    const otp = generateOTP();
    await Otp.create({ email, otp, expiresAt: Date.now() + 10 * 60 * 1000 });
    await sendOtpEmail(email, otp);

    res.status(200).json({ message: "OTP sent to your email" });
  } catch (err) {
    res.status(500).json({ message: "Failed to send OTP", error: err.message });
  }
};

export const verifyForgotOtp = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const otpRecord = await Otp.findOne({ email, otp });
    if (!otpRecord) return res.status(400).json({ message: "Invalid OTP" });

    if (otpRecord.expiresAt < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email }, { password: hashedPassword });

    await Otp.deleteOne({ email });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Password reset failed", error: err.message });
  }
}; 


// 📌 Get All Users API (For Admin)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }); // Exclude password
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
};



