const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const config = require("./config.js"); // Correct relative path
const collection = require("./config.js");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const dotenv = require("dotenv");
dotenv.config({});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.get("/forgot-password", (req, res) => {
  res.render("forgot-password");
});

// register api
app.post("/signup", async (req, res) => {
  const data = {
    name: req.body.username,
    email: req.body.mail,
    password: req.body.password,
  };

  const existingUser = await collection.findOne({ name: data.name });
  if (existingUser) {
    res.send("Username already exists. Choose a different username.");
  } else {
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);
    data.password = hashedPassword;

    // Insert data into the database
    const userData = await collection.insertMany(data);
    console.log(userData);
    res.send("Sign-Up successful");
  }
});

app.post("/login", async (req, res) => {
  try {
    const check = await collection.findOne({ name: req.body.username });
    if (!check) {
      res.send("username can't found ");
    }

    //compare hash password from database with plain text
    const isPassWordMatch = await bcrypt.compare(
      req.body.password,
      check.password
    );
    if (isPassWordMatch) {
      res.render("home");
    } else {
      res.send("wrong password");
    }
  } catch {
    res.send("wrong details!! Fill correct details");
  }
});

// Route: Handle Forgot Password Submission
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    // Find the user by email
    const user = await collection.findOne({ email });
    if (!user) {
      return res.status(404).send("No account found with that email.");
    }

    // Generate a reset token and expiry
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // Token valid for 1 hour

    // Save token and expiry in the database
    await collection.updateOne(
      { email },
      { $set: { resetToken, resetTokenExpiry } }
    );

    // Send the reset link via email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MY_GMAIL,
        pass: process.env.MY_KEY,
      },
    });

    const resetLink = `http://localhost:8080/reset-password?token=${resetToken}`;
    const mailOptions = {
      from: `"YourAppName" <${process.env.MY_GMAIL}>`,
      to: email,
      subject: "Password Reset Request",
      html: `
                <p>Hi ${user.name},</p>
                <p>You requested a password reset. Click the link below to reset your password:</p>
                <a href="${resetLink}" target="_blank">${resetLink}</a>
                <p>If you did not request this, please ignore this email.</p>
            `,
    };

    // Send the email
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error sending email:", err);
        return res
          .status(500)
          .send("Error sending email. Please try again later.");
      }
      res.send("Password reset link sent to your email.");
    });
  } catch (error) {
    console.error("Error in forgot-password route:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route: Reset Password Page
app.get("/reset-password", async (req, res) => {
  const { token } = req.query;

  try {
    const user = await collection.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.send("Invalid or expired reset token.");
    }

    res.render("reset-password", { token });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Route: Handle Password Reset Submission
app.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  const user = await collection.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: Date.now() }, // Check token expiry
  });

  if (!user) {
    return res.send("Invalid or expired reset token.");
  }

  // Hash the new password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

  // Update user's password and clear reset token
  await collection.updateOne(
    { email: user.email },
    {
      $set: { password: hashedPassword },
      $unset: { resetToken: "", resetTokenExpiry: "" },
    }
  );

  res.send(
    "Password reset successful. You can now log in with your new password."
  );
});

app.listen(8080, () => {
  console.log(`console running on port ${8080}`);
});
