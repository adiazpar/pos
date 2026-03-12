/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Add edit tracking to cash_movements
 *
 * Adds editedBy field to track who last edited a movement.
 * The built-in 'updated' autodate field already tracks when.
 */

migrate((app) => {
  const collection = app.findCollectionByNameOrId('cash_movements')

  // Add editedBy field
  collection.fields.push({
    id: "cmeditedby1",
    name: 'editedBy',
    type: 'relation',
    required: false,
    collectionId: "_pb_users_auth_",
    cascadeDelete: false,
    maxSelect: 1,
  })

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId('cash_movements')

  // Remove editedBy field
  collection.fields = collection.fields.filter(f => f.name !== 'editedBy')

  app.save(collection)
})
