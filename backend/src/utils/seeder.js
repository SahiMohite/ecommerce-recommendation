const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Interaction = require('../models/Interaction');

const categories = ['electronics', 'clothing', 'books', 'home', 'sports', 'toys', 'food', 'beauty', 'automotive', 'other'];

const sampleProducts = [
  { name: 'Gaming Laptop', category: 'electronics', price: 1299.99, tags: ['gaming', 'laptop', 'tech'] },
  { name: 'Wireless Headphones', category: 'electronics', price: 199.99, tags: ['audio', 'wireless', 'music'] },
  { name: 'Smart Watch', category: 'electronics', price: 399.99, tags: ['wearable', 'fitness', 'tech'] },
  { name: 'Running Shoes', category: 'sports', price: 89.99, tags: ['footwear', 'running', 'fitness'] },
  { name: 'Yoga Mat', category: 'sports', price: 29.99, tags: ['yoga', 'fitness', 'exercise'] },
  { name: 'Coffee Maker', category: 'home', price: 79.99, tags: ['kitchen', 'appliance', 'coffee'] },
  { name: 'Office Chair', category: 'home', price: 249.99, tags: ['furniture', 'office', 'ergonomic'] },
  { name: 'Backpack', category: 'other', price: 49.99, tags: ['bag', 'travel', 'storage'] },
  { name: 'Smartphone', category: 'electronics', price: 899.99, tags: ['phone', 'mobile', 'tech'] },
  { name: 'Bluetooth Speaker', category: 'electronics', price: 79.99, tags: ['audio', 'wireless', 'music'] },
  { name: 'Fitness Tracker', category: 'sports', price: 129.99, tags: ['wearable', 'fitness', 'health'] },
  { name: 'Desk Lamp', category: 'home', price: 39.99, tags: ['lighting', 'office', 'home'] },
  { name: 'Water Bottle', category: 'sports', price: 24.99, tags: ['hydration', 'fitness', 'sports'] },
  { name: 'Notebook Set', category: 'other', price: 19.99, tags: ['stationery', 'writing', 'office'] },
  { name: 'Keyboard', category: 'electronics', price: 89.99, tags: ['computer', 'gaming', 'tech'] }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    await Interaction.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@ecommerce.com',
      password: 'admin123',
      role: 'admin'
    });
    console.log('Created admin user');

    // Create regular users
    const users = [];
    for (let i = 1; i <= 20; i++) {
      const user = await User.create({
        name: `User ${i}`,
        email: `user${i}@example.com`,
        password: 'password123'
      });
      users.push(user);
    }
    console.log(`Created ${users.length} users`);

    // Create products
    const products = [];
    for (let i = 0; i < 100; i++) {
      const template = sampleProducts[i % sampleProducts.length];
      const product = await Product.create({
        name: `${template.name} ${i + 1}`,
        description: `High-quality ${template.name.toLowerCase()} with excellent features and performance.`,
        price: Math.max(9.99, template.price + (Math.random() * 100 - 50)), // Ensure positive price
        category: template.category,
        tags: template.tags,
        stock: Math.floor(Math.random() * 100) + 10,
        images: [`https://placehold.co/400?text=${encodeURIComponent(template.name)}`],
        ratings: {
          average: Number((3 + Math.random() * 2).toFixed(1)),
          count: Math.floor(Math.random() * 100)
        },
        featured: Math.random() > 0.8
      });
      products.push(product);
    }
    console.log(`Created ${products.length} products`);

    // Create interactions and orders
    for (const user of users) {
      const numInteractions = Math.floor(Math.random() * 20) + 5;
      
      for (let i = 0; i < numInteractions; i++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const interactionType = ['view', 'view', 'view', 'cart', 'purchase'][Math.floor(Math.random() * 5)];
        
        await Interaction.create({
          user: user._id,
          product: product._id,
          type: interactionType,
          value: interactionType === 'rating' ? Math.floor(Math.random() * 5) + 1 : 1
        });

        if (interactionType === 'purchase') {
          product.purchases += 1;
          await product.save();
        }
      }

      // Create some orders
      if (Math.random() > 0.5) {
        const orderItems = [];
        const numItems = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < numItems; i++) {
          const product = products[Math.floor(Math.random() * products.length)];
          orderItems.push({
            product: product._id,
            quantity: Math.floor(Math.random() * 3) + 1,
            price: product.price
          });
        }

        const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        await Order.create({
          user: user._id,
          items: orderItems,
          totalAmount,
          status: ['pending', 'processing', 'shipped', 'delivered'][Math.floor(Math.random() * 4)],
          shippingAddress: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001'
          }
        });
      }
    }

    console.log('Created interactions and orders');
    console.log('✅ Database seeded successfully!');
    console.log('\nLogin credentials:');
    console.log('Admin - Email: admin@ecommerce.com, Password: admin123');
    console.log('User - Email: user1@example.com, Password: password123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();