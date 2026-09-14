-- 001_init_schema_and_constraints.sql
-- Enables btree_gist extension and defines tables with exclusion constraints

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS gates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    terminal TEXT NOT NULL,
    compatible_aircraft TEXT[] NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crews (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    qualifications TEXT[] NOT NULL,
    current_terminal TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flights (
    id TEXT PRIMARY KEY,
    flight_number TEXT NOT NULL,
    aircraft_type TEXT NOT NULL,
    scheduled_arrival TIMESTAMPTZ NOT NULL,
    estimated_arrival TIMESTAMPTZ NOT NULL,
    scheduled_departure TIMESTAMPTZ NOT NULL,
    estimated_departure TIMESTAMPTZ NOT NULL,
    actual_departure TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'scheduled',
    gate_id TEXT REFERENCES gates(id),
    crew_id TEXT REFERENCES crews(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS baggage_routes (
    id TEXT PRIMARY KEY,
    flight_id TEXT NOT NULL REFERENCES flights(id),
    source_gate_id TEXT NOT NULL REFERENCES gates(id),
    destination_carousel TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'routed',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    resource_id TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    flight_id TEXT NOT NULL REFERENCES flights(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    time_range tstzrange GENERATED ALWAYS AS (tstzrange(start_time, end_time, '[)')) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT no_overlapping_assignments EXCLUDE USING gist (resource_id WITH =, time_range WITH &&)
);

CREATE TABLE IF NOT EXISTS impact_events (
    id TEXT PRIMARY KEY,
    root_flight_id TEXT NOT NULL,
    affected_flight_id TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    old_resource_id TEXT,
    new_resource_id TEXT,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful indices for rapid query response
CREATE INDEX IF NOT EXISTS idx_assignments_resource ON assignments(resource_id, resource_type);
CREATE INDEX IF NOT EXISTS idx_assignments_flight ON assignments(flight_id);
CREATE INDEX IF NOT EXISTS idx_impact_root ON impact_events(root_flight_id);
CREATE INDEX IF NOT EXISTS idx_impact_created ON impact_events(created_at DESC);
