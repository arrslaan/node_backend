
import { app } from "./app.js";
import connectDB from "./db/index.js";
import dotenv from "dotenv"
dotenv.config({
    path: "./env"
})


connectDB().then(()=>{
    app.listen(process.env.PORT,()=>{
        console.log(`Server running on port ${process.env.PORT}`)  // replace with your port number
    })
}).catch((error)=>{
    console.log("Error connecting to the database"+error)  // replace with your error handling logic
})



        
        
