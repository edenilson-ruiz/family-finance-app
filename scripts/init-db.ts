import { setupDatabase, createAdminUser } from "../lib/db-setup"

async function initializeDatabase() {
  console.log("Setting up database schema...")
  const schemaSetup = await setupDatabase()

  if (!schemaSetup) {
    console.error("Failed to set up database schema")
    process.exit(1)
  }

  console.log("Database schema set up successfully")

  console.log("Creating admin user...")
  const adminCreated = await createAdminUser()

  if (!adminCreated) {
    console.error("Failed to create admin user")
    process.exit(1)
  }

  console.log("Admin user created successfully")
  console.log("Email: admin@givek.com")
  console.log("Password: secret2108")

  process.exit(0)
}

initializeDatabase().catch((error) => {
  console.error("Initialization error:", error)
  process.exit(1)
})
