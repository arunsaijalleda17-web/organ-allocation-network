-- ============================================================================
-- NATIONAL ORGAN ALLOCATION NETWORK
-- Clinical Schema & Automated Allocation RPC Engine
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Donors Table
CREATE TABLE IF NOT EXISTS donors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    age INT NOT NULL,
    blood_group TEXT NOT NULL,
    consent BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Recipients Table (Waitlist)
CREATE TABLE IF NOT EXISTS recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    age INT NOT NULL,
    blood_group TEXT NOT NULL,
    organ_needed TEXT NOT NULL,
    urgency TEXT NOT NULL, -- 'Critical', 'High', 'Medium', 'Low'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Available Organs Table
CREATE TABLE IF NOT EXISTS organs_available (
    id TEXT PRIMARY KEY,
    organ_type TEXT NOT NULL,
    blood_group TEXT NOT NULL,
    hospital TEXT NOT NULL,
    recovery_time TIMESTAMPTZ DEFAULT NOW()
);

-- Backward compatibility view for legacy queries
CREATE OR REPLACE VIEW available_organs AS SELECT id AS organ_id, organ_type, blood_group, hospital AS procurement_hospital, recovery_time FROM organs_available;
CREATE OR REPLACE VIEW waitlist_candidates AS SELECT id AS candidate_id, full_name, organ_needed, blood_group, urgency AS urgency_status, urgency AS urgency_tier FROM recipients;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enables anonymous read and insert permissions for clinical operations
-- ============================================================================
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE organs_available ENABLE ROW LEVEL SECURITY;

-- Select policies
CREATE POLICY "Allow public select on donors" ON donors FOR SELECT USING (true);
CREATE POLICY "Allow public select on recipients" ON recipients FOR SELECT USING (true);
CREATE POLICY "Allow public select on organs_available" ON organs_available FOR SELECT USING (true);

-- Insert policies (Form Submissions)
CREATE POLICY "Allow public insert on donors" ON donors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on recipients" ON recipients FOR INSERT WITH CHECK (true);

-- ============================================================================
-- RPC FUNCTION: find_matches_for_organ
-- Parameter: p_organ_id (TEXT)
-- Returns: Ranked list of matched candidates from active waitlist
-- ============================================================================
CREATE OR REPLACE FUNCTION find_matches_for_organ(p_organ_id TEXT)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    organ_needed TEXT,
    blood_group TEXT,
    urgency TEXT,
    score NUMERIC(5, 1)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_organ_type TEXT;
    v_blood_group TEXT;
BEGIN
    -- Query organ specs
    SELECT o.organ_type, o.blood_group
    INTO v_organ_type, v_blood_group
    FROM organs_available o
    WHERE o.id = p_organ_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Return filtered, scored, and ranked recipients
    RETURN QUERY
    SELECT 
        r.id,
        r.full_name,
        r.organ_needed,
        r.blood_group,
        r.urgency,
        ROUND(
            CAST(
                -- Base Urgency Weighting
                (CASE 
                    WHEN r.urgency = 'Critical' THEN 58.0
                    WHEN r.urgency = 'High' THEN 44.0
                    WHEN r.urgency = 'Medium' THEN 32.0
                    ELSE 18.0
                END)
                -- ABO Biological Exact Match Bonus vs Compatible
                + (CASE 
                    WHEN r.blood_group = v_blood_group THEN 25.0
                    ELSE 15.0
                END)
                -- Age Priority Adjustment
                + (CASE 
                    WHEN r.age < 18 THEN 15.0
                    WHEN r.age < 40 THEN 10.0
                    ELSE 5.0
                END)
            AS NUMERIC),
            1
        ) AS score
    FROM recipients r
    WHERE 
      -- Organ Type Match
      (
          LOWER(r.organ_needed) LIKE '%' || LOWER(SPLIT_PART(v_organ_type, ' ', 1)) || '%'
          OR LOWER(v_organ_type) LIKE '%' || LOWER(SPLIT_PART(r.organ_needed, ' ', 1)) || '%'
      )
      -- ABO Histocompatibility Matrix
      AND (
          (v_blood_group = 'O-' AND r.blood_group IN ('O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+')) OR
          (v_blood_group = 'O+' AND r.blood_group IN ('O+', 'A+', 'B+', 'AB+')) OR
          (v_blood_group = 'A-' AND r.blood_group IN ('A-', 'A+', 'AB-', 'AB+')) OR
          (v_blood_group = 'A+' AND r.blood_group IN ('A+', 'AB+')) OR
          (v_blood_group = 'B-' AND r.blood_group IN ('B-', 'B+', 'AB-', 'AB+')) OR
          (v_blood_group = 'B+' AND r.blood_group IN ('B+', 'AB+')) OR
          (v_blood_group = 'AB-' AND r.blood_group IN ('AB-', 'AB+')) OR
          (v_blood_group = 'AB+' AND r.blood_group IN ('AB+'))
      )
    ORDER BY score DESC;
END;
$$;

-- ============================================================================
-- SEED DATA (For Immediate Demonstration)
-- ============================================================================
INSERT INTO organs_available (id, organ_type, blood_group, hospital)
VALUES
('ORG-8921', 'Kidney', 'O+', 'Johns Hopkins Comprehensive Center'),
('ORG-7704', 'Heart', 'A+', 'Cleveland Clinic Main Campus'),
('ORG-9932', 'Liver', 'B+', 'Mayo Clinic Hospital'),
('ORG-6541', 'Lungs', 'O-', 'Massachusetts General Hospital'),
('ORG-4180', 'Pancreas', 'AB+', 'Cedars-Sinai Medical Center')
ON CONFLICT (id) DO NOTHING;

INSERT INTO recipients (full_name, age, blood_group, organ_needed, urgency)
VALUES
('Elena Rostova', 34, 'O+', 'Kidney', 'Critical'),
('Marcus Vance', 46, 'O+', 'Kidney', 'High'),
('Aisha Al-Mansoor', 29, 'A+', 'Kidney', 'High'),
('David Henderson', 52, 'B+', 'Kidney', 'Medium'),
('Chloe Lin', 41, 'AB+', 'Kidney', 'Low'),
('Robert Sterling', 58, 'A+', 'Heart', 'Critical'),
('Sophia Chen', 37, 'AB+', 'Heart', 'High'),
('William Alvarez', 61, 'A+', 'Heart', 'Medium'),
('Tariq O''Connor', 45, 'B+', 'Liver', 'Critical'),
('Hannah Brooks', 33, 'AB+', 'Liver', 'High'),
('Nadia Petrova', 28, 'O-', 'Lungs', 'Critical'),
('Daniel Thorne', 50, 'O+', 'Lungs', 'High'),
('Grace Miller', 42, 'AB+', 'Pancreas', 'High')
ON CONFLICT DO NOTHING;
