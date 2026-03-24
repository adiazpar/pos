# Remove Loans System from Cash Drawer

## Overview

Remove the employee loans tracking feature from the cash drawer system. The loans feature adds complexity without sufficient value - employees can track loans independently or use the notes field on movements.

## Current State

The cash page has 4 action buttons:
- Open/Close Drawer
- History
- Movements
- **Loans** (to be removed)

Loans are implemented as two special movement categories (`employee_loan`, `loan_repayment`) with an `employeeId` field linking movements to employees. Outstanding balances are calculated on-the-fly from movement history.

## Target State

The cash page will have 3 action buttons:
- Open/Close Drawer
- History
- Movements

Movement categories will be simplified to:
- `sale` - Cash sales (deposits)
- `bank_withdrawal` - Cash from bank (deposits)
- `bank_deposit` - Cash to bank (withdrawals)
- `other` - Miscellaneous movements

## Database Changes

### Schema Updates

**`cashMovements` table:**

Remove from category enum:
- `employee_loan`
- `loan_repayment`

Remove column:
- `employeeId` (only used for loans)

### Data Migration

Delete all records where `category` is `employee_loan` or `loan_repayment`. No backwards compatibility or data preservation required.

## Files to Delete

| File | Reason |
|------|--------|
| `src/components/cash/LoansModal.tsx` | Component only serves loans feature |

## Files to Modify

### Database Layer

**`src/db/schema.ts`**
- Remove `employee_loan` and `loan_repayment` from category enum
- Remove `employeeId` column from `cashMovements`

### Types

**`src/types/index.ts`**
- Remove `employee_loan` and `loan_repayment` from `CashMovementCategory` type
- Remove `employeeId` and `employee` fields from `CashMovement` interface

### Utilities

**`src/lib/cash.ts`**
- Remove loan entries from `CATEGORY_LABELS`
- Remove `employee_loan` from `DEPOSIT_CATEGORIES`
- Remove `loan_repayment` from `WITHDRAWAL_CATEGORIES`
- Delete `calculateOutstandingLoans()` function entirely

### Components

**`src/components/cash/index.ts`**
- Remove `LoansModal` export

**`src/components/cash/MovementsList.tsx`**
- Remove conditional logic that displays employee name for loan movements
- Always show note or dash

### Hooks

**`src/hooks/useCashSession.ts`**
- Remove `calculateOutstandingLoans` import
- Remove `outstandingLoans` computation and state
- Remove from return object and type

**`src/hooks/useCashMovements.ts`**
- Remove `employeeId` assignment logic for loan categories
- Simplify movement creation

### Pages

**`src/app/(dashboard)/cash/page.tsx`**
- Remove `LoansModal` import
- Remove `isLoansModalOpen` state
- Remove Loans button from UI
- Remove `LoansModal` component instance

**`src/app/(dashboard)/cash/history/page.tsx`**
- Remove loan category entries from `CATEGORY_LABELS`
- Remove conditional employee name display for loan movements

### API Routes

**`src/app/api/cash/movements/route.ts`**
- Remove `employee_loan` and `loan_repayment` from category validation
- Remove `employeeId` from request schema and handling
- Remove employee join in GET query

**`src/app/api/cash/movements/[id]/route.ts`**
- Remove loan categories from validation
- Remove `employeeId` from update schema

## Verification

After implementation:
1. Cash page shows 3 buttons (no Loans button)
2. Add Movement modal shows 4 categories (no loan options)
3. History page displays all non-loan movements correctly
4. Database schema has no `employeeId` column
5. No loan-related records exist in `cash_movements` table
6. Build passes with no TypeScript errors
7. All existing non-loan functionality works as before
