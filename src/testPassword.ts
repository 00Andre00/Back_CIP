import bcrypt from 'bcrypt';

const runTest = async () => {
  const hashedPassword = '$2b$10$bG0qFDqDt6k0byHCW5pApepszxXD5Ko1c4jS8FPU3C/xDDcH2fuBu';  // Copia el nuevo hash de la base de datos
  const inputPassword = 'admin123';

  const isMatch = await bcrypt.compare(inputPassword, hashedPassword);
  console.log('¿Coinciden las contraseñas?', isMatch);
};

runTest();
