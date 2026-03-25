-- =====================================================
-- MIGRATION: Add super_admin role and update RLS
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Update users role to include super_admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'dokter', 'super_admin'));

-- 2. Update existing super_admin user (if exists)
UPDATE users SET role = 'super_admin' WHERE email = 'superadmin@klinik.com';

-- 3. Drop existing RLS policies for patients
DROP POLICY IF EXISTS "patients_select" ON patients;
DROP POLICY IF EXISTS "patients_insert" ON patients;
DROP POLICY IF EXISTS "patients_update" ON patients;
DROP POLICY IF EXISTS "patients_delete" ON patients;

-- 4. Create new RLS policies that allow super_admin to see all
-- Patients: only same organization OR super_admin
CREATE POLICY "patients_select" ON patients
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      -- Super admin can see all
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
      )
      OR
      -- Regular users see only their organization
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "patients_insert" ON patients
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      -- Super admin can insert to any org
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
      )
      OR
      -- Regular users insert to their organization
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "patients_update" ON patients
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      -- Super admin can update any
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
      )
      OR
      -- Regular users update only their organization
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "patients_delete" ON patients
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND (
      -- Super admin can delete any
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
      )
      OR
      -- Regular users delete only their organization
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- 5. Same for users table
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_update" ON users;

CREATE POLICY "users_select" ON users
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      -- Super admin can see all
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
      )
      OR
      -- Regular users see only their organization
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
      OR
      -- Users can see their own record
      id = auth.uid()
    )
  );

CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      -- Super admin can create any user
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
      )
      OR
      -- Regular admins can create users in their org
      (
        organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
        AND EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() 
          AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "users_update" ON users
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      -- Super admin can update any
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
      )
      OR
      -- Users can update their own
      id = auth.uid()
      OR
      -- Admins can update users in their org
      (
        organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
        AND EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() 
          AND role = 'admin'
        )
      )
    )
  );

-- 6. Same for visits table
DROP POLICY IF EXISTS "visits_select" ON visits;
DROP POLICY IF EXISTS "visits_insert" ON visits;
DROP POLICY IF EXISTS "visits_update" ON visits;

CREATE POLICY "visits_select" ON visits
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
      )
      OR
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "visits_insert" ON visits
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
      )
      OR
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "visits_update" ON visits
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
      )
      OR
      organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- 7. Organizations - allow super_admin to manage, others to read
DROP POLICY IF EXISTS "org_select" ON organizations;
DROP POLICY IF EXISTS "org_update" ON organizations;
DROP POLICY IF EXISTS "org_insert" ON organizations;
DROP POLICY IF EXISTS "org_delete" ON organizations;

CREATE POLICY "org_select" ON organizations
  FOR SELECT USING (true);

CREATE POLICY "org_insert" ON organizations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

CREATE POLICY "org_update" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

CREATE POLICY "org_delete" ON organizations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- 8. Create super_admin if not exists
INSERT INTO users (id, organization_id, email, password_hash, name, role)
VALUES 
  ('00000000-0000-0000-0000-000000000002', NULL, 'superadmin@klinik.com', 'super123', 'Super Admin', 'super_admin')
ON CONFLICT (email) DO UPDATE SET role = 'super_admin';
