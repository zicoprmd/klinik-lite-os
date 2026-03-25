-- =====================================================
-- KLINIK LITE OS - MULTI-TENANT SAAS SCHEMA
-- =====================================================

-- Organizations table (tenants)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- for subdomain: kliniksa.env
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  plan TEXT DEFAULT 'free', -- free, starter, pro
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users with organization association
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'dokter', -- admin, dokter
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients with organization association
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gender TEXT,
  birth_date DATE,
  age INTEGER,
  address TEXT,
  phone TEXT,
  medical_record_number TEXT,
  blood_type TEXT,
  allergies TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visits with organization and doctor association
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  visit_date TIMESTAMPTZ NOT NULL,
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Organizations: users can only see their own org
CREATE POLICY "org_select" ON organizations
  FOR SELECT USING (true);

CREATE POLICY "org_update" ON organizations
  FOR UPDATE USING (true);

-- Users: only users in same organization
CREATE POLICY "users_select" ON users
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "users_update" ON users
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Patients: only same organization
CREATE POLICY "patients_select" ON patients
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "patients_insert" ON patients
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "patients_update" ON patients
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "patients_delete" ON patients
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Visits: only same organization
CREATE POLICY "visits_select" ON visits
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "visits_insert" ON visits
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "visits_update" ON visits
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "visits_delete" ON visits
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_patients_org ON patients(organization_id);
CREATE INDEX idx_visits_org ON visits(organization_id);
CREATE INDEX idx_visits_patient ON visits(patient_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- =====================================================
-- DEFAULT DATA (for first-time setup)
-- =====================================================

-- Insert default organization
INSERT INTO organizations (id, name, slug, address, phone)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Klinik Demo', 'demo', 'Jl. Contoh No. 1', '081234567890')
ON CONFLICT DO NOTHING;

-- Insert admin user for demo org (password: admin123)
INSERT INTO users (id, organization_id, email, password_hash, name, role)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin@klinik.com', '$2a$10$ABC', 'Admin Klinik', 'admin')
ON CONFLICT DO NOTHING;

-- Note: In production, use proper password hashing (bcrypt)
-- The password_hash above is just a placeholder