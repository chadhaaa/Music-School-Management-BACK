const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connted to MongoDB Successfully!");
  } catch (err) {
    console.error(err?.message);
    process.exit(1);
  }
};

module.exports = connectDB;
