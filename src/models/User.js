const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const accountSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: {
      type: String,
      required: function () {
        return this.role !== "student" || this.isRegistrationComplete;
      },
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected"],
      default: "pending",
    },
    role: {
      type: String,
      enum: ["admin", "student", "instructor"],
      default: "student",
    },
    isRegistrationComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

accountSchema.pre("save", async function (next) {
  if (!this.password || !this.isModified("password")) {
    return next();
  }

  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Account", accountSchema);
