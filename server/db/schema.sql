-- Bharat Scheme: MySQL 8 DDL. Used by the "mysql" driver (set MYSQL_URL). Apply with:
--   mysql -u <user> -p <database> < db/schema.sql
-- Then run `npm run seed` (with MYSQL_URL set) to load demo users and schemes.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id            CHAR(36)     PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role          ENUM('user','admin') NOT NULL DEFAULT 'user',
  fcm_token     VARCHAR(512) NULL,
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS households (
  id            CHAR(36)    PRIMARY KEY,
  user_id       CHAR(36)    NOT NULL UNIQUE,
  state         VARCHAR(80) NULL,
  district      VARCHAR(80) NULL,
  annual_income INT         NULL,
  family_size   TINYINT     NULL,
  area          ENUM('rural','urban') NULL,
  category      ENUM('general','obc','sc','st','ews') NULL,
  bpl_card      TINYINT(1)  NULL,
  owns_house    TINYINT(1)  NULL,
  ration_card   TINYINT(1)  NULL,
  updated_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS members (
  id                 CHAR(36)     PRIMARY KEY,
  household_id       CHAR(36)     NULL,
  user_id            CHAR(36)     NOT NULL,
  name               VARCHAR(100) NOT NULL,
  relation           ENUM('self','spouse','child','parent','sibling','other') NOT NULL,
  age                TINYINT UNSIGNED NOT NULL,
  gender             ENUM('male','female','other') NOT NULL DEFAULT 'other',
  occupation         ENUM('farmer','student','salaried','self-employed','unemployed','homemaker','daily-wage','retired') NOT NULL DEFAULT 'unemployed',
  education          ENUM('none','primary','secondary','higher-secondary','graduate','postgraduate') NOT NULL DEFAULT 'none',
  is_student         TINYINT(1)   NOT NULL DEFAULT 0,
  study_level        ENUM('school','pre-matric','post-matric','ug','pg') NULL,
  land_holding_acres DECIMAL(10,2) NULL,
  is_widow           TINYINT(1)   NOT NULL DEFAULT 0,
  has_disability     TINYINT(1)   NULL,            -- NULL unless sensitive_consent
  disability_percent TINYINT UNSIGNED NULL,        -- NULL unless sensitive_consent
  consent_given      TINYINT(1)   NOT NULL DEFAULT 1,
  sensitive_consent  TINYINT(1)   NOT NULL DEFAULT 0,
  created_at         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_members_user (user_id),
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS categories (
  id       VARCHAR(40)  PRIMARY KEY,
  label_en VARCHAR(100) NOT NULL,
  label_ta VARCHAR(100) NOT NULL
) CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS schemes (
  id            VARCHAR(100) PRIMARY KEY,
  name_en       VARCHAR(255) NOT NULL,
  name_ta       VARCHAR(255) NOT NULL DEFAULT '',
  ministry      VARCHAR(255) NOT NULL DEFAULT '',
  level         ENUM('central','state') NOT NULL,
  state         VARCHAR(80)  NULL,
  category      VARCHAR(40)  NOT NULL,
  summary       JSON         NOT NULL,   -- {en, ta}
  benefits      JSON         NOT NULL,   -- {en:[], ta:[]}
  documents     JSON         NOT NULL,   -- [string]
  how_to_apply  JSON         NOT NULL,   -- {en:[], ta:[]}
  official_url  VARCHAR(500) NULL,
  source_url    VARCHAR(500) NULL,
  last_verified DATE         NULL,
  data_status   VARCHAR(40)  NOT NULL DEFAULT 'demo-curated',
  deadline      DATE         NULL,
  origin        ENUM('file','admin') NOT NULL DEFAULT 'file',
  admin_edited  TINYINT(1)   NOT NULL DEFAULT 0,
  added_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_schemes_category (category),
  KEY idx_schemes_level (level, state)
) CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS scheme_rules (
  scheme_id VARCHAR(100) NOT NULL,
  id        VARCHAR(40)  NOT NULL,
  position  SMALLINT     NOT NULL DEFAULT 0,
  field     VARCHAR(60)  NOT NULL,
  op        ENUM('eq','neq','lte','gte','lt','gt','in','true','false') NOT NULL,
  value     JSON         NULL,
  label_en  VARCHAR(500) NOT NULL DEFAULT '',
  label_ta  VARCHAR(500) NOT NULL DEFAULT '',
  PRIMARY KEY (scheme_id, id),
  FOREIGN KEY (scheme_id) REFERENCES schemes(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS tracker_items (
  id             CHAR(36)    PRIMARY KEY,
  user_id        CHAR(36)    NOT NULL,
  scheme_id      VARCHAR(100) NOT NULL,
  member_id      CHAR(36)    NOT NULL,
  status         ENUM('interested','started','submitted','verification','approved','rejected') NOT NULL DEFAULT 'interested',
  notes          TEXT        NULL,
  documents_done JSON        NULL,
  reminder_at    DATETIME(3) NULL,
  created_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_tracker (user_id, scheme_id, member_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS tracker_history (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  tracker_id CHAR(36)    NOT NULL,
  status     VARCHAR(20) NOT NULL,
  at         DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_history_tracker (tracker_id),
  FOREIGN KEY (tracker_id) REFERENCES tracker_items(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id         CHAR(36)    PRIMARY KEY,
  user_id    CHAR(36)    NOT NULL,
  kind       ENUM('new-scheme','deadline','missing-documents') NOT NULL,
  key_text   VARCHAR(200) NOT NULL,            -- dedupe key, unique per user
  scheme_id  VARCHAR(100) NULL,
  title      JSON        NOT NULL,             -- {en, ta}
  body       JSON        NOT NULL,             -- {en, ta}
  read_at    DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_notification (user_id, key_text),
  KEY idx_notifications_user (user_id, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS recommendation_runs (
  id             CHAR(36)    PRIMARY KEY,
  user_id        CHAR(36)    NULL,             -- NULL for guest runs
  state          VARCHAR(80) NULL,
  member_count   SMALLINT    NOT NULL DEFAULT 0,
  eligible_count INT         NOT NULL DEFAULT 0,
  likely_count   INT         NOT NULL DEFAULT 0,
  matches        JSON        NOT NULL,         -- [{schemeId, category, status}] eligible/likely only; no personal data
  created_at     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_runs_created (created_at)
) CHARACTER SET utf8mb4;
