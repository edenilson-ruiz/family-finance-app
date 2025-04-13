"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Copy } from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"

export default function InitPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    adminCredentials?: { email: string; password: string }
  } | null>(null)
  const { signUp } = useAuth()
  const [activeTab, setActiveTab] = useState("auto")

  const createAdminUser = async () => {
    setLoading(true)
    try {
      const { error } = await signUp("admin@givek.com", "secret2108", "Admin User")

      if (error) {
        setResult({
          success: false,
          message: `Failed to create admin user: ${error.message}`,
        })
        return
      }

      // Set a cookie to mark the app as initialized
      document.cookie = "app_initialized=true; max-age=31536000; path=/"

      setResult({
        success: true,
        message: "Admin user created successfully! Please check your email to confirm your account, then log in.",
        adminCredentials: {
          email: "admin@givek.com",
          password: "secret2108",
        },
      })
    } catch (error) {
      setResult({
        success: false,
        message: `An error occurred: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl">Initialize Family Finance App</CardTitle>
          <CardDescription>Set up the database schema and create an admin user for your application.</CardDescription>
        </CardHeader>
        <CardContent>
          {result && (
            <Alert variant={result.success ? "default" : "destructive"} className="mb-4">
              {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
              {result.success && result.adminCredentials && (
                <div className="mt-2">
                  <p className="font-semibold">Admin Credentials:</p>
                  <p>Email: {result.adminCredentials.email}</p>
                  <p>Password: {result.adminCredentials.password}</p>
                </div>
              )}
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="auto">Automatic Setup</TabsTrigger>
              <TabsTrigger value="manual">Manual Setup</TabsTrigger>
            </TabsList>

            <TabsContent value="auto" className="space-y-4">
              <div className="rounded-md bg-amber-50 p-4 text-amber-800">
                <p className="font-medium">Important Note</p>
                <p className="text-sm">
                  The automatic setup only creates an admin user. You need to set up the database schema manually using
                  the SQL commands in the "Manual Setup" tab.
                </p>
              </div>

              <p className="text-sm text-gray-500">This action will:</p>
              <ul className="ml-6 mt-2 list-disc text-sm text-gray-500">
                <li>Create an admin user with full access</li>
                <li>Set a cookie to mark the app as initialized</li>
              </ul>

              <Button onClick={createAdminUser} disabled={loading || result?.success} className="mt-4">
                {loading ? "Creating Admin User..." : "Create Admin User"}
              </Button>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="rounded-md bg-blue-50 p-4 text-blue-800">
                <p className="font-medium">Database Setup Instructions</p>
                <p className="text-sm">To set up your database schema, follow these steps:</p>
                <ol className="ml-6 mt-2 list-decimal text-sm">
                  <li>Go to your Supabase project dashboard</li>
                  <li>Navigate to the SQL Editor</li>
                  <li>Create a new query</li>
                  <li>Copy and paste the SQL below</li>
                  <li>Run the query</li>
                </ol>
              </div>

              <div className="relative">
                <pre className="max-h-96 overflow-auto rounded-md bg-gray-900 p-4 text-sm text-white">
                  {`-- Create profiles table first
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS and create policies for profiles
DO $
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
END$;

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
DO $
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
END$;

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
DO $
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
END$;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create triggers for each table
DO $
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
END$;

-- Create a trigger to create a profile when a user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_admin)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', FALSE);
  RETURN new;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger for new users
DO $
BEGIN
  -- Drop trigger if it exists to avoid errors
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  
  -- Create trigger
  CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
END$;`}
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2"
                  onClick={() =>
                    copyToClipboard(`-- Create profiles table first
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS and create policies for profiles
DO $
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
END$;

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
DO $
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
END$;

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
DO $
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
END$;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create triggers for each table
DO $
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
END$;

-- Create a trigger to create a profile when a user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_admin)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', FALSE);
  RETURN new;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger for new users
DO $
BEGIN
  -- Drop trigger if it exists to avoid errors
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  
  -- Create trigger
  CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
END$;`)
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 rounded-md bg-green-50 p-4 text-green-800">
                <p className="font-medium">After Setting Up the Database</p>
                <p className="text-sm">
                  Once you've set up the database schema, return to the "Automatic Setup" tab to create an admin user.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          {result?.success ? (
            <Link href="/login" className="w-full">
              <Button className="w-full">Go to Login</Button>
            </Link>
          ) : (
            <div className="w-full text-center text-sm text-gray-500">
              Complete the setup to continue to the application
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
