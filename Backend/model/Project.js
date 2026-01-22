import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true
    },
    startDate: { type: Date, required: true },
    deliveryDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["In-Progress", "Delivered", "On-Hold"],
      default: "In-Progress"
    },
    assignedEmployees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee"
      }
    ],
    description: { type: String, trim: true }
  },
  { timestamps: true }
);

export default mongoose.model("Project", projectSchema);
