# Implementation Notes

## 1. What I changed

- **diff bug:** Fixed `diff.util.ts` so it checks for quantity and description changes, not just price.
- **Permissions:** Updated `canApprove` and `canReject` in `cr-detail.component.ts` to actually check the user's policies using `canApprovePolicy`.
- **Status Filter:** Updated `visibleRows` in `cr-list.component.ts` to filter the list based on the selected status.
- **Timeline:** Sorted the audit array by timestamp (oldest first) in the getter.
- **Reject Validation:** Added `Validators.required` to the form control. The button disables automatically when it's empty.
- **Approve/Reject:** Implemented the API calls with try/catch, added a `submitting` flag to prevent double clicks, and handled updating the local state afterwards.
- **Hiding Actions:** Used `*ngIf="hasApprovePermission"` to completely hide the action buttons for read-only users.

## 2. Component & state model

- List component on the left, detail component on the right.
- Both use a `ViewState` wrapper (`idle`, `loading`, `loaded`, `error`) so the UI handles loading/errors easily.

## 3. Invariants I keep

- Only users with `cr_a_*` policies see the approve/reject buttons.
- Can't double click approve/reject (guarded by `submitting` flag).
- Must provide a reason to reject.

## 4. Testing strategy

- Added unit tests for the diff logic to make sure all field changes are caught.
- Added component tests to verify the UI changes (like the filter working, action buttons hiding for viewers, and error states).

## 5. Assumptions

- Assuming read-only means no `cr_a_` policies.
- Assuming we hide the action section completely for viewers rather than just disabling the buttons.

## 6. Where I used AI

- Used it to double check some test setup syntax and generate some ideas for edge cases to test and understand the structure deeply.

## 7. What I'd improve with more time

- Add a real confirmation dialog before approving/rejecting.
- Add toast notifications so the user knows an action succeeded.
