/**
 * OfficeOS — Master Seed Script
 * ──────────────────────────────
 * Seeds the MongoDB database with realistic dummy data.
 *
 * Usage:
 *   cd backend
 *   node scripts/seed-data.js          # seed (skips if data exists)
 *   node scripts/seed-data.js --force  # drop & re-seed
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// ─── Models ──────────────────────────────────
const User = require('../models/user-model');
const Employer = require('../models/employer-model');
const Team = require('../models/team-model');
const Task = require('../models/task-model');
const Attendance = require('../models/attendance-model');
const Leave = require('../models/leave-model');
const Holiday = require('../models/holiday-model');
const Chat = require('../models/chat-model');
const Notification = require('../models/notification-model');
const Invitation = require('../models/invitation-model');
const Problem = require('../models/problem-model');
const Progress = require('../models/progress-model');
const UserSalary = require('../models/user-salary');

// ─── Config ──────────────────────────────────
const DB_URL = process.env.DB_URL || process.env.MONGODB_URI;
const FORCE = process.argv.includes('--force');
const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'Password@123'; // same for all seeded users

if (!DB_URL) {
  console.error('❌  DB_URL is not set in .env');
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────
const generateEmployeeId = (year = new Date().getFullYear()) => {
  const random = crypto.randomInt(1000, 9999);
  return `EE-${year}-${random}`;
};

const isoDate = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Seed Data ───────────────────────────────
async function seed() {
  console.log('🔌  Connecting to MongoDB …');
  await mongoose.connect(DB_URL, { serverSelectionTimeoutMS: 15000 });
  console.log('✅  Connected to MongoDB');

  // Optionally wipe everything
  if (FORCE) {
    console.log('⚠️   --force flag detected — dropping existing data …');
    const collections = [
      User, Employer, Team, Task, Attendance, Leave,
      Holiday, Chat, Notification, Invitation, Problem,
      Progress, UserSalary,
    ];
    for (const Model of collections) {
      await Model.deleteMany({});
    }
    console.log('🗑️   All collections cleared');
  }

  // ──────────────── 1. Employers ────────────────
  console.log('\n📦  Seeding Employers …');
  const employerDocs = [
    { name: 'Acme Corp', description: 'A leading tech company', status: 'active' },
    { name: 'BrightWave Solutions', description: 'AI & ML consulting firm', status: 'active' },
  ];
  const employers = [];
  for (const doc of employerDocs) {
    let emp = await Employer.findOne({ name: doc.name });
    if (!emp) emp = await Employer.create(doc);
    employers.push(emp);
    console.log(`   ✓ Employer: ${emp.name}`);
  }

  // ──────────────── 2. Users ────────────────────
  console.log('\n👤  Seeding Users …');
  const hashedPw = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  const userDefs = [
    // Super Admin
    {
      name: 'Admin User',
      email: 'admin@officeos.test',
      username: 'superadmin',
      mobile: '01700000001',
      type: 'super_admin',
      status: 'active',
      designation: 'System Administrator',
      position: 'CEO',
      empire: employers[0]._id,
      employeeId: generateEmployeeId(),
      companyName: 'Acme Corp',
    },
    // Sub Admin
    {
      name: 'Sara Ahmed',
      email: 'sara@officeos.test',
      username: 'sara_admin',
      mobile: '01700000002',
      type: 'sub_admin',
      status: 'active',
      designation: 'Operations Manager',
      position: 'COO',
      empire: employers[0]._id,
      employeeId: generateEmployeeId(),
      companyName: 'Acme Corp',
    },
    // Leader 1
    {
      name: 'Kamal Hossain',
      email: 'kamal@officeos.test',
      username: 'kamal_lead',
      mobile: '01700000003',
      type: 'leader',
      status: 'active',
      designation: 'Tech Lead',
      position: 'Full Stack Engineer',
      empire: employers[0]._id,
      employeeId: generateEmployeeId(),
      companyName: 'Acme Corp',
    },
    // Leader 2
    {
      name: 'Ayesha Rahman',
      email: 'ayesha@officeos.test',
      username: 'ayesha_lead',
      mobile: '01700000004',
      type: 'leader',
      status: 'active',
      designation: 'AI Lead',
      position: 'AI Engineer',
      empire: employers[1]._id,
      employeeId: generateEmployeeId(),
      companyName: 'BrightWave Solutions',
    },
    // Employees
    {
      name: 'Rahim Uddin',
      email: 'rahim@officeos.test',
      username: 'rahim_dev',
      mobile: '01700000005',
      type: 'employee',
      status: 'active',
      designation: 'Junior Developer',
      position: 'Full Stack Developer',
      empire: employers[0]._id,
      employeeId: generateEmployeeId(),
      companyName: 'Acme Corp',
    },
    {
      name: 'Fatima Begum',
      email: 'fatima@officeos.test',
      username: 'fatima_dev',
      mobile: '01700000006',
      type: 'employee',
      status: 'active',
      designation: 'AI Developer',
      position: 'AI Developer',
      empire: employers[1]._id,
      employeeId: generateEmployeeId(),
      companyName: 'BrightWave Solutions',
    },
    {
      name: 'Tanvir Islam',
      email: 'tanvir@officeos.test',
      username: 'tanvir_dev',
      mobile: '01700000007',
      type: 'employee',
      status: 'active',
      designation: 'Backend Developer',
      position: 'Full Stack Developer',
      empire: employers[0]._id,
      employeeId: generateEmployeeId(),
      companyName: 'Acme Corp',
    },
    {
      name: 'Nusrat Jahan',
      email: 'nusrat@officeos.test',
      username: 'nusrat_hr',
      mobile: '01700000008',
      type: 'employee',
      status: 'active',
      designation: 'HR Executive',
      position: 'HR',
      empire: employers[0]._id,
      employeeId: generateEmployeeId(),
      companyName: 'Acme Corp',
    },
  ];

  const users = [];
  for (const def of userDefs) {
    let user = await User.findOne({ email: def.email });
    if (!user) {
      // Insert directly with pre-hashed password to avoid double-hash
      user = await User.collection.insertOne({
        ...def,
        password: hashedPw,
        image: 'user.png',
        address: 'Dhaka, Bangladesh',
        progress: 0,
        progressNote: '',
        isOnline: false,
        team: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      user = await User.findOne({ email: def.email });
    }
    users.push(user);
    console.log(`   ✓ User: ${user.name} (${user.type})`);
  }

  const [admin, subAdmin, leader1, leader2, emp1, emp2, emp3, emp4] = users;

  // ──────────────── 3. Teams ────────────────────
  console.log('\n🏢  Seeding Teams …');
  const teamDefs = [
    {
      name: 'Alpha Squad',
      description: 'Core product development team',
      leader: leader1._id,
      empire: employers[0]._id,
      status: 'active',
      progress: 45,
      progressNote: 'Sprint 3 in progress',
    },
    {
      name: 'AI Research',
      description: 'Machine learning and AI projects',
      leader: leader2._id,
      empire: employers[1]._id,
      status: 'active',
      progress: 30,
      progressNote: 'Model training phase',
    },
  ];

  const teams = [];
  for (const def of teamDefs) {
    let team = await Team.findOne({ name: def.name });
    if (!team) team = await Team.create(def);
    teams.push(team);
    console.log(`   ✓ Team: ${team.name}`);
  }

  // Assign users to teams
  await User.updateMany(
    { _id: { $in: [leader1._id, emp1._id, emp3._id, emp4._id] } },
    { $addToSet: { team: teams[0]._id } }
  );
  await User.updateMany(
    { _id: { $in: [leader2._id, emp2._id] } },
    { $addToSet: { team: teams[1]._id } }
  );
  console.log('   ✓ Users assigned to teams');

  // ──────────────── 4. Tasks ────────────────────
  console.log('\n📋  Seeding Tasks …');
  const taskDefs = [
    {
      title: 'Build user dashboard',
      description: 'Create the main dashboard page with attendance charts and task overview',
      assignedTo: emp1._id,
      assignedBy: leader1._id,
      startDate: new Date('2026-02-20'),
      endDate: new Date('2026-03-05'),
      progress: 60,
      progressNote: 'UI done, integrating API',
    },
    {
      title: 'Implement chat feature',
      description: 'Real-time messaging between team members using Socket.IO',
      assignedTo: emp3._id,
      assignedBy: leader1._id,
      startDate: new Date('2026-02-18'),
      endDate: new Date('2026-03-01'),
      progress: 80,
      progressNote: 'Testing edge cases',
    },
    {
      title: 'Train sentiment model',
      description: 'Fine-tune BERT model on customer feedback dataset',
      assignedTo: emp2._id,
      assignedBy: leader2._id,
      startDate: new Date('2026-02-15'),
      endDate: new Date('2026-03-10'),
      progress: 35,
      progressNote: 'Data preprocessing complete',
    },
    {
      title: 'Setup CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing and deployment',
      assignedTo: emp1._id,
      assignedBy: admin._id,
      startDate: new Date('2026-02-22'),
      endDate: new Date('2026-02-28'),
      progress: 20,
      progressNote: 'Researching best practices',
    },
    {
      title: 'HR onboarding flow',
      description: 'Design and implement the employee onboarding wizard',
      assignedTo: emp4._id,
      assignedBy: subAdmin._id,
      startDate: new Date('2026-02-25'),
      endDate: new Date('2026-03-15'),
      progress: 0,
      progressNote: '',
    },
  ];

  for (const def of taskDefs) {
    const exists = await Task.findOne({ title: def.title, assignedTo: def.assignedTo });
    if (!exists) await Task.create(def);
    console.log(`   ✓ Task: ${def.title}`);
  }

  // ──────────────── 5. Attendance (last 7 days) ─
  console.log('\n📅  Seeding Attendance …');
  const employees = [emp1, emp2, emp3, emp4];
  const today = new Date();
  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const date = d.getDate();
    const day = dayNames[d.getDay()];
    const isFriday = d.getDay() === 5;

    for (const employee of employees) {
      const exists = await Attendance.findOne({ employeeID: employee._id, year, month, date });
      if (exists) continue;

      const present = isFriday ? false : Math.random() > 0.15; // 85% attendance on workdays
      await Attendance.create({
        employeeID: employee._id,
        year,
        month,
        date,
        day,
        present,
        status: present ? 'Present' : 'Absent',
        checkInTime: present ? '09:00 AM' : undefined,
        checkOutTime: present ? '06:00 PM' : undefined,
      });
    }
  }
  console.log(`   ✓ Attendance seeded for ${employees.length} employees × 7 days`);

  // ──────────────── 6. Leaves ───────────────────
  console.log('\n🏖️   Seeding Leaves …');
  const leaveDefs = [
    {
      applicantID: emp1._id,
      title: 'Family Emergency',
      type: 'Casual Leave',
      startDate: '2026-03-01',
      endDate: '2026-03-02',
      appliedDate: '2026-02-24',
      period: 2,
      reason: 'Need to attend a family emergency in Chittagong',
      adminResponse: 'Approved',
    },
    {
      applicantID: emp2._id,
      title: 'Medical Leave',
      type: 'Sick Leave',
      startDate: '2026-02-27',
      endDate: '2026-02-27',
      appliedDate: '2026-02-26',
      period: 1,
      reason: 'Feeling unwell, need rest',
      adminResponse: 'N/A',
    },
  ];

  for (const def of leaveDefs) {
    const exists = await Leave.findOne({ applicantID: def.applicantID, startDate: def.startDate });
    if (!exists) await Leave.create(def);
    console.log(`   ✓ Leave: ${def.title}`);
  }

  // ──────────────── 7. Holidays ─────────────────
  console.log('\n🎉  Seeding Holidays …');
  const holidayDefs = [
    { date: 21, month: 2, year: 2026, name: 'International Mother Language Day', type: 'Government' },
    { date: 17, month: 3, year: 2026, name: "St. Patrick's Day (Office Fun Day)", type: 'Company' },
    { date: 26, month: 3, year: 2026, name: 'Independence Day', type: 'Government' },
    { date: 1, month: 5, year: 2026, name: 'May Day', type: 'Government' },
    { date: 15, month: 8, year: 2026, name: 'National Mourning Day', type: 'Government' },
    { date: 16, month: 12, year: 2026, name: 'Victory Day', type: 'Government' },
  ];

  for (const def of holidayDefs) {
    const exists = await Holiday.findOne({ date: def.date, month: def.month, year: def.year });
    if (!exists) await Holiday.create(def);
    console.log(`   ✓ Holiday: ${def.name}`);
  }

  // ──────────────── 8. Chat Messages ────────────
  console.log('\n💬  Seeding Chat Messages …');
  const chatDefs = [
    { sender: emp1._id, receiver: leader1._id, message: 'Hey, can you review my PR for the dashboard?' },
    { sender: leader1._id, receiver: emp1._id, message: 'Sure, I will check it after lunch.' },
    { sender: emp2._id, receiver: leader2._id, message: 'The model accuracy reached 92%!' },
    { sender: leader2._id, receiver: emp2._id, message: 'Great work! Let us set up a demo meeting.' },
    { sender: admin._id, receiver: leader1._id, message: 'Team standup is moved to 11 AM tomorrow.' },
    { sender: emp3._id, receiver: emp1._id, message: 'Can you share the API docs link?' },
  ];

  const existingChats = await Chat.countDocuments();
  if (existingChats === 0) {
    await Chat.insertMany(chatDefs);
    console.log(`   ✓ ${chatDefs.length} chat messages inserted`);
  } else {
    console.log(`   ⏭️  Chat messages already exist (${existingChats}), skipping`);
  }

  // ──────────────── 9. Notifications ────────────
  console.log('\n🔔  Seeding Notifications …');
  const notifDefs = [
    {
      title: 'New Task Assigned',
      message: 'You have been assigned "Build user dashboard"',
      type: 'problem',
      link: '/tasks',
      user: emp1._id,
    },
    {
      title: 'New Message',
      message: 'Kamal Hossain sent you a message',
      type: 'chat',
      link: '/chat',
      user: emp1._id,
    },
    {
      title: 'Salary Credited',
      message: 'Your salary for February 2026 has been processed',
      type: 'salary',
      link: '/salary',
      user: emp3._id,
    },
  ];

  const existingNotifs = await Notification.countDocuments();
  if (existingNotifs === 0) {
    await Notification.insertMany(notifDefs);
    console.log(`   ✓ ${notifDefs.length} notifications inserted`);
  } else {
    console.log(`   ⏭️  Notifications already exist (${existingNotifs}), skipping`);
  }

  // ──────────────── 10. Invitations ─────────────
  console.log('\n✉️   Seeding Invitations …');
  const inviteDefs = [
    {
      email: 'newhire1@officeos.test',
      type: 'employee',
      position: 'Full Stack Developer',
      token: crypto.randomBytes(32).toString('hex'),
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      empire: employers[0]._id,
    },
    {
      email: 'newhire2@officeos.test',
      type: 'leader',
      position: 'AI Engineer',
      token: crypto.randomBytes(32).toString('hex'),
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      empire: employers[1]._id,
    },
    {
      email: 'completed@officeos.test',
      type: 'employee',
      position: 'HR',
      token: crypto.randomBytes(32).toString('hex'),
      status: 'completed',
      expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // expired
      empire: employers[0]._id,
    },
  ];

  for (const def of inviteDefs) {
    const exists = await Invitation.findOne({ email: def.email });
    if (!exists) await Invitation.create(def);
    console.log(`   ✓ Invitation: ${def.email} (${def.status})`);
  }

  // ──────────────── 11. Problems ────────────────
  console.log('\n🐛  Seeding Problems …');
  const problemDefs = [
    {
      user: emp1._id,
      project: 'User Dashboard',
      problemLocation: 'frontend/src/pages/Dashboard.jsx',
      description: 'Chart component crashes when no attendance data is available for the month',
      priority: 'High',
      empire: employers[0]._id,
      status: 'Checked',
      adminSolution: 'Added null check and empty state component',
      solutionDate: new Date('2026-02-24'),
      solutionBy: 'Admin',
    },
    {
      user: emp2._id,
      project: 'AI Sentiment Model',
      problemLocation: 'ml-pipeline/train.py',
      description: 'Training hangs at epoch 15 due to memory leak in data loader',
      priority: 'Medium',
      empire: employers[1]._id,
      status: 'Un Checked',
    },
    {
      user: emp3._id,
      project: 'Chat Feature',
      problemLocation: 'backend/services/socket-service.js',
      description: 'Socket disconnection not handled properly, causes ghost users in online list',
      priority: 'High',
      empire: employers[0]._id,
      status: 'Un Checked',
    },
  ];

  for (const def of problemDefs) {
    const exists = await Problem.findOne({ user: def.user, project: def.project });
    if (!exists) await Problem.create(def);
    console.log(`   ✓ Problem: ${def.description.substring(0, 50)}…`);
  }

  // ──────────────── 12. Progress ────────────────
  console.log('\n📊  Seeding Progress …');
  for (let daysAgo = 4; daysAgo >= 0; daysAgo--) {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    const dateStr = isoDate(d.getFullYear(), d.getMonth() + 1, d.getDate());

    for (const employee of employees) {
      const exists = await Progress.findOne({ user: employee._id, date: dateStr });
      if (exists) continue;
      await Progress.create({
        user: employee._id,
        progress: Math.floor(Math.random() * 60) + 20, // 20-80%
        progressNote: ['Worked on assigned tasks', 'Code review and fixes', 'Testing and debugging', 'Feature implementation', 'Documentation'][daysAgo],
        date: dateStr,
      });
    }
  }
  console.log(`   ✓ Progress seeded for ${employees.length} employees × 5 days`);

  // ──────────────── 13. Salaries ────────────────
  console.log('\n💰  Seeding Salaries …');
  const salaryDefs = [
    { employeeID: emp1._id, salary: 45000, bonus: 5000, reasonForBonus: 'Excellent Q4 performance', month: 1, year: 2026, assignedDate: '2026-01-28' },
    { employeeID: emp2._id, salary: 50000, bonus: 0, reasonForBonus: 'N/A', month: 1, year: 2026, assignedDate: '2026-01-28' },
    { employeeID: emp3._id, salary: 40000, bonus: 3000, reasonForBonus: 'Completed sprint ahead of schedule', month: 1, year: 2026, assignedDate: '2026-01-28' },
    { employeeID: emp4._id, salary: 35000, bonus: 0, reasonForBonus: 'N/A', month: 1, year: 2026, assignedDate: '2026-01-28' },
    { employeeID: emp1._id, salary: 45000, bonus: 0, reasonForBonus: 'N/A', month: 2, year: 2026, assignedDate: '2026-02-25' },
    { employeeID: emp2._id, salary: 50000, bonus: 2000, reasonForBonus: 'Model accuracy milestone', month: 2, year: 2026, assignedDate: '2026-02-25' },
  ];

  for (const def of salaryDefs) {
    const exists = await UserSalary.findOne({ employeeID: def.employeeID, month: def.month, year: def.year });
    if (!exists) await UserSalary.create(def);
    console.log(`   ✓ Salary: Month ${def.month}/${def.year} → ${def.salary} BDT`);
  }

  // ──────────────── Summary ─────────────────────
  console.log('\n════════════════════════════════════════');
  console.log('  ✅  SEED COMPLETE — Summary');
  console.log('════════════════════════════════════════');
  console.log(`  Employers     : ${await Employer.countDocuments()}`);
  console.log(`  Users         : ${await User.countDocuments()}`);
  console.log(`  Teams         : ${await Team.countDocuments()}`);
  console.log(`  Tasks         : ${await Task.countDocuments()}`);
  console.log(`  Attendance    : ${await Attendance.countDocuments()}`);
  console.log(`  Leaves        : ${await Leave.countDocuments()}`);
  console.log(`  Holidays      : ${await Holiday.countDocuments()}`);
  console.log(`  Chats         : ${await Chat.countDocuments()}`);
  console.log(`  Notifications : ${await Notification.countDocuments()}`);
  console.log(`  Invitations   : ${await Invitation.countDocuments()}`);
  console.log(`  Problems      : ${await Problem.countDocuments()}`);
  console.log(`  Progress      : ${await Progress.countDocuments()}`);
  console.log(`  Salaries      : ${await UserSalary.countDocuments()}`);
  console.log('════════════════════════════════════════');
  console.log(`\n🔑  Login credentials for ALL seeded users:`);
  console.log(`    Password : ${DEFAULT_PASSWORD}`);
  console.log(`    Emails   : admin@officeos.test, sara@officeos.test,`);
  console.log(`               kamal@officeos.test, ayesha@officeos.test,`);
  console.log(`               rahim@officeos.test, fatima@officeos.test,`);
  console.log(`               tanvir@officeos.test, nusrat@officeos.test`);
  console.log('════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('🔌  Disconnected from MongoDB');
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
