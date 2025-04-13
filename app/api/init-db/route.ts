import { NextResponse } from "next/server"
import { createAdminUser } from "@/lib/db-setup"

export async function GET() {
  try {    

    // Create a response with the initialization data
    const response = NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      adminCredentials: {
        email: "admin@givek.com",
        password: "secret2108",
      },
    })

    // Set a cookie to mark the app as initialized
    response.cookies.set("app_initialized", "true", {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Initialization error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Initialization error",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
