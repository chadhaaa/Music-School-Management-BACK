const express = require("express");
const {
  addStudentByAdmin,
  partialRegisterStudent,
  reviewStudent,
  completeRegistration,
  updateStudentStatus,
} = require("../controllers/accountController");
// const { protect, isAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/add", addStudentByAdmin);

router.post("/register", partialRegisterStudent);

router.post("/review", reviewStudent);

router.post("/complete-registration", completeRegistration);

router.post("/update-status", updateStudentStatus);

module.exports = router;
