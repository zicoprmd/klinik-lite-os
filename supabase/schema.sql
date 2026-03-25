-- Klinik Lite OS - Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'dokter' CHECK (role IN ('admin', 'dokter')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PATIENTS table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medical_record_number VARCHAR(50) UNIQUE,
  name VARCHAR(255) NOT NULL,
  gender CHAR(1) CHECK (gender IN ('L', 'P')),
  age INTEGER,
  birth_date DATE,
  address TEXT,
  phone VARCHAR(20),
  blood_type VARCHAR(5),
  allergies TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- VISITS table (SOAP notes)
CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visit_date TIMESTAMPTZ DEFAULT NOW(),
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(medical_record_number);
CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date);

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Patients RLS Policies
CREATE POLICY "Authenticated users can view patients" ON patients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert patients" ON patients
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update patients" ON patients
  FOR UPDATE TO authenticated USING (true);

-- Visits RLS Policies
CREATE POLICY "Authenticated users can view visits" ON visits
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert visits" ON visits
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update visits" ON visits
  FOR UPDATE TO authenticated USING (true);

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role)
  VALUES (NEW.id, 'dokter');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Sample data (optional - for testing)
-- INSERT INTO patients (name, gender, age, address, phone) VALUES
--   ('Ahmad Fauzi', 'L', 45, 'Jl. Merdeka No. 10', '081234567890'),
--   ('Siti Aminah', 'P', 32, 'Jl. Sudirman No. 25', '081234567891');