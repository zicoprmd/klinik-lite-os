-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  medical_record_number TEXT,
  name TEXT NOT NULL,
  gender TEXT,
  birth_date DATE,
  age INTEGER,
  address TEXT,
  phone TEXT,
  allergies TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Visits table
CREATE TABLE IF NOT EXISTS visits (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  patient_id TEXT REFERENCES patients(id),
  doctor_id TEXT,
  visit_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default organizations
INSERT INTO organizations (id, name, slug, address, phone, is_active) VALUES
('org-001', 'Klinik Utama Jaya', 'utama Jaya', 'Jl. Raya Utama No. 123', '021-1234567', true),
('org-002', 'Klinik Sehat Bersama', 'sehat-bersama', 'Jl. Sehat No. 45', '021-7654321', true),
('org-003', 'Klinik Medika', 'medika', 'Jl. Medika No. 78', '021-9876543', true)
ON CONFLICT (id) DO NOTHING;

-- Insert default users
INSERT INTO users (id, organization_id, email, password, name, role, is_active) VALUES
('user-001', 'org-001', 'admin@utama.com', 'admin123', 'Budi Santoso', 'admin', true),
('user-002', 'org-001', 'dokter@utama.com', 'demo123', 'Dr. Siti Aminah', 'dokter', true),
('user-003', 'org-002', 'admin@sehat.com', 'admin123', 'Joko Pramono', 'admin', true),
('user-004', 'org-002', 'dokter@sehat.com', 'demo123', 'Dr. Ahmad Fauzi', 'dokter', true),
('user-005', 'org-003', 'admin@medika.com', 'admin123', 'Rina Susilowati', 'admin', true),
('user-006', 'org-003', 'dokter@medika.com', 'demo123', 'Dr. Dewi Lestari', 'dokter', true),
('user-super', NULL, 'superadmin@klinik.com', 'super123', 'Super Admin', 'super_admin', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (for demo)
CREATE POLICY "Allow all for organizations" ON organizations FOR ALL USING (true);
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for patients" ON patients FOR ALL USING (true);
CREATE POLICY "Allow all for visits" ON visits FOR ALL USING (true);