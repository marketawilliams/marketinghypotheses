-- Add category column to hypotheses
ALTER TABLE hypotheses
  ADD COLUMN IF NOT EXISTS category TEXT
    CHECK (category IN ('social', 'website', 'bd_gtm', 'other'));

-- Allow title_change and category_change in update history
ALTER TABLE hypothesis_updates
  DROP CONSTRAINT IF EXISTS hypothesis_updates_update_type_check;

ALTER TABLE hypothesis_updates
  ADD CONSTRAINT hypothesis_updates_update_type_check
    CHECK (update_type IN (
      'status_change', 'priority_change', 'note_added',
      'created', 'title_change', 'category_change'
    ));
