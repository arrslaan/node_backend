import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();

app.use(cookieParser());
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.urlencoded({extended:true,limit:"10kb"}));

app.use(express.static("public"))

app.use(express.json({limit: "10kb"}))
export { app }