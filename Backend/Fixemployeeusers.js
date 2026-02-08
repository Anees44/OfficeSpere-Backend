// Backend/fixEmployeeUsers.js
// ⚠️ RUN THIS ONCE to fix all employees without valid userId references

const mongoose = require('mongoose');
const Employee = require('./models/Employee');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function fixEmployeeUsers() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('====================================');
    console.log('🔧 FIXING EMPLOYEE USER REFERENCES');
    console.log('====================================');

    const employees = await Employee.find();
    console.log(`\n📊 Total employees in database: ${employees.length}\n`);

    let fixed = 0;
    let alreadyValid = 0;
    let failed = 0;

    for (const employee of employees) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`📋 Checking: ${employee.name} (${employee.email})`);
      console.log(`   Employee _id: ${employee._id}`);
      console.log(`   Employee ID: ${employee.employeeId}`);
      console.log(`   Current userId: ${employee.userId || 'NULL/MISSING'}`);

      // Check if userId exists in User collection
      let user = null;
      if (employee.userId) {
        try {
          user = await User.findById(employee.userId);
        } catch (err) {
          console.log(`   ⚠️  Invalid userId format: ${employee.userId}`);
        }
      }

      if (!user) {
        console.log(`   ❌ No valid User found with userId: ${employee.userId}`);
        
        // Check if a User already exists with this email
        const existingUser = await User.findOne({ email: employee.email });
        
        if (existingUser) {
          console.log(`   ✅ Found existing User with email: ${employee.email}`);
          console.log(`   🔄 Updating employee to use existing User ID: ${existingUser._id}`);
          
          employee.userId = existingUser._id;
          await employee.save();
          fixed++;
          
          console.log(`   ✅ FIXED! Employee now references User: ${existingUser._id}`);
        } else {
          console.log(`   🆕 No User exists - Creating new User for employee...`);
          
          try {
            // Hash default password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Employee123!', salt);

            // Create new User
            const newUser = await User.create({
              name: employee.name,
              email: employee.email,
              password: hashedPassword,
              phone: employee.phone || '',
              role: 'employee',
              isActive: employee.isActive !== false
            });

            console.log(`   ✅ Created new User: ${newUser._id}`);

            // Update employee with new userId
            employee.userId = newUser._id;
            await employee.save();
            fixed++;

            console.log(`   ✅ FIXED! Employee updated to reference new User: ${newUser._id}`);
            console.log(`   ⚠️  Default password set: "Employee123!"`);
          } catch (createError) {
            console.log(`   ❌ FAILED to create User: ${createError.message}`);
            if (createError.code === 11000) {
              console.log(`   ❌ Duplicate key error - email might already exist`);
            }
            failed++;
          }
        }
      } else {
        console.log(`   ✅ Employee has VALID userId`);
        console.log(`   ✅ User exists: ${user.name} (${user.email})`);
        alreadyValid++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total employees checked: ${employees.length}`);
    console.log(`Already valid: ${alreadyValid}`);
    console.log(`Fixed: ${fixed}`);
    console.log(`Failed: ${failed}`);
    console.log('='.repeat(50));

    if (fixed > 0) {
      console.log('\n⚠️  IMPORTANT NOTES:');
      console.log('   - Some users were created with password "Employee123!"');
      console.log('   - Employees should change their password on first login');
      console.log('   - All fixed employees can now be selected for meetings');
    }

    console.log('\n✅ Employee fix completed!');
    
    // Verify the fix
    console.log('\n🔍 VERIFICATION:');
    const employeesAfter = await Employee.find();
    const employeesWithUserId = employeesAfter.filter(e => e.userId);
    console.log(`Employees with userId: ${employeesWithUserId.length}/${employeesAfter.length}`);
    
    if (employeesWithUserId.length === employeesAfter.length) {
      console.log('✅ ALL EMPLOYEES NOW HAVE VALID USER IDS!');
    } else {
      console.log(`⚠️  ${employeesAfter.length - employeesWithUserId.length} employees still missing userId`);
    }
    
  } catch (error) {
    console.error('\n❌ ERROR during fix:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

// Run the script
console.log('🚀 Starting Employee User Fix Script...\n');
fixEmployeeUsers();