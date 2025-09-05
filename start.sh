#!/bin/bash

# Zewail Academy HRM System Startup Script
# This script will help you get the system running quickly

echo "🚀 Starting Zewail Academy HRM System..."
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo "❌ MongoDB is not installed. Please install MongoDB 6+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ MongoDB version: $(mongod --version | head -n1)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
echo "Installing root dependencies..."
npm install

echo "Installing client dependencies..."
cd client && npm install && cd ..

echo "Installing server dependencies..."
cd server && npm install && cd ..

# Create necessary directories
echo ""
echo "📁 Creating necessary directories..."
mkdir -p server/uploads
mkdir -p server/uploads/employees
mkdir -p server/uploads/contracts
mkdir -p server/uploads/certificates
mkdir -p server/uploads/reports

# Check if .env files exist
echo ""
echo "🔧 Checking environment configuration..."

if [ ! -f "server/.env" ]; then
    echo "⚠️  server/.env not found. Creating from template..."
    cp server/.env.example server/.env
    echo "📝 Please edit server/.env with your configuration before running the system."
fi

if [ ! -f "client/.env.local" ]; then
    echo "⚠️  client/.env.local not found. Creating from template..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > client/.env.local
fi

# Start MongoDB if not running
echo ""
echo "🗄️  Starting MongoDB..."
if ! pgrep -x "mongod" > /dev/null; then
    echo "Starting MongoDB daemon..."
    mongod --fork --logpath /tmp/mongod.log
    sleep 3
else
    echo "✅ MongoDB is already running"
fi

# Create initial admin user
echo ""
echo "👤 Creating initial admin user..."
cd server
node -e "
const mongoose = require('mongoose');
const User = require('./models/User');

async function createAdmin() {
    try {
        await mongoose.connect('mongodb://localhost:27017/zewail_academy_hrm');
        
        const existingAdmin = await User.findOne({ email: 'admin@zewail.academy' });
        if (!existingAdmin) {
            const admin = new User({
                firstName: 'مدير',
                lastName: 'النظام',
                email: 'admin@zewail.academy',
                password: 'admin123',
                phone: '+201234567890',
                role: 'admin',
                position: 'مدير النظام',
                salary: 0,
                employmentStatus: 'active',
                isActive: true
            });
            
            await admin.save();
            console.log('✅ Admin user created successfully');
            console.log('📧 Email: admin@zewail.academy');
            console.log('🔑 Password: admin123');
        } else {
            console.log('✅ Admin user already exists');
        }
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
    }
}

createAdmin();
"
cd ..

# Start the application
echo ""
echo "🎯 Starting the application..."
echo "Frontend will be available at: http://localhost:3000"
echo "Backend API will be available at: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop the application"
echo ""

# Start both client and server
npm run dev