import express from "express";
import Meeting from "../models/Meeting.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();
router.use(authMiddleware);

// Get all meetings
router.get("/", async (req, res) => {
  try {
    const meetings = await Meeting.find()
      .populate("client")
      .populate("attendees")
      .sort({ date: 1 });

    res.json(meetings);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Create meeting
router.post("/", async (req, res) => {
  try {
    const meeting = new Meeting(req.body);
    await meeting.save();
    await meeting.populate("client");
    await meeting.populate("attendees");

    res.status(201).json(meeting);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update meeting
router.put("/:id", async (req, res) => {
  try {
    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
      .populate("client")
      .populate("attendees");

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    res.json(meeting);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete meeting
router.delete("/:id", async (req, res) => {
  try {
    const meeting = await Meeting.findByIdAndDelete(req.params.id);

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    res.json({ message: "Meeting deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
