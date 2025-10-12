# NULL Results Feature

## Overview

This feature allows admins to save NULL values for candidate results in the following scenarios:
1. **Inactive candidates** - automatically set to NULL when saving results
2. **Empty fields** - admin can leave result fields empty, which saves as NULL
3. **Clearing results** - admin can clear a previously saved result by emptying the field

## Implementation Details

### Database Changes

The `results` table now allows NULL values for `actual_score`:

```sql
actual_score NUMERIC(3,1) CHECK (actual_score IS NULL OR (actual_score >= 1 AND actual_score <= 10.5))
```

### Frontend Changes ([app/admin/page.tsx](app/admin/page.tsx))

1. **Validation logic updated** (lines 107-120):
   - Removed requirement for all active candidates to have values
   - Only validates that filled fields contain valid numbers (1-10.5)
   - Empty fields are allowed

2. **Save logic updated** (lines 122-129):
   - Sends **all candidates** (not just active ones)
   - Active candidates with empty fields → NULL
   - Inactive candidates → NULL
   - Active candidates with values → parsed number

3. **UI improvements** (lines 237-266):
   - Info message explaining that fields can be left empty
   - Placeholder updated to indicate empty is allowed
   - Shows list of inactive candidates that will be set to NULL
   - Clear visual feedback about what will happen

### Backend Changes ([app/api/admin/results/route.ts](app/api/admin/results/route.ts))

1. **Batch upsert** (lines 69-86):
   - Accepts all candidates including those with NULL values
   - Single upsert operation for better performance
   - Properly handles NULL values in the database

### Winner Detection ([app/api/admin/winner/route.ts](app/api/admin/winner/route.ts))

The winner detection already handles NULL values correctly:
- Only includes results where `actual_score !== null` (line 36)
- Compares votes only against candidates with actual scores
- NULL results are automatically excluded from comparison

## Migration

For existing databases, run [ALLOW_NULL_RESULTS.sql](ALLOW_NULL_RESULTS.sql):

```sql
ALTER TABLE results DROP CONSTRAINT IF EXISTS results_actual_score_check;
ALTER TABLE results ADD CONSTRAINT results_actual_score_check
  CHECK (actual_score IS NULL OR (actual_score >= 1 AND actual_score <= 10.5));
```

## User Flow

### Scenario 1: Saving with empty fields
1. Admin marks candidates as active/inactive
2. Admin enters results for some candidates, leaves others empty
3. Clicks "שמור תוצאות"
4. System saves:
   - Filled active candidates → numeric values
   - Empty active candidates → NULL
   - All inactive candidates → NULL

### Scenario 2: Clearing a result
1. Admin has previously saved results
2. Admin clears a field (deletes the value)
3. Clicks "שמור תוצאות"
4. That candidate's result is set to NULL

### Scenario 3: Deactivating a candidate
1. Admin unchecks a candidate (marks as inactive)
2. Field disappears from results form
3. Clicks "שמור תוצאות"
4. That candidate's result is automatically set to NULL

## Testing

To test this feature:

1. **Test empty fields**:
   ```
   - Mark 3 candidates as active
   - Fill only 2 of them
   - Save and check database
   - Expected: 2 have values, 1 has NULL
   ```

2. **Test inactive candidates**:
   ```
   - Mark 1 candidate as inactive
   - Save results
   - Check database
   - Expected: Inactive candidate has NULL
   ```

3. **Test clearing results**:
   ```
   - Save results with all values filled
   - Clear one field
   - Save again
   - Expected: Cleared field now has NULL
   ```

4. **Test winner detection**:
   ```
   - Save results with some NULL values
   - Click "מי הראשון?"
   - Expected: Only non-NULL results are compared
   ```

## Benefits

1. **Flexibility** - Admins don't need to fill all fields immediately
2. **Accuracy** - NULL clearly indicates "no result" vs a score of 0
3. **Workflow** - Can save partial results and complete later
4. **Data integrity** - Inactive candidates automatically cleared
