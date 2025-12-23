-- 1. Collation der Tabelle `defaults` anpassen
ALTER TABLE defaults
  CONVERT TO CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

-- 2. Foreign Key von `users.defaults_id` auf `defaults.defaults_id` hinzufügen
ALTER TABLE users
  ADD CONSTRAINT fk_users_defaults
  FOREIGN KEY (defaults_id) REFERENCES defaults (defaults_id);