-- Create profiles table first
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS and create policies for profiles
DO $$
BEGIN
  -- Enable RLS
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  
  -- Drop policies if they exist to avoid errors
  DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
  DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
  
  -- Create policies
  CREATE POLICY "Users can view their own profile" 
    ON profiles FOR SELECT 
    USING (auth.uid() = id);
    
  CREATE POLICY "Super admins can view all profiles" 
    ON profiles FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
      )
    );
END$$;

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS and create policies for categories
DO $$
BEGIN
  -- Enable RLS
  ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
  
  -- Drop policies if they exist to avoid errors
  DROP POLICY IF EXISTS "Users can manage their own categories" ON categories;
  DROP POLICY IF EXISTS "Super admins can view all categories" ON categories;
  
  -- Create policies
  CREATE POLICY "Users can manage their own categories" 
    ON categories FOR ALL 
    USING (auth.uid() = user_id);
    
  CREATE POLICY "Super admins can view all categories" 
    ON categories FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
      )
    );
END$$;

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  date DATE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS and create policies for transactions
DO $$
BEGIN
  -- Enable RLS
  ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
  
  -- Drop policies if they exist to avoid errors
  DROP POLICY IF EXISTS "Users can manage their own transactions" ON transactions;
  DROP POLICY IF EXISTS "Super admins can view all transactions" ON transactions;
  
  -- Create policies
  CREATE POLICY "Users can manage their own transactions" 
    ON transactions FOR ALL 
    USING (auth.uid() = user_id);
    
  CREATE POLICY "Super admins can view all transactions" 
    ON transactions FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND is_admin = TRUE
      )
    );
END$$;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each table
DO $$
BEGIN
  -- Drop triggers if they exist to avoid errors
  DROP TRIGGER IF EXISTS set_timestamp_profiles ON profiles;
  DROP TRIGGER IF EXISTS set_timestamp_categories ON categories;
  DROP TRIGGER IF EXISTS set_timestamp_transactions ON transactions;
  
  -- Create triggers
  CREATE TRIGGER set_timestamp_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();
  
  CREATE TRIGGER set_timestamp_categories
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();
  
  CREATE TRIGGER set_timestamp_transactions
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();
END$$;

-- Create a trigger to create a profile when a user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_admin)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', FALSE);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger for new users
DO $$
BEGIN
  -- Drop trigger if it exists to avoid errors
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  
  -- Create trigger
  CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
END$$;