/**
 * Rerunnable demo seed for MediFlow Pharmacy.
 * No real patient data, no real medical records, no real credentials.
 *
 * Run with: npm run seed   (from backend/, after building the DB with schema.sql)
 */
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  database: process.env.DB_NAME ?? 'mediflow_pharmacy',
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '',
});

const CATEGORIES = [
  { name: 'Vitamins', description: 'Vitamins and dietary supplements' },
  { name: 'Pain Relief', description: 'Analgesics and anti-inflammatory products' },
  { name: 'Cold & Flu', description: 'Cold, cough, and flu relief products' },
  { name: 'Digestive Health', description: 'Antacids, probiotics, and digestive aids' },
  { name: 'Skin Care', description: 'Topical creams, ointments, and dermatological care' },
  { name: 'Personal Care', description: 'General health and personal care products' },
];

const SUPPLIERS = [
  { name: 'PharmaDirect Distributors', contactPerson: 'Omar Hassan', phone: '+20-100-111-2233', email: 'sales@pharmadirect.example', address: '12 Industrial Zone, Cairo' },
  { name: 'MediSupply Co.', contactPerson: 'Laila Farouk', phone: '+20-101-222-3344', email: 'contact@medisupply.example', address: '45 Nile Corniche, Giza' },
  { name: 'HealthLine Wholesale', contactPerson: 'Youssef Adel', phone: '+20-102-333-4455', email: 'orders@healthline.example', address: '7 Free Zone Rd, Alexandria' },
];

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

interface MedicineSeed {
  name: string;
  description: string;
  category: string;
  manufacturer: string;
  sku: string;
  price: number;
  prescriptionRequired: boolean;
  stock: number;
  minimumStock: number;
  batchExpiryDays: number;
}

const MEDICINES: MedicineSeed[] = [
  { name: 'Vitamin C 1000mg Tablets', description: 'Immune support supplement, 30 tablets.', category: 'Vitamins', manufacturer: 'NutriWell', sku: 'VIT-C-1000', price: 8.99, prescriptionRequired: false, stock: 150, minimumStock: 30, batchExpiryDays: 400 },
  { name: 'Vitamin D3 2000IU Softgels', description: 'Bone and immune health support, 60 softgels.', category: 'Vitamins', manufacturer: 'SunHealth', sku: 'VIT-D3-2000', price: 11.5, prescriptionRequired: false, stock: 120, minimumStock: 25, batchExpiryDays: 500 },
  { name: 'Multivitamin Daily Complex', description: 'Complete daily multivitamin, 90 tablets.', category: 'Vitamins', manufacturer: 'NutriWell', sku: 'VIT-MULTI-90', price: 14.25, prescriptionRequired: false, stock: 80, minimumStock: 20, batchExpiryDays: 450 },
  { name: 'Omega-3 Fish Oil 1000mg', description: 'Heart and brain health support, 60 capsules.', category: 'Vitamins', manufacturer: 'OceanPure', sku: 'VIT-OMEGA3', price: 13.75, prescriptionRequired: false, stock: 60, minimumStock: 15, batchExpiryDays: 380 },

  { name: 'Paracetamol 500mg Tablets', description: 'Pain and fever relief, 20 tablets.', category: 'Pain Relief', manufacturer: 'ReliefPharm', sku: 'PAIN-PARA-500', price: 2.5, prescriptionRequired: false, stock: 300, minimumStock: 60, batchExpiryDays: 300 },
  { name: 'Ibuprofen 400mg Tablets', description: 'Anti-inflammatory pain relief, 24 tablets.', category: 'Pain Relief', manufacturer: 'ReliefPharm', sku: 'PAIN-IBU-400', price: 3.75, prescriptionRequired: false, stock: 200, minimumStock: 40, batchExpiryDays: 320 },
  { name: 'Aspirin 300mg Tablets', description: 'Pain relief and anti-inflammatory, 30 tablets.', category: 'Pain Relief', manufacturer: 'CardioCare', sku: 'PAIN-ASP-300', price: 3.2, prescriptionRequired: false, stock: 90, minimumStock: 20, batchExpiryDays: 12 },
  { name: 'Diclofenac Gel 1%', description: 'Topical anti-inflammatory gel, 50g tube.', category: 'Pain Relief', manufacturer: 'ReliefPharm', sku: 'PAIN-DICLO-GEL', price: 6.4, prescriptionRequired: false, stock: 45, minimumStock: 10, batchExpiryDays: 250 },

  { name: 'Cold & Flu Relief Capsules', description: 'Multi-symptom cold and flu relief, 16 capsules.', category: 'Cold & Flu', manufacturer: 'WinterCare', sku: 'FLU-RELIEF-16', price: 7.99, prescriptionRequired: false, stock: 100, minimumStock: 25, batchExpiryDays: 200 },
  { name: 'Cough Syrup 100ml', description: 'Soothing cough suppressant syrup.', category: 'Cold & Flu', manufacturer: 'WinterCare', sku: 'FLU-COUGH-100', price: 5.5, prescriptionRequired: false, stock: 70, minimumStock: 15, batchExpiryDays: 180 },
  { name: 'Throat Lozenges Honey & Lemon', description: 'Soothing throat lozenges, pack of 24.', category: 'Cold & Flu', manufacturer: 'SootheWell', sku: 'FLU-LOZ-24', price: 3.99, prescriptionRequired: false, stock: 8, minimumStock: 20, batchExpiryDays: 220 },
  { name: 'Nasal Decongestant Spray', description: 'Fast-acting nasal congestion relief, 15ml.', category: 'Cold & Flu', manufacturer: 'ClearBreathe', sku: 'FLU-NASAL-15', price: 6.75, prescriptionRequired: false, stock: 55, minimumStock: 15, batchExpiryDays: 240 },

  { name: 'Antacid Chewable Tablets', description: 'Fast relief from heartburn and indigestion, 40 tablets.', category: 'Digestive Health', manufacturer: 'GastroEase', sku: 'DIG-ANTACID-40', price: 4.5, prescriptionRequired: false, stock: 130, minimumStock: 30, batchExpiryDays: 350 },
  { name: 'Probiotic Capsules 10 Billion CFU', description: 'Digestive and gut health support, 30 capsules.', category: 'Digestive Health', manufacturer: 'BioBalance', sku: 'DIG-PROBIO-30', price: 15.99, prescriptionRequired: false, stock: 40, minimumStock: 10, batchExpiryDays: 300 },
  { name: 'Oral Rehydration Salts', description: 'Electrolyte replacement sachets, box of 10.', category: 'Digestive Health', manufacturer: 'GastroEase', sku: 'DIG-ORS-10', price: 4.2, prescriptionRequired: false, stock: 5, minimumStock: 15, batchExpiryDays: 260 },

  { name: 'Moisturizing Body Lotion', description: 'Daily hydrating lotion for dry skin, 200ml.', category: 'Skin Care', manufacturer: 'DermaSoft', sku: 'SKIN-LOTION-200', price: 9.5, prescriptionRequired: false, stock: 65, minimumStock: 15, batchExpiryDays: 400 },
  { name: 'Antiseptic Cream 30g', description: 'First-aid antiseptic cream for minor cuts.', category: 'Skin Care', manufacturer: 'DermaSoft', sku: 'SKIN-ANTISEP-30', price: 3.6, prescriptionRequired: false, stock: 85, minimumStock: 20, batchExpiryDays: 320 },
  { name: 'Sunscreen SPF 50', description: 'Broad-spectrum sun protection, 100ml.', category: 'Skin Care', manufacturer: 'SunHealth', sku: 'SKIN-SPF50-100', price: 12.99, prescriptionRequired: false, stock: 50, minimumStock: 10, batchExpiryDays: 450 },

  { name: 'Hand Sanitizer Gel 250ml', description: '70% alcohol hand sanitizing gel.', category: 'Personal Care', manufacturer: 'CleanGuard', sku: 'PC-SANITIZER-250', price: 3.99, prescriptionRequired: false, stock: 200, minimumStock: 40, batchExpiryDays: 500 },
  { name: 'Digital Thermometer', description: 'Fast-read digital body thermometer.', category: 'Personal Care', manufacturer: 'MedTech', sku: 'PC-THERMO-DIG', price: 9.99, prescriptionRequired: false, stock: 35, minimumStock: 10, batchExpiryDays: 1000 },
];

async function upsertCategories(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const cat of CATEGORIES) {
    const slug = slugify(cat.name);
    const result = await pool.query(
      `INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
       RETURNING id`,
      [cat.name, slug, cat.description]
    );
    map.set(cat.name, result.rows[0].id);
  }
  return map;
}

async function upsertSuppliers(): Promise<number[]> {
  const ids: number[] = [];
  for (const sup of SUPPLIERS) {
    const existing = await pool.query('SELECT id FROM suppliers WHERE name = $1', [sup.name]);
    if (existing.rowCount) {
      ids.push(existing.rows[0].id);
      continue;
    }
    const result = await pool.query(
      `INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [sup.name, sup.contactPerson, sup.phone, sup.email, sup.address]
    );
    ids.push(result.rows[0].id);
  }
  return ids;
}

async function upsertMedicines(categoryMap: Map<string, number>, supplierIds: number[]) {
  let supplierCursor = 0;
  for (const med of MEDICINES) {
    const categoryId = categoryMap.get(med.category) ?? null;
    const existing = await pool.query('SELECT id FROM medicines WHERE sku = $1', [med.sku]);

    let medicineId: number;
    if (existing.rowCount) {
      medicineId = existing.rows[0].id;
      await pool.query(
        `UPDATE medicines SET name=$1, description=$2, category_id=$3, manufacturer=$4, price=$5, prescription_required=$6
         WHERE id = $7`,
        [med.name, med.description, categoryId, med.manufacturer, med.price, med.prescriptionRequired, medicineId]
      );
    } else {
      const result = await pool.query(
        `INSERT INTO medicines (name, description, category_id, manufacturer, sku, price, prescription_required)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [med.name, med.description, categoryId, med.manufacturer, med.sku, med.price, med.prescriptionRequired]
      );
      medicineId = result.rows[0].id;
    }

    await pool.query(
      `INSERT INTO inventory (medicine_id, total_stock, minimum_stock) VALUES ($1, $2, $3)
       ON CONFLICT (medicine_id) DO UPDATE SET total_stock = EXCLUDED.total_stock, minimum_stock = EXCLUDED.minimum_stock`,
      [medicineId, med.stock, med.minimumStock]
    );

    // Two batches per medicine: one primary (expiring per config) + one longer-dated reserve batch.
    const supplierId = supplierIds[supplierCursor % supplierIds.length];
    supplierCursor += 1;

    const batchNumber1 = `${med.sku}-B1`;
    const batchExists1 = await pool.query('SELECT id FROM batches WHERE medicine_id = $1 AND batch_number = $2', [medicineId, batchNumber1]);
    if (!batchExists1.rowCount) {
      await pool.query(
        `INSERT INTO batches (medicine_id, supplier_id, batch_number, quantity, expiry_date, purchase_price, selling_price)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [medicineId, supplierId, batchNumber1, Math.round(med.stock * 0.6), daysFromNow(med.batchExpiryDays), Number((med.price * 0.6).toFixed(2)), med.price]
      );
    }

    const batchNumber2 = `${med.sku}-B2`;
    const batchExists2 = await pool.query('SELECT id FROM batches WHERE medicine_id = $1 AND batch_number = $2', [medicineId, batchNumber2]);
    if (!batchExists2.rowCount) {
      await pool.query(
        `INSERT INTO batches (medicine_id, supplier_id, batch_number, quantity, expiry_date, purchase_price, selling_price)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [medicineId, supplierId, batchNumber2, Math.round(med.stock * 0.4), daysFromNow(med.batchExpiryDays + 180), Number((med.price * 0.6).toFixed(2)), med.price]
      );
    }
  }
}

async function upsertUsers(): Promise<{ adminId: number; customerIds: number[] }> {
  const passwordHash = await bcrypt.hash('Passw0rd!123', 10);

  async function upsertUser(name: string, email: string, role: 'admin' | 'customer', phone: string, address: string): Promise<number> {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount) return existing.rows[0].id;
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, phone, address) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [name, email, passwordHash, role, phone, address]
    );
    return result.rows[0].id;
  }

  const adminId = await upsertUser('MediFlow Admin', 'admin@mediflow.example', 'admin', '+20-100-000-0001', 'MediFlow HQ, Cairo');

  const customerIds = [
    await upsertUser('Sara Ahmed', 'sara.ahmed@example.com', 'customer', '+20-100-000-0002', '10 Tahrir St, Cairo'),
    await upsertUser('Mohamed Ali', 'mohamed.ali@example.com', 'customer', '+20-100-000-0003', '25 Corniche Rd, Alexandria'),
    await upsertUser('Nourhan Samir', 'nourhan.samir@example.com', 'customer', '+20-100-000-0004', '3 Al Haram St, Giza'),
  ];

  return { adminId, customerIds };
}

async function seedOrders(customerIds: number[]) {
  const existingOrders = await pool.query('SELECT COUNT(*)::int AS count FROM orders');
  if (existingOrders.rows[0].count > 0) {
    console.log('Orders already seeded, skipping order seed.');
    return;
  }

  const medicinesResult = await pool.query('SELECT id, name, price FROM medicines LIMIT 6');
  const medicines = medicinesResult.rows;
  const statuses = ['pending', 'confirmed', 'processing', 'delivered', 'cancelled'];

  // Seed one order per status (cycling through customers) so the admin
  // orders/dashboard views have realistic variety to demo, not just 3 orders.
  for (let i = 0; i < statuses.length; i += 1) {
    const customerId = customerIds[i % customerIds.length];
    const status = statuses[i];
    const pick = medicines.slice(i, i + 2).length ? medicines.slice(i, i + 2) : medicines.slice(0, 2);

    const subtotal = pick.reduce((sum: number, m: any) => sum + Number(m.price) * 2, 0);
    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, status, subtotal, total_amount, shipping_name, shipping_phone, shipping_address, payment_method)
       VALUES ($1,$2,$3,$3,$4,$5,$6,'cash_on_delivery') RETURNING id`,
      [customerId, status, Number(subtotal.toFixed(2)), `Customer ${i + 1}`, '+20-100-000-000' + i, 'Demo Address']
    );
    const orderId = orderResult.rows[0].id;

    for (const m of pick) {
      await pool.query(
        `INSERT INTO order_items (order_id, medicine_id, medicine_name, quantity, unit_price, line_total)
         VALUES ($1,$2,$3,2,$4,$5)`,
        [orderId, m.id, m.name, Number(m.price), Number((m.price * 2).toFixed(2))]
      );
    }

    await pool.query(
      `INSERT INTO payments (order_id, method, status, amount) VALUES ($1,'cash_on_delivery',$2,$3)`,
      [orderId, status === 'delivered' ? 'paid' : status === 'cancelled' ? 'failed' : 'pending', Number(subtotal.toFixed(2))]
    );
  }
}

async function main() {
  console.log('Seeding MediFlow Pharmacy demo data...');
  const categoryMap = await upsertCategories();
  const supplierIds = await upsertSuppliers();
  await upsertMedicines(categoryMap, supplierIds);
  const { customerIds } = await upsertUsers();
  await seedOrders(customerIds);
  console.log('Seed complete.');
  console.log('Demo admin login: admin@mediflow.example / Passw0rd!123');
  console.log('Demo customer login: sara.ahmed@example.com / Passw0rd!123');
  await pool.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
