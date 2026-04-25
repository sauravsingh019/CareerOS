const bcrypt = require("bcryptjs");
const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");
const generateToken = require("../utils/generateToken");

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    const error = new Error("User already exists with this email");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email,
    password: hashedPassword
  });

  res.status(201).json({
    success: true,
    message: "Registration successful",
    data: {
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        skills: user.skills,
        education: user.education,
        experience: user.experience
      }
    }
  });
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        skills: user.skills,
        education: user.education,
        experience: user.experience
      }
    }
  });
});

module.exports = {
  registerUser,
  loginUser
};
