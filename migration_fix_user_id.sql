-- Start a transaction
BEGIN;

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Users can view own itineraries" ON public.itineraries;
DROP POLICY IF EXISTS "Users can insert own itineraries" ON public.itineraries;
DROP POLICY IF EXISTS "Users can update own itineraries" ON public.itineraries;
DROP POLICY IF EXISTS "Users can delete own itineraries" ON public.itineraries;

-- Step 2: Alter the column type
ALTER TABLE public.users ALTER COLUMN id TYPE UUID USING (id::UUID);
ALTER TABLE public.itineraries ALTER COLUMN user_id TYPE UUID USING (user_id::UUID);

-- Step 3: Recreate the policies
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid()::uuid = id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid()::uuid = id);

CREATE POLICY "Users can view own itineraries" ON public.itineraries
  FOR SELECT USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can insert own itineraries" ON public.itineraries
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can update own itineraries" ON public.itineraries
  FOR UPDATE USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can delete own itineraries" ON public.itineraries
  FOR DELETE USING (auth.uid()::uuid = user_id);

-- Commit the transaction
COMMIT;

