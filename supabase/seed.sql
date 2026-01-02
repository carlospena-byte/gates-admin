-- Seed file for gates-admin development environment
-- This file is automatically run after migrations during `supabase db reset`
--
-- Role Hierarchy:
-- 1. Platform Admin - Global access, can impersonate anyone
-- 2. Residential Owner - Full control of their residential + create admins
-- 3. Residential Admin - Manage units, amenities, users (except admins)
-- 4. Residential Security - View-only access to units, visitors, reservations

-- ============================================================================
-- STEP 1: Create test users in auth.users
-- ============================================================================

DO $$
DECLARE
  owner_id uuid;
  admin_id uuid;
  security_id uuid;
  platform_admin_id uuid;
BEGIN
  -- Create Platform Admin user (only if doesn't exist)
  SELECT id INTO platform_admin_id FROM auth.users WHERE email = 'platformadmin@example.com' LIMIT 1;
  IF platform_admin_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token,
      email_change_token_current,
      email_change_token_new,
      recovery_token,
      email_change,
      phone,
      phone_change,
      phone_change_token,
      reauthentication_token
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'platformadmin@example.com',
      crypt('test123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{}',
      false,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      '',
      '',
      NULL,
      '',
      '',
      ''
    )
    RETURNING id INTO platform_admin_id;
  END IF;

  -- Create Owner user (only if doesn't exist)
  SELECT id INTO owner_id FROM auth.users WHERE email = 'owner@residential.com' LIMIT 1;
  IF owner_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token,
      email_change_token_current,
      email_change_token_new,
      recovery_token,
      email_change,
      phone,
      phone_change,
      phone_change_token,
      reauthentication_token
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'owner@residential.com',
      crypt('test123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{}',
      false,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      '',
      '',
      NULL,
      '',
      '',
      ''
    )
    RETURNING id INTO owner_id;
  END IF;

  -- Create Admin user (only if doesn't exist)
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@residential.com' LIMIT 1;
  IF admin_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token,
      email_change_token_current,
      email_change_token_new,
      recovery_token,
      email_change,
      phone,
      phone_change,
      phone_change_token,
      reauthentication_token
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'admin@residential.com',
      crypt('test123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{}',
      false,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      '',
      '',
      NULL,
      '',
      '',
      ''
    )
    RETURNING id INTO admin_id;
  END IF;

  -- Create Security user (only if doesn't exist)
  SELECT id INTO security_id FROM auth.users WHERE email = 'security@residential.com' LIMIT 1;
  IF security_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token,
      email_change_token_current,
      email_change_token_new,
      recovery_token,
      email_change,
      phone,
      phone_change,
      phone_change_token,
      reauthentication_token
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'security@residential.com',
      crypt('test123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{}',
      false,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      '',
      '',
      NULL,
      '',
      '',
      ''
    )
    RETURNING id INTO security_id;
  END IF;

  -- ============================================================================
  -- STEP 2: Create profiles for test users
  -- ============================================================================

  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (owner_id, 'owner@residential.com', 'John', 'Owner')
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (admin_id, 'admin@residential.com', 'Jane', 'Admin')
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (security_id, 'security@residential.com', 'Bob', 'Security')
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (platform_admin_id, 'platformadmin@example.com', 'Admin', 'Platform')
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

  -- ============================================================================
  -- STEP 3: Create Demo Residential
  -- ============================================================================

  INSERT INTO public.residentials (id, name, owner_user_id)
  VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Demo Residential Complex',
    owner_id
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    owner_user_id = EXCLUDED.owner_user_id;

  -- ============================================================================
  -- STEP 4: Assign roles to users
  -- ============================================================================

  -- Owner role
  INSERT INTO public.residential_users (residential_id, user_id, role)
  VALUES ('550e8400-e29b-41d4-a716-446655440000', owner_id, 'owner')
  ON CONFLICT (residential_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  -- Admin role
  INSERT INTO public.residential_users (residential_id, user_id, role)
  VALUES ('550e8400-e29b-41d4-a716-446655440000', admin_id, 'admin')
  ON CONFLICT (residential_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  -- Security role
  INSERT INTO public.residential_users (residential_id, user_id, role)
  VALUES ('550e8400-e29b-41d4-a716-446655440000', security_id, 'security')
  ON CONFLICT (residential_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  -- ============================================================================
  -- STEP 5: Create Platform Admin
  -- ============================================================================

  INSERT INTO public.platform_admins (user_id)
  VALUES (platform_admin_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- ============================================================================
  -- STEP 6: Create sample unit types
  -- ============================================================================

  INSERT INTO public.unit_types (residential_id, name)
  VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'Studio'),
    ('550e8400-e29b-41d4-a716-446655440000', 'One Bedroom'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Two Bedroom'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Penthouse')
  ON CONFLICT (residential_id, name) DO UPDATE SET
    name = EXCLUDED.name;

  -- ============================================================================
  -- STEP 7: Create sample location types
  -- ============================================================================

  INSERT INTO public.location_types (residential_id, name, code)
  VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'Parking', 'PARK'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Storage', 'STOR'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Gym', 'GYM'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Pool', 'POOL'),
    ('550e8400-e29b-41d4-a716-446655440000', 'Lounge', 'LOUNGE')
  ON CONFLICT (residential_id, code) DO UPDATE SET
    name = EXCLUDED.name;

  -- ============================================================================
  -- STEP 8: Create sample amenities
  -- ============================================================================

  INSERT INTO public.amenities (residential_id, name, description, requires_booking, capacity)
  VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'Rooftop Pool', 'Olympic-size pool with city views', true, 50),
    ('550e8400-e29b-41d4-a716-446655440000', 'Fitness Center', '24/7 state-of-the-art gym', false, 30),
    ('550e8400-e29b-41d4-a716-446655440000', 'Party Room', 'Event space with kitchen', true, 40),
    ('550e8400-e29b-41d4-a716-446655440000', 'Business Center', 'Meeting rooms and workstations', true, 15),
    ('550e8400-e29b-41d4-a716-446655440000', 'Dog Park', 'Outdoor pet area', false, 20)
  ON CONFLICT (residential_id, name) DO NOTHING;

  -- ============================================================================
  -- STEP 9: Create sample buildings and floors
  -- ============================================================================

  -- Building A
  INSERT INTO public.buildings (id, residential_id, name)
  VALUES
    ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Building A')
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name;

  -- Building B
  INSERT INTO public.buildings (id, residential_id, name)
  VALUES
    ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Building B')
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name;

  -- Floors for Building A
  INSERT INTO public.floors (building_id, name)
  VALUES
    ('660e8400-e29b-41d4-a716-446655440001', 'Ground Floor'),
    ('660e8400-e29b-41d4-a716-446655440001', 'Second Floor'),
    ('660e8400-e29b-41d4-a716-446655440001', 'Third Floor'),
    ('660e8400-e29b-41d4-a716-446655440001', 'Penthouse Level')
  ON CONFLICT (building_id, name) DO NOTHING;

  -- Floors for Building B
  INSERT INTO public.floors (building_id, name)
  VALUES
    ('660e8400-e29b-41d4-a716-446655440002', 'Lobby Level'),
    ('660e8400-e29b-41d4-a716-446655440002', 'Level 2'),
    ('660e8400-e29b-41d4-a716-446655440002', 'Sky Lounge')
  ON CONFLICT (building_id, name) DO NOTHING;

  -- Create sample units
  INSERT INTO public.units (residential_id, name, owner_user_id, is_active)
  VALUES
    ('550e8400-e29b-41d4-a716-446655440000', '101', owner_id, true),
    ('550e8400-e29b-41d4-a716-446655440000', '102', owner_id, true),
    ('550e8400-e29b-41d4-a716-446655440000', '201', NULL, true),
    ('550e8400-e29b-41d4-a716-446655440000', '202', NULL, true),
    ('550e8400-e29b-41d4-a716-446655440000', '301', admin_id, true)
  ON CONFLICT (residential_id, name) DO NOTHING;

  RAISE NOTICE '✅ Seed data created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Test Credentials (Password & OTP):';
  RAISE NOTICE '  - Platform Admin: platformadmin@example.com / test123';
  RAISE NOTICE '  - Owner:          owner@residential.com / test123';
  RAISE NOTICE '  - Admin:          admin@residential.com / test123';
  RAISE NOTICE '  - Security:       security@residential.com / test123';
  RAISE NOTICE '';
  RAISE NOTICE '🏢 Demo Residential: "Demo Residential Complex"';
  RAISE NOTICE '📦 Sample Data: 4 unit types, 5 location types, 5 amenities, 2 buildings with floors, 5 units';
  RAISE NOTICE '';
  RAISE NOTICE '🔗 Mailpit (view OTP emails): http://localhost:8025';

END $$;
