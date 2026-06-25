import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const uri = 'mongodb://mongodb:27017/myDatabase';

mongoose.connect(uri).then(async () => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);
  
  const db = mongoose.connection.useDb('myDatabase');
  const result = await db.collection('clientauths').updateOne(
    { email: 'thewebwizard12@gmail.com' },
    { $set: { password: hashedPassword } }
  );
  console.log('Update result:', result);
  process.exit(0);
}).catch(console.error);
