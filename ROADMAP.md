# GitFolder Extension - Roadmap

## ✅ Completed Features (v1.0)

- [x] Custom group management (create, delete, rename)
- [x] Add/remove files to/from groups
- [x] Mark files as local-only (exclude from staging)
- [x] Stage/unstage individual and bulk operations
- [x] Staged changes view
- [x] Full commit workflow with validation
- [x] AI-powered commit message generation
- [x] Open changes (diff view)
- [x] Open file directly
- [x] Discard changes with confirmation
- [x] Move files between groups
- [x] Branch name display in status bar
- [x] Branch picker/switcher

## 🚧 Planned Features (v2.0)

### Partial/Selective Staging (High Priority)
**Problem**: Currently, when you stage a file from a group, the entire file is staged. But what if you only want to stage specific changes from that file?

**Use Case**: 
```
File: LoginController.java

Changes:
Line 10-15: Add authentication logic → belongs to "Auth Feature" group
Line 50-55: Fix typo → belongs to "Bugfixes" group  
Line 100-105: Debug logging → belongs to "Local Changes" (local-only)

Goal: Stage ONLY the authentication logic from "Auth Feature" group
```

**Implementation Plan**:

1. **Store Hunk/Line Information** ✅ (Data structure ready in StorageManager)
   ```typescript
   interface FileItem {
     path: string;
     isLocal: boolean;
     hunks?: HunkSelection[];  // Which hunks belong to this group
   }
   ```

2. **Parse Git Diff**
   - Use git diff to get hunks for each changed file
   - Display hunks in a custom UI
   - Allow user to select which hunks belong to which group

3. **Hunk Selection UI**
   - Add "Select Changes" command for files in groups
   - Show diff with selectable hunks
   - Checkboxes for each hunk
   - Assign selected hunks to current group

4. **Selective Staging**
   - When staging from a group, create a patch file
   - Include only the hunks that belong to that group
   - Use `git apply --cached` to stage the partial changes

5. **Visual Indicators**
   - Show "(partial)" badge for files with multiple group assignments
   - Display hunk count in file decoration
   - Different icon for partially-staged files

**Technical Approach**:
```typescript
// 1. Get diff for file
const diff = await git.diff([file.path]);

// 2. Parse diff into hunks
const hunks = parseDiff(diff);

// 3. Store hunk selection per group
await storageManager.addFileWithHunks(groupId, filePath, selectedHunkIndexes);

// 4. On stage, create patch with only selected hunks
const patch = createPatchFromHunks(hunks, selectedHunkIndexes);
await git.apply(patch, { cached: true });
```

**Challenges**:
- Git diff parsing can be complex
- Need to handle merge conflicts
- Performance with large diffs
- UI/UX for hunk selection

**Alternative Simple Approach** (Phase 1):
- Allow same file in multiple groups
- Each group "claims" the file
- When staging from Group A:
  - Prompt user: "File.java is also in Group B. Stage entire file or select changes?"
  - If "select changes", open diff with hunk selector
  - If "entire file", stage all changes

### Other Planned Features

- [ ] **Export/Import Groups**
  - Export group configurations to JSON
  - Share group setups with team
  - Import predefined group structures

- [ ] **Group Templates**
  - Predefined group setups (e.g., "Frontend", "Backend", "Tests")
  - One-click group creation from templates

- [ ] **Color Coding**
  - Assign colors to groups
  - Visual distinction in SCM view

- [ ] **Keyboard Shortcuts**
  - Quick group switching
  - Fast file assignment
  - Rapid staging/unstaging

- [ ] **Auto-grouping Rules**
  - Automatically assign files to groups based on path patterns
  - Example: `src/test/**` → "Tests" group

- [ ] **Commit Per Group**
  - One-click: stage group → generate message → commit
  - Batch commit multiple groups

- [ ] **Git Stash Integration**
  - Convert groups to stashes
  - Restore stashes as groups

- [ ] **Statistics & Insights**
  - Track commits per group
  - Show group change history
  - Most active groups

## 📋 Technical Debt

- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Improve error handling
- [ ] Add telemetry/analytics
- [ ] Performance optimization for large repos
- [ ] Better TypeScript types (reduce 'any' usage)

## 🎯 Version Roadmap

- **v1.0** (Current) - Core functionality + basic git operations
- **v1.1** - Branch management + UI improvements
- **v2.0** - Partial staging + advanced features
- **v2.1** - Templates + auto-grouping
- **v3.0** - Team collaboration features

## 💡 Community Requests

(This section will be populated based on user feedback)

---

**Note**: Partial staging is a complex feature that requires significant development. We're starting with v1.0 that has full file-level staging, and will implement hunk-level staging in v2.0 based on user feedback and demand.
