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
