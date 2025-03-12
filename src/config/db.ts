import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');
    console.log('MongoDB conectado 🚀');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error conectando a MongoDB:', error.message);
    } else {
      console.error('Error desconocido conectando a MongoDB:', error);
    }
    process.exit(1);
  }
};

export default connectDB;
