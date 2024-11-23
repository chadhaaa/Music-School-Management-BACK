const jwt = require("jsonwebtoken");
const Account = require("../models/User");

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await Account.findById(decoded.id).select("-password");
      next();
    } catch (err) {
      res.status(401).json({ message: "Unauthorized, Invalid Token!" });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Unauthorized, Token Not Found!" });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.roles)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};
