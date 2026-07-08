-- Run this in Supabase SQL Editor to add the Farmer Module tables
-- JITO Green Legacy — Farmer Onboarding Module

-- Enums
DO $$ BEGIN
  CREATE TYPE "Gender"           AS ENUM ('MALE','FEMALE','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "FarmerStatus"     AS ENUM ('REGISTERED','DOCUMENTS_PENDING','DOCUMENTS_VERIFIED','INSPECTION_PENDING','INSPECTION_COMPLETED','APPROVED','ACTIVE','SUSPENDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "LandType"         AS ENUM ('AGRICULTURAL','PRIVATE','WASTELAND','AGROFORESTRY','ORCHARD','COMMUNITY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "PlantationType"   AS ENUM ('AGROFORESTRY','MIYAWAKI','NATIVE_FOREST','FRUIT_TREES','BAMBOO','MIXED_SPECIES'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "DocumentType"     AS ENUM ('AADHAAR','PAN','LAND_7_12','LAND_RECORD','PROPERTY_TAX','OWNERSHIP_PROOF','CONSENT_LETTER','CANCELLED_CHEQUE','PLANTATION_PHOTO','OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "DocStatus"        AS ENUM ('PENDING','VERIFIED','REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "InspectionStatus" AS ENUM ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "PlantationStatus" AS ENUM ('PLANNED','IN_PROGRESS','COMPLETED','MONITORING','COMPLETED_VERIFIED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "FarmerPaymentType" AS ENUM ('PLANTATION_INCENTIVE','MAINTENANCE_INCENTIVE','CARBON_REVENUE','CSR_PAYMENT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "CreditStatus"     AS ENUM ('PENDING','ISSUED','SOLD','RETIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Field Officers
CREATE TABLE IF NOT EXISTS field_officers (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name         TEXT NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  mobile       TEXT UNIQUE NOT NULL,
  password     TEXT NOT NULL,
  "employeeId" TEXT UNIQUE,
  designation  TEXT,
  district     TEXT,
  state        TEXT,
  active       BOOLEAN NOT NULL DEFAULT true,
  "createdAt"  TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Farmers
CREATE TABLE IF NOT EXISTS farmers (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  mobile              TEXT UNIQUE NOT NULL,
  "alternateMobile"   TEXT,
  email               TEXT,
  "otpHash"           TEXT,
  "otpExpiry"         TIMESTAMP,
  "fullName"          TEXT NOT NULL DEFAULT '',
  "fatherName"        TEXT,
  "dateOfBirth"       TIMESTAMP,
  gender              "Gender",
  "aadhaarNumber"     TEXT UNIQUE,
  "panNumber"         TEXT,
  "photoUrl"          TEXT,
  village             TEXT,
  taluka              TEXT,
  district            TEXT,
  state               TEXT,
  pincode             TEXT,
  "bankAccountName"   TEXT,
  "bankName"          TEXT,
  "accountNumber"     TEXT,
  "ifscCode"          TEXT,
  "cancelledChequeUrl" TEXT,
  status              "FarmerStatus" NOT NULL DEFAULT 'REGISTERED',
  "carbonConsent"     BOOLEAN NOT NULL DEFAULT false,
  "assignedOfficerId" TEXT REFERENCES field_officers(id),
  "createdAt"         TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Lands
CREATE TABLE IF NOT EXISTS lands (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "farmerId"            TEXT NOT NULL REFERENCES farmers(id),
  "surveyNumber"        TEXT,
  "gutNumber"           TEXT,
  "khataNumber"         TEXT,
  "areaAcres"           DOUBLE PRECISION,
  "areaHectares"        DOUBLE PRECISION,
  "landType"            "LandType",
  "gpsLatitude"         DOUBLE PRECISION,
  "gpsLongitude"        DOUBLE PRECISION,
  "polygonGeoJson"      JSONB,
  village               TEXT,
  taluka                TEXT,
  district              TEXT,
  state                 TEXT,
  verified              BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt"          TIMESTAMP,
  "verifiedById"        TEXT,
  "plantationPreference" "PlantationType",
  "speciesPreference"   TEXT[] DEFAULT '{}',
  "targetTreeCount"     INTEGER,
  "plantationStartDate" TIMESTAMP,
  "createdAt"           TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Farmer Documents
CREATE TABLE IF NOT EXISTS farmer_documents (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "farmerId"        TEXT NOT NULL REFERENCES farmers(id),
  "landId"          TEXT REFERENCES lands(id),
  "docType"         "DocumentType" NOT NULL,
  "fileUrl"         TEXT NOT NULL,
  "fileName"        TEXT,
  "fileSize"        INTEGER,
  "mimeType"        TEXT,
  status            "DocStatus" NOT NULL DEFAULT 'PENDING',
  "rejectionReason" TEXT,
  "verifiedById"    TEXT,
  "verifiedAt"      TIMESTAMP,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Site Inspections
CREATE TABLE IF NOT EXISTS site_inspections (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "farmerId"              TEXT NOT NULL REFERENCES farmers(id),
  "landId"                TEXT REFERENCES lands(id),
  "officerId"             TEXT NOT NULL REFERENCES field_officers(id),
  "scheduledDate"         TIMESTAMP,
  "inspectedAt"           TIMESTAMP,
  "gpsLatitude"           DOUBLE PRECISION,
  "gpsLongitude"          DOUBLE PRECISION,
  "ownershipVerified"     BOOLEAN NOT NULL DEFAULT false,
  "boundaryVerified"      BOOLEAN NOT NULL DEFAULT false,
  "farmerMetPersonally"   BOOLEAN NOT NULL DEFAULT false,
  "plantationFeasible"    BOOLEAN NOT NULL DEFAULT false,
  "waterSourceAvailable"  BOOLEAN NOT NULL DEFAULT false,
  notes                   TEXT,
  "reportPdfUrl"          TEXT,
  photos                  TEXT[] DEFAULT '{}',
  status                  "InspectionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "createdAt"             TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Plantations
CREATE TABLE IF NOT EXISTS plantations (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "farmerId"        TEXT NOT NULL REFERENCES farmers(id),
  "landId"          TEXT REFERENCES lands(id),
  "projectName"     TEXT,
  "plantationType"  "PlantationType",
  species           TEXT[] DEFAULT '{}',
  "treesPlanted"    INTEGER NOT NULL DEFAULT 0,
  "treesSurviving"  INTEGER NOT NULL DEFAULT 0,
  "plantedDate"     TIMESTAMP,
  "lastMonitored"   TIMESTAMP,
  "survivalRate"    DOUBLE PRECISION,
  "gpsCoordinates"  JSONB,
  photos            TEXT[] DEFAULT '{}',
  notes             TEXT,
  status            "PlantationStatus" NOT NULL DEFAULT 'PLANNED',
  "co2Estimated"    DOUBLE PRECISION,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Farmer Payments
CREATE TABLE IF NOT EXISTS farmer_payments (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "farmerId"    TEXT NOT NULL REFERENCES farmers(id),
  "paymentType" "FarmerPaymentType" NOT NULL,
  amount        DOUBLE PRECISION NOT NULL,
  description   TEXT,
  status        "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "utrNumber"   TEXT,
  "paidAt"      TIMESTAMP,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Carbon Credits
CREATE TABLE IF NOT EXISTS carbon_credits (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "farmerId"      TEXT NOT NULL REFERENCES farmers(id),
  "vintageYear"   INTEGER,
  "creditsIssued" DOUBLE PRECISION,
  "creditsSold"   DOUBLE PRECISION,
  "revenueShared" DOUBLE PRECISION,
  registry        TEXT,
  "serialNumber"  TEXT,
  status          "CreditStatus" NOT NULL DEFAULT 'PENDING',
  "issuedAt"      TIMESTAMP,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "farmerId"  TEXT REFERENCES farmers(id),
  "actorId"   TEXT,
  "actorRole" TEXT,
  action      TEXT NOT NULL,
  details     JSONB,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

SELECT 'Farmer Module tables created successfully ✅' as result;

-- ═══════════════════════════════════════════════════════
-- USER MANAGEMENT ENHANCEMENT — Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS "isActive"       BOOLEAN     NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "isLocked"       BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLoginAt"    TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "loginAttempts"  INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "resetOtpHash"   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "resetOtpExpiry" TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "deletedAt"      TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "deletedById"    TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "deleteReason"   TEXT;

-- Add soft delete to farmers
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "deletedAt"    TIMESTAMP;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "deletedById"  TEXT;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "deleteReason" TEXT;

-- Add new roles to Role enum
DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
  ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'FIELD_OFFICER';
  ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DATA_ENTRY';
  ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PROJECT_MANAGER';
  ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'AUDITOR';
EXCEPTION WHEN others THEN NULL; END $$;

SELECT 'User Management columns added successfully ✅' as result;

-- ═══════════════════════════════════════════════════════
-- FARMER AUTH & TRACKING — Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "password"        TEXT;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "lastLoginAt"     TIMESTAMP;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "createdById"     TEXT;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "updatedById"     TEXT;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "approvedById"    TEXT;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "assignedAdminId" TEXT;

SELECT 'Farmer auth columns added ✅' as result;

-- ═══════════════════════════════════════════════════════
-- LAND OWNER REGISTRATION ENHANCEMENT — Run in Supabase
-- ═══════════════════════════════════════════════════════

-- Farmer new fields
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "farmerIdGenerated" TEXT UNIQUE;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "gisId"             TEXT UNIQUE;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "occupation"        TEXT;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "farmingExperience" TEXT;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "isFarmer"          BOOLEAN DEFAULT false;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "nomineeName"       TEXT;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "nomineeRelation"   TEXT;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "nomineeDob"        TIMESTAMP;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "nomineeMobile"     TEXT;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "nomineeAddress"    TEXT;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "nomineeAadhaar"    TEXT;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "registrationStep"  INTEGER DEFAULT 1;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "draftData"         JSONB;

-- Land new fields
ALTER TABLE lands ADD COLUMN IF NOT EXISTS "surveyGutNumber"  TEXT;
ALTER TABLE lands ADD COLUMN IF NOT EXISTS "areaOfferedAcres" DOUBLE PRECISION;
ALTER TABLE lands ADD COLUMN IF NOT EXISTS "areaOfferedUnit"  TEXT DEFAULT 'acres';
ALTER TABLE lands ADD COLUMN IF NOT EXISTS "pincode"          TEXT;
ALTER TABLE lands ADD COLUMN IF NOT EXISTS "ownershipType"    TEXT DEFAULT 'sole';
ALTER TABLE lands ADD COLUMN IF NOT EXISTS "jointOwnerCount"  INTEGER;
ALTER TABLE lands ADD COLUMN IF NOT EXISTS "nocUploaded"      BOOLEAN DEFAULT false;

SELECT 'Land Owner Registration columns added ✅' as result;

-- ═══════════════════════════════════════════════════════
-- FARMER AGREEMENTS & DOCUMENTS — Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS farmer_agreements (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "farmerId"        TEXT NOT NULL REFERENCES farmers(id),
  "agreementType"   TEXT NOT NULL,
  title             TEXT NOT NULL,
  "generatedHtml"   TEXT,
  "generatedPdfUrl" TEXT,
  "signedPdfUrl"    TEXT,
  status            TEXT NOT NULL DEFAULT 'GENERATED',
  "acknowledgedAt"  TIMESTAMP,
  "signedAt"        TIMESTAMP,
  "generatedById"   TEXT,
  "sharedAt"        TIMESTAMP,
  "templateData"    JSONB,
  notes             TEXT,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- New document types (extend enum if exists)
DO $$ BEGIN
  ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'JOINT_OWNER_NOC';
  ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'PARTICIPATION_AGREEMENT';
  ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'PLANTATION_CERTIFICATE';
  ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'SAPLING_RECEIPT';
  ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'PAYMENT_RECEIPT';
  ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'SIGNED_AGREEMENT';
  ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'SIGNED_NOC';
EXCEPTION WHEN others THEN NULL; END $$;

SELECT 'Farmer agreements table created ✅' as result;

-- Add "Registered by Admin" tracking to farmers
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "registeredById" TEXT;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "registrationNotes" TEXT;

SELECT 'Admin registration tracking columns added ✅' as result;

-- ═══════════════════════════════════════════════════════
-- DONATIONS ENHANCEMENT — Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

ALTER TABLE donations ADD COLUMN IF NOT EXISTS "paymentMode"       TEXT DEFAULT 'ONLINE';
ALTER TABLE donations ADD COLUMN IF NOT EXISTS "paymentBank"       TEXT;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS "paymentBranch"     TEXT;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS "chequeNumber"      TEXT;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS "waMessageSent"     BOOLEAN DEFAULT false;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS "waMessageSentAt"   TIMESTAMP;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS "certificateSent"   BOOLEAN DEFAULT false;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS "certificateSentAt" TIMESTAMP;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS "form80GSent"       BOOLEAN DEFAULT false;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS "notes"             TEXT;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS "refId"             TEXT UNIQUE;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS "createdById"       TEXT;

-- Backfill refId for existing donations
DO $$
DECLARE
  rec RECORD;
  counter INT := 1;
BEGIN
  FOR rec IN SELECT id FROM donations WHERE "refId" IS NULL ORDER BY "createdAt" LOOP
    UPDATE donations SET "refId" = '#JITO-' || LPAD(counter::TEXT, 5, '0') WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

SELECT 'Donation enhancement columns added and refIds backfilled ✅' as result;

-- ═══════════════════════════════════════════════════════
-- PLANTATION SITE MANAGEMENT MODULE — Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS master_projects (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  code        TEXT UNIQUE,
  description TEXT,
  "startDate" TIMESTAMP,
  "endDate"   TIMESTAMP,
  status      TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Drop and recreate plantation_sites with full schema
-- (Safe: run only if you want to rebuild — existing data will be lost)
CREATE TABLE IF NOT EXISTS species_plans (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "siteId"          TEXT NOT NULL,
  species           TEXT NOT NULL,
  "plannedQty"      INTEGER NOT NULL,
  "nurserySource"   TEXT,
  "expectedSurvival" DOUBLE PRECISION,
  "carbonFactor"    DOUBLE PRECISION,
  remarks           TEXT,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS land_assignments (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "siteId"        TEXT NOT NULL,
  "farmerId"      TEXT NOT NULL,
  "landId"        TEXT,
  "treesAssigned" INTEGER NOT NULL,
  "speciesAlloc"  JSONB,
  "plantationDate" TIMESTAMP,
  remarks         TEXT,
  stage           TEXT NOT NULL DEFAULT 'ASSIGNED',
  "treesPlanted"  INTEGER NOT NULL DEFAULT 0,
  "treesSurviving" INTEGER NOT NULL DEFAULT 0,
  "lastMonitored" TIMESTAMP,
  "consentSigned" BOOLEAN DEFAULT false,
  "consentDate"   TIMESTAMP,
  "assignedById"  TEXT,
  "assignedAt"    TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("siteId","landId")
);

CREATE TABLE IF NOT EXISTS land_stage_history (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "assignmentId" TEXT NOT NULL,
  stage         TEXT NOT NULL,
  date          TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedById" TEXT,
  photos        TEXT[] DEFAULT '{}',
  remarks       TEXT
);

CREATE TABLE IF NOT EXISTS plantation_activities (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "siteId"      TEXT NOT NULL,
  date          TIMESTAMP NOT NULL,
  "activityType" TEXT NOT NULL,
  description   TEXT,
  team          TEXT,
  workers       INTEGER,
  "treesPlanted" INTEGER,
  photos        TEXT[] DEFAULT '{}',
  documents     TEXT[] DEFAULT '{}',
  remarks       TEXT,
  "loggedById"  TEXT,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monitoring_visits (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "siteId"        TEXT NOT NULL,
  "assignmentId"  TEXT,
  "farmerId"      TEXT,
  "visitDate"     TIMESTAMP NOT NULL,
  "officerId"     TEXT,
  "survivalCount" INTEGER,
  "deadTrees"     INTEGER,
  "diseaseNotes"  TEXT,
  "avgHeight"     DOUBLE PRECISION,
  photos          TEXT[] DEFAULT '{}',
  "gpsLat"        DOUBLE PRECISION,
  "gpsLng"        DOUBLE PRECISION,
  recommendations TEXT,
  "survivalPct"   DOUBLE PRECISION,
  "mortalityPct"  DOUBLE PRECISION,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carbon_monitoring (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "siteId"         TEXT NOT NULL,
  methodology      TEXT,
  "creditingPeriod" INTEGER,
  vintage          TEXT,
  "monitoringPeriod" TEXT,
  baseline         DOUBLE PRECISION,
  additionality    DOUBLE PRECISION,
  leakage          DOUBLE PRECISION,
  "bufferPool"     DOUBLE PRECISION,
  "registryStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  "registryLink"   TEXT,
  "totalCredits"   DOUBLE PRECISION,
  "issuedCredits"  DOUBLE PRECISION,
  "pendingCredits" DOUBLE PRECISION,
  notes            TEXT,
  "updatedAt"      TIMESTAMP NOT NULL DEFAULT NOW(),
  "createdAt"      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timeline_events (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "siteId"    TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  "eventDate" TIMESTAMP NOT NULL DEFAULT NOW(),
  attachments TEXT[] DEFAULT '{}',
  "createdById" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_documents (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "siteId"     TEXT NOT NULL,
  folder       TEXT NOT NULL,
  "fileName"   TEXT NOT NULL,
  "fileUrl"    TEXT NOT NULL,
  "fileSize"   INTEGER,
  version      INTEGER NOT NULL DEFAULT 1,
  "uploadedById" TEXT,
  "uploadedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_notifications (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "siteId"  TEXT NOT NULL,
  type      TEXT NOT NULL,
  message   TEXT NOT NULL,
  severity  TEXT NOT NULL DEFAULT 'INFO',
  read      BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add new columns to plantation_sites if it already exists
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "projectId"          TEXT;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "siteCode"           TEXT UNIQUE;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "internalRef"        TEXT;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "description"        TEXT;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "state"              TEXT;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "district"           TEXT;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "taluka"             TEXT;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "village"            TEXT;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "gpsLatitude"        DOUBLE PRECISION;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "gpsLongitude"       DOUBLE PRECISION;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "totalPlannedArea"   DOUBLE PRECISION;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "currentPhase"       TEXT DEFAULT 'PLANNING';
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "plantationPartner"  TEXT;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "implementingAgency" TEXT;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "fieldOfficerId"     TEXT;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "supervisorId"       TEXT;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "carbonConsultant"   TEXT;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "auditor"            TEXT;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "nursery"            TEXT;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "plantationSeason"   TEXT;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "startDate"          TIMESTAMP;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "endDate"            TIMESTAMP;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "totalFarmers"       INTEGER;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "plannedArea"        DOUBLE PRECISION;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "plannedTrees"       INTEGER;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "estimatedCarbon"    DOUBLE PRECISION;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "estimatedCredits"   DOUBLE PRECISION;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "expectedSurvival"   DOUBLE PRECISION;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "budget"             DOUBLE PRECISION;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "treesPlanted"       INTEGER DEFAULT 0;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "treesSurviving"     INTEGER DEFAULT 0;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "survivalRate"       DOUBLE PRECISION;
ALTER TABLE plantation_sites ADD COLUMN IF NOT EXISTS "updatedAt"          TIMESTAMP DEFAULT NOW();

-- Seed the master project
INSERT INTO master_projects (id, name, code, status)
VALUES ('jgl-main-project', 'JITO Green Legacy', 'JGL-2026', 'ACTIVE')
ON CONFLICT (code) DO NOTHING;

SELECT 'Plantation Site Management Module created ✅' as result;

-- ═══════════════════════════════════════════════════════
-- LAND DETAIL ENHANCEMENTS — Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

ALTER TABLE lands ADD COLUMN IF NOT EXISTS "waterAvailability" TEXT;
ALTER TABLE lands ADD COLUMN IF NOT EXISTS "securityStatus"    TEXT;

SELECT 'Land enhancements added ✅' as result;

-- ═══════════════════════════════════════════════════════
-- FIX: Make location column nullable in plantation_sites
-- ═══════════════════════════════════════════════════════
ALTER TABLE plantation_sites ALTER COLUMN location DROP NOT NULL;

SELECT 'location column is now nullable ✅' as result;
