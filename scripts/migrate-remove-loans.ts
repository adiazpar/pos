/**
 * Migration: Remove Loans System
 *
 * This script deletes any orphaned loan movements before the schema change.
 * Run with: npx tsx scripts/migrate-remove-loans.ts [--prod]
 */

import { createClient } from '@libsql/client'
import { config } from 'dotenv'

// Load env
config({ path: '.env.local' })

const isProd = process.argv.includes('--prod')

const url = isProd
  ? process.env.TURSO_PROD_DATABASE_URL
  : process.env.TURSO_DATABASE_URL

const authToken = isProd
  ? process.env.TURSO_PROD_AUTH_TOKEN
  : process.env.TURSO_AUTH_TOKEN

if (!url || !authToken) {
  console.error(`Missing ${isProd ? 'TURSO_PROD_' : 'TURSO_'}DATABASE_URL or AUTH_TOKEN`)
  process.exit(1)
}

const client = createClient({ url, authToken })

async function migrate() {
  const env = isProd ? 'PRODUCTION' : 'development'
  console.log(`\nRunning loan removal migration on ${env} database...\n`)

  // Count existing loan movements
  const countResult = await client.execute(
    "SELECT COUNT(*) as count FROM cash_movements WHERE category IN ('employee_loan', 'loan_repayment')"
  )
  const count = countResult.rows[0].count as number

  if (count === 0) {
    console.log('No loan movements found. Database is ready for schema update.')
    return
  }

  console.log(`Found ${count} loan movement(s) to delete.`)

  // Show what will be deleted
  const movements = await client.execute(
    "SELECT id, category, amount, note, created_at FROM cash_movements WHERE category IN ('employee_loan', 'loan_repayment') LIMIT 10"
  )

  console.log('\nMovements to delete:')
  for (const row of movements.rows) {
    console.log(`  - ${row.category}: $${row.amount} (${row.note || 'no note'})`)
  }
  if (count > 10) {
    console.log(`  ... and ${count - 10} more`)
  }

  // Delete loan movements
  await client.execute(
    "DELETE FROM cash_movements WHERE category IN ('employee_loan', 'loan_repayment')"
  )

  console.log(`\nDeleted ${count} loan movement(s).`)
  console.log('Database is ready for schema update.')
  console.log(`\nNext step: npm run db:push${isProd ? ':prod' : ''}`)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
