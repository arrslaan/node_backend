import mongoose from "mongoose";


const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI  is not defined");
        }
        
        const connectInstance = await mongoose.connect(`${process.env.MONGODB_URI}`);
        
        console.log(`MongoDB Connected: ${connectInstance.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
