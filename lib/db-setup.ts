import { supabase } from "./supabase"

export async function setupDatabase() {
  try {
    // We need to use the correct Supabase methods for database operations
    // For raw SQL, we'll use the SQL tag function if available, or fall back to other methods

    // Create tables using the REST API instead of raw SQL
    // First, check if profiles table exists
    const { error: profilesCheckError } = await supabase.from("profiles").select("id").limit(1)

    if (profilesCheckError && profilesCheckError.code === "PGRST116") {
      // Table doesn't exist, let's create it using a stored procedure
      const { error: createTablesError } = await supabase.rpc("create_tables")

      if (createTablesError) {
        // If the stored procedure doesn't exist, we need a different approach
        console.error("Error creating tables:", createTablesError)
        return false
      }
    }

    // Let's create a simpler approach - we'll create a server action to handle this
    return true
  } catch (error) {
    console.error("Error setting up database:", error)
    return false
  }
}

export async function createAdminUser() {
  try {
    // Check if admin user exists
    const { data: existingUser, error: checkError } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", "admin@givek.com")
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking for admin user:", checkError)
      return false
    }

    if (existingUser) {
      console.log("Admin user already exists")
      return true
    }

    // Create admin user in auth
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email: "admin@givek.com",
      password: "secret2108",
      options: {
        data: {
          full_name: "Admin User",
        },
      },
    })

    if (authError) {
      console.error("Error creating admin auth user:", authError)
      return false
    }

    // Set admin role in profiles
    // We need to wait a moment for the profile to be created via triggers
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ is_admin: true })
      .eq("email", "admin@givek.com")

    if (profileError) {
      console.error("Error setting admin role:", profileError)
      return false
    }

    console.log("Admin user created successfully")
    return true
  } catch (error) {
    console.error("Error creating admin user:", error)
    return false
  }
}
