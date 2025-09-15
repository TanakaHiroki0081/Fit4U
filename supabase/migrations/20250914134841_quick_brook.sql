/*
  # Add automatic user profile creation trigger

  1. New Functions
    - `handle_new_user()` - Automatically creates user profile when auth.users row is created
    
  2. New Triggers
    - `on_auth_user_created` - Triggers profile creation on auth signup
    
  3. Security Updates
    - Update RLS policies to work with automatic profile creation
    - Remove manual profile creation dependencies
    
  4. Changes
    - Users table will be automatically populated via trigger
    - Frontend no longer needs to manually insert user profiles
    - Eliminates 42501 RLS errors during signup
*/

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Extract user metadata from auth.users.raw_user_meta_data
  INSERT INTO public.users (
    id, 
    email, 
    name, 
    role,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies to be more permissive for the trigger
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;

-- Add policy to allow the trigger to insert (security definer function)
CREATE POLICY "Allow automatic user creation"
  ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Ensure users can still update their own profiles
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure users can read their own profiles
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Keep trainer profile visibility for public browsing
DROP POLICY IF EXISTS "Anyone can read trainer profiles" ON public.users;
CREATE POLICY "Anyone can read trainer profiles"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (role = 'trainer');

-- Add admin access policy
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users admin_user
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all users"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users admin_user
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete users"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users admin_user
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin'
    )
  );