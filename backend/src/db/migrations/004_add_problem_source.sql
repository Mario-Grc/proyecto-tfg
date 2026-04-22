ALTER TABLE problems
ADD COLUMN source TEXT NOT NULL DEFAULT 'seed' CHECK (source IN ('seed', 'user'));
