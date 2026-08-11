-- ============================================================================
-- finance-ids — audit_log entity_type extension
--
-- Phase 2 of the accounting core (vendor bills, loans, partners CRUD) adds
-- write paths for entities `entity_type` doesn't yet cover. Additive only —
-- new enum values, no existing row touched. `ALTER TYPE ... ADD VALUE`
-- cannot run inside the same transaction as other statements that use the
-- new value, but this file only adds values, so it's safe standalone.
-- ============================================================================

alter type entity_type add value 'loan';
alter type entity_type add value 'partner';
