const Account = require("../models/User");
const generateToken = require("../utils/tokenUtils");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

exports.registerUser = async (req, res, next) => {
  const { firstName, lastName, email, password, role } = req.body;

  try {
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "Missing required fields!" });
    }
    const existingUser = await Account.findOne({ email });

    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const user = await Account.create({
      firstName,
      lastName,
      email,
      password,
      role: role || "student",
    });
    res.status(201).json({ message: "User Registered Successfully!", user });
  } catch (err) {
    console.error("Error registering user: ", err);

    if (err.code === 11000) {
      return res.status(400).json({ message: "Email already in use!" });
    }
    next(err);
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Account.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid Credentials" });

    res.status(200).json({
      _id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      token: generateToken(user.id, user.role),
    });
  } catch (err) {
    console.error("Login error", err);
    res.status(500).json({ message: "Internal Server Error " });
  }
};

exports.addStudentByAdmin = async (req, res) => {
  const { firstName, lastName, email } = req.body;

  try {
    const existingUser = await Account.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists!" });
    }

    const newStudent = await Account.create({
      firstName,
      lastName,
      email,
      role: "student",
      password: null,
    });

    const registrationLink = `${process.env.CLIENT_URL}/complete-registration/${newStudent._id}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to Musically",
      text: `Hi ${firstName},\n\nYou have been added to the platform. Complete your registration here: ${registrationLink}`,
    });
    res.status(201).json({ message: "Student Added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.partialRegisterStudent = async (req, res) => {
  const { firstName, lastName, email } = req.body;

  try {
    const student = await Account.create({
      firstName,
      lastName,
      email,
      role: "student",
      status: "pending",
    });

    const adminEmail = process.env.ADMIN_EMAIL;
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: "New Student Registration Request",
      text: `A new student, ${firstName} ${lastName}, has requested registration. Please review their request in the admin panel.`,
    });

    res
      .status(201)
      .json({ message: "Request Sent. We will contact you shortly" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.reviewStudent = async (req, res) => {
  const { studentId, action } = req.body;

  try {
    const student = await Account.findById(studentId);

    if (!student) {
      return res.status(404).json({ message: "Student Not Found" });
    }

    if (action === "Confirm") {
      student.status = "active";
      await student.save();
      const registrationLink = `${process.env.CLIENT_URL}/complete-registration/${student._id}`;
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: student.email,
        subject: "Registration Approved",
        text: `Hi ${student.firstName},\n\nYour registration request has been approved. Complete your registration here: ${registrationLink}`,
      });

      res.status(200).json({ message: "Student confirmed and email sent." });
    } else if (action === "reject") {
      student.status = "rejected";
      await student.save();

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: student.email,
        subject: "Registration Rejected",
        text: `Hi ${student.firstName},\n\nYour registration request has been declined. Please contact support for further assistance.`,
      });
      res.status(200).json({ message: "Student was rejected!" });
    } else {
      res.status(400).json({ message: "Invalid Action" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.completeRegistration = async (req, res) => {
  const { studentId, password } = req.body;

  try {
    const student = await Account.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (student.isRegistrationComplete) {
      return res
        .status(400)
        .json({ message: "Registration already completed" });
    }

    student.password = password;
    student.isRegistrationComplete = true;

    await student.save();

    res.status(200).json({ message: "Registration completed successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.updateStudentStatus = async (req, res) => {
  const { studentId, status } = req.body;

  try {
    const student = await Account.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const validStatuses = ["pending", "confirmed", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status update" });
    }

    const previousStatus = student.status;

    student.status = status;
    await student.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    let emailSubject = "";
    let emailBody = "";

    if (status === "confirmed" && previousStatus !== "confirmed") {
      emailSubject = "Your Registration is Confirmed";
      emailBody = `Hi ${student.firstName},\n\nYour registration has been confirmed. Welcome to the platform!\n`;
    } else if (status === "rejected" && previousStatus !== "rejected") {
      emailSubject = "Your Registration Request Was Rejected";
      emailBody = `Hi ${student.firstName},\n\nUnfortunately, your registration request was rejected. Please contact support for further information.\n`;
    } else if (status === "pending" && previousStatus !== "pending") {
      emailSubject = "Your Registration Request Is Under Review";
      emailBody = `Hi ${student.firstName},\n\nYour registration request is now under review. Please wait for confirmation from the admin.\n`;
    }

    if (emailSubject && emailBody) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: student.email,
        subject: emailSubject,
        text: emailBody,
      });
    }

    res.status(200).json({ message: `Student status updated to ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
