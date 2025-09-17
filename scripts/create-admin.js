#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Generate secure random password
function generatePassword(length = 12) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';

  const allChars = uppercase + lowercase + numbers + symbols;

  let password = '';

  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Generate username from name
function generateUsername(firstName, lastName) {
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');

  return cleanFirst + cleanLast.charAt(0);
}

// Check if username exists and generate unique one
async function getUniqueUsername(firstName, lastName) {
  let baseUsername = generateUsername(firstName, lastName);
  let username = baseUsername;
  let counter = 1;

  while (true) {
    const existingAdmin = await prisma.admin.findUnique({
      where: { username }
    });

    if (!existingAdmin) {
      return username;
    }

    username = baseUsername + counter;
    counter++;
  }
}

// Prompt user for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function createAdmin() {
  try {
    console.log('🔐 UniShopper Admin Creation Tool\n');

    // Get admin details
    const firstName = await prompt('Enter first name: ');
    const lastName = await prompt('Enter last name: ');
    const email = await prompt('Enter email address: ');

    if (!firstName || !lastName || !email) {
      console.error('❌ All fields are required!');
      process.exit(1);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Invalid email format!');
      process.exit(1);
    }

    // Check if email already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingAdmin) {
      console.error('❌ Admin with this email already exists!');
      process.exit(1);
    }

    // Generate username and password
    const username = await getUniqueUsername(firstName, lastName);
    const password = generatePassword(12);
    const hashedPassword = await bcrypt.hash(password, 12);

    console.log('\n📋 Admin Details:');
    console.log(`Name: ${firstName} ${lastName}`);
    console.log(`Email: ${email}`);
    console.log(`Username: ${username}`);
    console.log(`Generated Password: ${password}`);

    const confirm = await prompt('\nCreate this admin? (y/N): ');

    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('❌ Admin creation cancelled.');
      process.exit(0);
    }

    // Create admin in database
    const newAdmin = await prisma.admin.create({
      data: {
        firstName,
        lastName,
        email: email.toLowerCase(),
        email_lower: email.toLowerCase(),
        username,
        password: hashedPassword,
        role: 'ADMIN',
        permissions: ['VIEW_ORDERS', 'EDIT_ORDERS', 'VIEW_CUSTOMERS', 'VIEW_ANALYTICS'],
        isActive: true,
        mustChangePassword: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('\n✅ Admin created successfully!');
    console.log('\n🔑 IMPORTANT - Save these credentials:');
    console.log('==========================================');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log('==========================================');
    console.log('\n⚠️  The admin must change their password on first login.');
    console.log(`📧 Admin ID: ${newAdmin.id}`);
    console.log('🌐 Access admin panel at: http://localhost:3000/admin');

  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Goodbye!');
  await prisma.$disconnect();
  rl.close();
  process.exit(0);
});

// Run the script
createAdmin().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});