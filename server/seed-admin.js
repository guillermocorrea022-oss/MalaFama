// =========================================
// MALA FAMA BREWING — Seed Admin Script
// =========================================
// Usage: node seed-admin.js <email> <password>
// Example: node seed-admin.js ventas@cervezamalafama.com miPassword123

const bcrypt = require('bcrypt');
const db = require('./db');

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('Uso: node seed-admin.js <email> <password>');
  console.log('Ejemplo: node seed-admin.js ventas@cervezamalafama.com miPassword123');
  process.exit(1);
}

(async () => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const existing = db.findUserByEmail(email);

    if (existing) {
      // Update existing user to admin + reset password
      db.setUserAdmin(existing.id, true);
      db.updateUserPassword(existing.id, passwordHash);
      console.log(`✓ Usuario "${email}" actualizado como ADMIN con nueva contraseña (id: ${existing.id})`);
    } else {
      // Create new admin user
      const user = db.createUser({
        email,
        passwordHash,
        firstName: 'Admin',
        lastName: 'Mala Fama'
      });
      db.setUserAdmin(user.id, true);
      console.log(`✓ Admin creado: "${email}" (id: ${user.id})`);
    }

    console.log('Listo! Podes iniciar sesión en /admin.html');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
