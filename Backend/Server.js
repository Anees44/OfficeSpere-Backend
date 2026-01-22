import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

import authRoutes from "./Routes/auth.js";
import clientRoutes from "./Routes/client.js";
import projectRoutes from "./Routes/project.js";
import employeeRoutes from "./Routes/employee.js";
import taskRoutes from "./Routes/task.js";
import attendanceRoutes from "./Routes/attendance.js";
import meetingRoutes from "./Routes/meeting.js";

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/meetings", meetingRoutes);

app.get("/", (req, res) => {
  res.json({ message: "OfficeSphere API Running Successfully" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
