/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Cash Drawer (Caja) feature
 *
 * Creates cash_sessions and cash_movements collections for tracking
 * cash drawer operations.
 */

const CASH_SESSIONS_ID = "cashsess0001"
const CASH_MOVEMENTS_ID = "cashmove0001"
const SALES_ID = "sales00000001"

migrate((app) => {
  // ============================================
  // CASH_SESSIONS
  // ============================================
  const cashSessions = new Collection({
    id: CASH_SESSIONS_ID,
    name: 'cash_sessions',
    type: 'base',
    system: false,
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.role = 'owner' || @request.auth.role = 'partner'",
    fields: [
      {
        id: "csopenedat1",
        name: 'openedAt',
        type: 'date',
        required: true,
      },
      {
        id: "csclosedat1",
        name: 'closedAt',
        type: 'date',
        required: false,
      },
      {
        id: "csopenedby1",
        name: 'openedBy',
        type: 'relation',
        required: true,
        collectionId: "_pb_users_auth_",
        cascadeDelete: false,
        maxSelect: 1,
      },
      {
        id: "csclosedby1",
        name: 'closedBy',
        type: 'relation',
        required: false,
        collectionId: "_pb_users_auth_",
        cascadeDelete: false,
        maxSelect: 1,
      },
      {
        id: "csopenbal01",
        name: 'openingBalance',
        type: 'number',
        required: false,  // false to allow 0 (PocketBase treats 0 as "empty" for required fields)
        min: 0,
      },
      {
        id: "csclosebal1",
        name: 'closingBalance',
        type: 'number',
        required: false,
        min: 0,
      },
      {
        id: "csexpectbl1",
        name: 'expectedBalance',
        type: 'number',
        required: false,
      },
      {
        id: "csdiscrep01",
        name: 'discrepancy',
        type: 'number',
        required: false,
      },
      {
        id: "csdiscnote1",
        name: 'discrepancyNote',
        type: 'text',
        required: false,
      },
      // System autodate fields (required in PocketBase v0.23+)
      {
        id: "cscreated01",
        name: 'created',
        type: 'autodate',
        onCreate: true,
      },
      {
        id: "csupdated01",
        name: 'updated',
        type: 'autodate',
        onCreate: true,
        onUpdate: true,
      },
    ],
    indexes: [],
  })
  app.save(cashSessions)

  // ============================================
  // CASH_MOVEMENTS
  // ============================================
  const cashMovements = new Collection({
    id: CASH_MOVEMENTS_ID,
    name: 'cash_movements',
    type: 'base',
    system: false,
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.role = 'owner' || @request.auth.role = 'partner'",
    deleteRule: "@request.auth.role = 'owner' || @request.auth.role = 'partner'",
    fields: [
      {
        id: "cmsession01",
        name: 'session',
        type: 'relation',
        required: true,
        collectionId: CASH_SESSIONS_ID,
        cascadeDelete: true,
        maxSelect: 1,
      },
      {
        id: "cmtype00001",
        name: 'type',
        type: 'select',
        required: true,
        values: ['ingreso', 'retiro'],
      },
      {
        id: "cmcategory1",
        name: 'category',
        type: 'select',
        required: true,
        values: [
          'venta',
          'prestamo_empleado',
          'retiro_banco',
          'cambio',
          'devolucion_prestamo',
          'deposito_banco',
          'gastos',
          'devolucion_cliente',
          'cambio_billetes',
          'otro'
        ],
      },
      {
        id: "cmamount001",
        name: 'amount',
        type: 'number',
        required: true,
        min: 0,
      },
      {
        id: "cmnote00001",
        name: 'note',
        type: 'text',
        required: false,
      },
      {
        id: "cmsale00001",
        name: 'sale',
        type: 'relation',
        required: false,
        collectionId: SALES_ID,
        cascadeDelete: false,
        maxSelect: 1,
      },
      {
        id: "cmemployee1",
        name: 'employee',
        type: 'relation',
        required: false,
        collectionId: "_pb_users_auth_",
        cascadeDelete: false,
        maxSelect: 1,
      },
      {
        id: "cmcreatedby",
        name: 'createdBy',
        type: 'relation',
        required: true,
        collectionId: "_pb_users_auth_",
        cascadeDelete: false,
        maxSelect: 1,
      },
      // System autodate fields (required in PocketBase v0.23+)
      {
        id: "cmcreated01",
        name: 'created',
        type: 'autodate',
        onCreate: true,
      },
      {
        id: "cmupdated01",
        name: 'updated',
        type: 'autodate',
        onCreate: true,
        onUpdate: true,
      },
    ],
    indexes: [],
  })
  app.save(cashMovements)

}, (app) => {
  // Revert migration

  // Delete cash_movements collection
  try {
    const cashMovements = app.findCollectionByNameOrId('cash_movements')
    if (cashMovements) {
      app.delete(cashMovements)
    }
  } catch (e) {
    // Collection doesn't exist, skip
  }

  // Delete cash_sessions collection
  try {
    const cashSessions = app.findCollectionByNameOrId('cash_sessions')
    if (cashSessions) {
      app.delete(cashSessions)
    }
  } catch (e) {
    // Collection doesn't exist, skip
  }
})
