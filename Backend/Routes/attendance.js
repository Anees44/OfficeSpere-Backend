import express from "express";
import Attendance from "../models/Attendance.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();
router.use(authMiddleware);

// Get all attendance records
router.get("/", async (req, res) => {
  try {
    const attendance = await Attendance.find()
      .populate("employee")
      .sort({ date: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Mark attendance (In)
router.post("/in", async (req, res) => {
  try {
    const { employee, date } = req.body;

    const existing = await Attendance.findOne({ employee, date });
    if (existing) {
      return res.status(400).json({ message: "Attendance already marked" });
    }

    const attendance = new Attendance({
      employee,
      date,
      inTime: new Date()
    });

    await attendance.save();
    await attendance.populate("employee");

    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Mark attendance (Out)
router.post("/out/:id", async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    attendance.outTime = new Date();
    await attendance.save();

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
