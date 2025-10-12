const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import models
const User = require('../src/models/User');
const Table = require('../src/models/Table');
const PointTransaction = require('../src/models/PointTransaction');
const config = require('../src/config/config');

// Dati di seed
const seedData = {
  users: [
    {
      username: 'admin',
      email: 'admin@qrtavoli.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'Sistema',
      role: config.USER_ROLES.ADMIN
    },
    {
      username: 'cassiere1',
      email: 'cassiere1@qrtavoli.com',
      password: 'cassiere123',
      firstName: 'Mario',
      lastName: 'Rossi',
      role: config.USER_ROLES.CASHIER
    },
    {
      username: 'cassiere2',
      email: 'cassiere2@qrtavoli.com',
      password: 'cassiere123',
      firstName: 'Giulia',
      lastName: 'Bianchi',
      role: config.USER_ROLES.CASHIER
    },
    {
      username: 'manager',
      email: 'manager@qrtavoli.com',
      password: 'manager123',
      firstName: 'Luca',
      lastName: 'Verdi',
      role: config.USER_ROLES.CASHIER
    }
  ],

  tables: [
    { tableNumber: 1, name: 'Tavolo 1', location: 'Sala principale', capacity: 4, points: 85 },
    { tableNumber: 2, name: 'Tavolo VIP', location: 'Zona riservata', capacity: 6, points: 92 },
    { tableNumber: 3, name: 'Tavolo 3', location: 'Sala principale', capacity: 4, points: 34 },
    { tableNumber: 4, name: 'Tavolo Famiglia', location: 'Zona bambini', capacity: 8, points: 67 },
    { tableNumber: 5, name: 'Tavolo 5', location: 'Sala principale', capacity: 2, points: 23 },
    { tableNumber: 6, name: 'Tavolo Terrazza', location: 'Terrazza esterna', capacity: 4, points: 78 },
    { tableNumber: 7, name: 'Tavolo 7', location: 'Sala principale', capacity: 4, points: 45 },
    { tableNumber: 8, name: 'Tavolo Romantico', location: 'Zona intima', capacity: 2, points: 56 },
    { tableNumber: 9, name: 'Tavolo 9', location: 'Sala principale', capacity: 6, points: 89 },
    { tableNumber: 10, name: 'Tavolo Giardino', location: 'Giardino', capacity: 4, points: 41 }
  ]
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔌 Connected to MongoDB');
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

const clearDatabase = async () => {
  try {
    console.log('🧹 Clearing existing data...');

    await PointTransaction.deleteMany({});
    await Table.deleteMany({});
    await User.deleteMany({});

    console.log('✅ Database cleared');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  }
};

const seedUsers = async () => {
  try {
    console.log('👤 Creating users...');

    const users = [];

    for (const userData of seedData.users) {
      const user = new User(userData);
      await user.save();
      users.push(user);

      console.log(`   ✓ Created user: ${user.username} (${user.role})`);
    }

    console.log(`✅ Created ${users.length} users`);
    return users;
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
};

const seedTables = async (adminUser) => {
  try {
    console.log('🪑 Creating tables...');

    const tables = [];

    for (const tableData of seedData.tables) {
      const table = new Table({
        ...tableData,
        qrCode: `TABLE_${tableData.tableNumber}`,
        createdBy: adminUser._id,
        lastPointsUpdate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random date in last week
      });

      await table.save();
      tables.push(table);

      console.log(`   ✓ Created table: ${table.name} (${table.qrCode}) - ${table.points} points`);
    }

    console.log(`✅ Created ${tables.length} tables`);
    return tables;
  } catch (error) {
    console.error('❌ Error seeding tables:', error);
    throw error;
  }
};

const seedTransactions = async (tables, users) => {
  try {
    console.log('💰 Creating sample point transactions...');

    const transactions = [];
    const transactionTypes = ['EARNED', 'BONUS'];
    const descriptions = [
      'Punti assegnati dal cassiere',
      'Bonus fedeltà',
      'Promozione speciale',
      'Punti extra',
      'Assegnazione manuale'
    ];

    // Genera transazioni casuali per ogni tavolo
    for (const table of tables) {
      const numTransactions = Math.floor(Math.random() * 8) + 2; // 2-9 transazioni per tavolo
      let currentPoints = 0;

      for (let i = 0; i < numTransactions; i++) {
        const points = Math.floor(Math.random() * 20) + 5; // 5-24 punti per transazione
        const assignedBy = users[Math.floor(Math.random() * (users.length - 1)) + 1]; // Escludi admin
        const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
        const description = descriptions[Math.floor(Math.random() * descriptions.length)];

        const transaction = new PointTransaction({
          table: table._id,
          assignedBy: assignedBy._id,
          points,
          type,
          description,
          metadata: {
            previousPoints: currentPoints,
            newPoints: currentPoints + points,
            timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last month
            userAgent: 'Seed Script v1.0',
            ipAddress: '127.0.0.1'
          },
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        });

        await transaction.save();
        transactions.push(transaction);
        currentPoints += points;
      }
    }

    console.log(`✅ Created ${transactions.length} point transactions`);
    return transactions;
  } catch (error) {
    console.error('❌ Error seeding transactions:', error);
    throw error;
  }
};

const generateStats = async () => {
  try {
    console.log('📊 Generating statistics...');

    // Statistiche tavoli
    const tableStats = await Table.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalTables: { $sum: 1 },
          totalPoints: { $sum: '$points' },
          averagePoints: { $avg: '$points' },
          maxPoints: { $max: '$points' },
          minPoints: { $min: '$points' }
        }
      }
    ]);

    // Statistiche transazioni
    const transactionStats = await PointTransaction.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalPoints: { $sum: '$points' },
          avgPoints: { $avg: '$points' }
        }
      }
    ]);

    console.log('📈 Database Statistics:');
    console.log('=====================================');

    if (tableStats.length > 0) {
      const stats = tableStats[0];
      console.log(`📋 Tables: ${stats.totalTables}`);
      console.log(`🏆 Total Points: ${stats.totalPoints}`);
      console.log(`📊 Average Points: ${Math.round(stats.averagePoints)}`);
      console.log(`🥇 Max Points: ${stats.maxPoints}`);
      console.log(`🥉 Min Points: ${stats.minPoints}`);
    }

    console.log('\n💸 Transaction Breakdown:');
    transactionStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} transactions, ${stat.totalPoints} points (avg: ${Math.round(stat.avgPoints)})`);
    });

    // Top 5 tables
    const topTables = await Table.find({ isActive: true })
      .sort({ points: -1 })
      .limit(5)
      .select('tableNumber name points');

    console.log('\n🏆 Top 5 Tables:');
    topTables.forEach((table, index) => {
      const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
      console.log(`   ${medal} ${table.name}: ${table.points} points`);
    });

  } catch (error) {
    console.error('❌ Error generating stats:', error);
  }
};

const createIndexes = async () => {
  try {
    console.log('🔍 Creating database indexes...');

    // Indexes are already defined in the models, but we can create additional ones if needed
    await User.createIndexes();
    await Table.createIndexes();
    await PointTransaction.createIndexes();

    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
};

const seedDatabase = async () => {
  console.log('🌱 Starting database seeding...');
  console.log('=====================================\n');

  try {
    // Connect to database
    await connectDB();

    // Clear existing data
    await clearDatabase();

    // Create indexes
    await createIndexes();

    // Seed data
    const users = await seedUsers();
    const adminUser = users.find(user => user.role === config.USER_ROLES.ADMIN);

    const tables = await seedTables(adminUser);
    const transactions = await seedTransactions(tables, users);

    // Generate stats
    await generateStats();

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('=====================================');
    console.log('\n📋 Default Login Credentials:');
    console.log('   Admin: admin / admin123');
    console.log('   Cassiere1: cassiere1 / cassiere123');
    console.log('   Cassiere2: cassiere2 / cassiere123');
    console.log('   Manager: manager / manager123');
    console.log('\n🚀 Backend is ready to use!');

  } catch (error) {
    console.error('\n❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

// Handle different ways of running this script
if (require.main === module) {
  // Script called directly
  seedDatabase();
}

module.exports = {
  seedDatabase,
  connectDB,
  clearDatabase,
  seedUsers,
  seedTables,
  seedTransactions
};
