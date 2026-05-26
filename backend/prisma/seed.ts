import { PrismaClient } from '@prisma/client';

const generateId = () => {
  return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, () => {
    return (Math.random() * 16 | 0).toString(16);
  });
};

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data (optional, be careful in production!)
  await prisma.booking.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.route.deleteMany();
  await prisma.city.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned up existing records.');

  // 1. Create Users
  const admin = await prisma.user.create({
    data: {
      id: generateId(),
      email: 'admin@zugo2.com',
      role: 'admin',
      name: 'Super Admin',
      phone: '+923001234567',
    },
  });

  const transporter1 = await prisma.user.create({
    data: {
      id: generateId(),
      email: 'faisalmovers@zugo.com',
      role: 'transporter',
      name: 'Faisal Movers',
      phone: '+923001111111',
    },
  });

  const driver1 = await prisma.user.create({
    data: {
      id: generateId(),
      email: 'driver1@zugo.com',
      role: 'driver',
      name: 'Ali Khan (Driver)',
      phone: '+923331234567',
      transporterId: transporter1.id,
    },
  });

  const passenger1 = await prisma.user.create({
    data: {
      id: generateId(),
      email: 'passenger1@zugo.com',
      role: 'passenger',
      name: 'Usman Ahmed',
      phone: '+923009999999',
    },
  });

  console.log('👥 Users created.');

  // 1.5 Create Buses
  const bus1 = await prisma.bus.create({
    data: {
      busNumber: 'LEX-2023',
      registrationNumber: 'LEX-2023',
      make: 'Toyota',
      model: 'Coaster',
      capacity: 45,
      fuelType: 'diesel',
      busType: 'standard',
      transporterId: transporter1.id,
    },
  });

  const bus2 = await prisma.bus.create({
    data: {
      busNumber: 'KHI-999',
      registrationNumber: 'KHI-999',
      make: 'Hino',
      model: 'Kazay',
      capacity: 45,
      fuelType: 'diesel',
      busType: 'luxury',
      transporterId: transporter1.id,
    },
  });

  console.log('🚌 Buses created.');

  // 2. Create Cities
  const lahore = await prisma.city.create({
    data: {
      name: 'Lahore',
      latitude: 31.5204,
      longitude: 74.3587,
    },
  });

  const islamabad = await prisma.city.create({
    data: {
      name: 'Islamabad',
      latitude: 33.6844,
      longitude: 73.0479,
    },
  });

  const karachi = await prisma.city.create({
    data: {
      name: 'Karachi',
      latitude: 24.8607,
      longitude: 67.0011,
    },
  });

  console.log('🏙️ Cities created.');

  // 3. Create Routes
  const routeLhrIsb = await prisma.route.create({
    data: {
      sourceCityId: lahore.id,
      destCityId: islamabad.id,
      distance: 375.0,
      price: 2500,
      isVerified: true,
    },
  });

  const routeLhrKhi = await prisma.route.create({
    data: {
      sourceCityId: lahore.id,
      destCityId: karachi.id,
      distance: 1200.0,
      price: 6500,
      isVerified: true,
    },
  });

  console.log('🛣️ Routes created.');

  // 4. Create Trips (One active, one scheduled)
  const trip1 = await prisma.trip.create({
    data: {
      routeId: routeLhrIsb.id,
      driverId: driver1.id,
      busId: bus1.id,
      departureTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // Started 2 hours ago
      status: 'active',
      price: 2500,
      totalSeats: 45,
    },
  });

  const trip2 = await prisma.trip.create({
    data: {
      routeId: routeLhrKhi.id,
      driverId: driver1.id,
      busId: bus2.id,
      departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      status: 'scheduled',
      price: 6500,
      totalSeats: 45,
    },
  });

  console.log('🚌 Trips created.');

  // 5. Create Bookings (to generate Revenue)
  await prisma.booking.create({
    data: {
      tripId: trip1.id,
      passengerId: passenger1.id,
      seatNumbers: [12, 13],
      status: 'confirmed',
      qrCode: 'TEST-QR-12345',
    },
  });

  await prisma.booking.create({
    data: {
      tripId: trip1.id,
      passengerId: passenger1.id,
      seatNumbers: [14],
      status: 'confirmed',
      qrCode: 'TEST-QR-67890',
    },
  });

  await prisma.booking.create({
    data: {
      tripId: trip2.id,
      passengerId: passenger1.id,
      seatNumbers: [1, 2, 3],
      status: 'confirmed',
    },
  });

  console.log('🎫 Bookings created.');
  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
