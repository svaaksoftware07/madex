import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";

const app = express();

// Use morgan middleware with the "dev" format
app.use(morgan('dev'));

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

//routes imports
import user_route from './routes/user.routes.js';
import video_route from "./routes/videos.routes.js";
import category_route from "./routes/categories.routes.js";
import channel_route from "./routes/channel.route.js";
import report_route from "./routes/report.route.js";
import videoReport_route from "./routes/videoReport.route.js";

//routes declaration
app.use("/api/v1/users", user_route);
app.use("/api/v1/videos", video_route);
app.use("/api/v1/category", category_route);
app.use("/api/v1/channel", channel_route);
app.use("/api/v1/report", report_route);
app.use("/api/v1/video-report", videoReport_route);

//http://localhost:8000/api/v1/users/register

export { app };
