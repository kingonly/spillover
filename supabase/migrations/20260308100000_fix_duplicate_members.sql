-- Fix duplicate members created by mobile OAuth returning email instead of github_handle.
-- Merge duplicates: keep the row that has a github_handle, delete the email-only duplicate.

-- Update the email-only duplicate's data into the canonical row (the one with github_handle)
UPDATE members m
SET email = dup.email
FROM members dup
WHERE m.project_id = dup.project_id
  AND m.github_handle != ''
  AND dup.github_handle = ''
  AND dup.email != ''
  AND m.email = ''
  AND dup.email = (
    SELECT u.email FROM members u
    WHERE u.project_id = m.project_id
      AND u.user_id = dup.user_id
    LIMIT 1
  );

-- Reassign tasks from duplicate user_id to canonical user_id
UPDATE tasks t
SET submitted_by = canonical.user_id
FROM members dup
JOIN members canonical
  ON canonical.project_id = dup.project_id
  AND canonical.github_handle != ''
  AND (canonical.email = dup.email OR canonical.email = dup.user_id)
WHERE dup.github_handle = ''
  AND dup.project_id = t.project_id
  AND t.submitted_by = dup.user_id;

UPDATE tasks t
SET assigned_to = canonical.user_id
FROM members dup
JOIN members canonical
  ON canonical.project_id = dup.project_id
  AND canonical.github_handle != ''
  AND (canonical.email = dup.email OR canonical.email = dup.user_id)
WHERE dup.github_handle = ''
  AND dup.project_id = t.project_id
  AND t.assigned_to = dup.user_id;

-- Delete the duplicate email-only members where a github_handle member exists
DELETE FROM members dup
USING members canonical
WHERE dup.project_id = canonical.project_id
  AND dup.id != canonical.id
  AND dup.github_handle = ''
  AND canonical.github_handle != ''
  AND (dup.email = canonical.email OR dup.user_id = canonical.email);

-- Add partial unique index to prevent future duplicates by github_handle
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_project_github
  ON members(project_id, github_handle)
  WHERE github_handle != '';

-- Add partial unique index to prevent future duplicates by email
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_project_email
  ON members(project_id, email)
  WHERE email != '';
