PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS student_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    student_no TEXT NOT NULL UNIQUE,
    program TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS queue_entries (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    student_no TEXT NOT NULL,
    name TEXT NOT NULL,
    window TEXT NOT NULL DEFAULT 'Window 3',
    status TEXT NOT NULL DEFAULT 'Waiting' CHECK (status IN ('Waiting', 'Serving', 'Completed', 'Skipped')),
    wait_minutes INTEGER NOT NULL DEFAULT 0,
    queue_number INTEGER NOT NULL,
    joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS application_records (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    student_no TEXT NOT NULL,
    name TEXT NOT NULL,
    application_type TEXT NOT NULL DEFAULT 'New ID',
    status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Processing', 'Ready for Claim', 'Claimed', 'Rejected')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS id_applications (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    application_type TEXT NOT NULL CHECK (application_type IN ('New ID', 'Replacement ID')),
    date_applied TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS id_status_records (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Submitted', 'Processing', 'Ready for Claim', 'Claimed')),
    updated_by TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES id_applications(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES student_accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS queue_registrations (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    application_id TEXT NOT NULL,
    queue_number INTEGER NOT NULL,
    window TEXT NOT NULL DEFAULT 'Window 3',
    registered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'Waiting' CHECK (status IN ('Waiting', 'Serving', 'Completed', 'Skipped')),
    FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES id_applications(id) ON DELETE CASCADE,
    UNIQUE (registered_at, queue_number)
);

CREATE TABLE IF NOT EXISTS queue_transactions (
    id TEXT PRIMARY KEY,
    queue_registration_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    staff_id TEXT,
    transaction_status TEXT NOT NULL CHECK (transaction_status IN ('Completed', 'Skipped')),
    transaction_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (queue_registration_id) REFERENCES queue_registrations(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES student_accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_id_applications_student
    ON id_applications(student_id);

CREATE INDEX IF NOT EXISTS idx_id_status_records_application
    ON id_status_records(application_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_queue_registrations_status
    ON queue_registrations(status, registered_at);

CREATE INDEX IF NOT EXISTS idx_queue_transactions_registration
    ON queue_transactions(queue_registration_id, transaction_at);