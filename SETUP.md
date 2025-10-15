# Setup Instructions

## Menyembunyikan Git Default

Untuk menggantikan tampilan git changes dengan GitFolder sepenuhnya:

1. **Tekan F5** untuk run extension development host
2. Di window yang terbuka (Extension Development Host):
   - Tekan `Ctrl+Shift+P` / `Cmd+Shift+P`
   - Ketik **"Preferences: Open User Settings (JSON)"**
   - Tambahkan:
     ```json
     {
       "git.enabled": false
     }
     ```
   - Save file
3. Reload window: `Ctrl+Shift+P` → "Developer: Reload Window"
4. Buka Source Control (`Ctrl+Shift+G`)
5. Sekarang hanya **Git (GitFolder)** yang muncul!

## Struktur SCM View

Setelah setup, Source Control akan menampilkan:

1. **📁 Staged Changes** - File yang sudah di-stage, siap untuk commit
   - Tombol "−" untuk unstage all
   - Right-click individual file untuk unstage

2. **📁 Custom Groups** - Group yang Anda buat (e.g., "Local Changes", "Feature A")
   - Tombol "+" untuk stage all files in group (kecuali yang marked local-only)
   - Individual file operations: stage, mark as local, remove from group

3. **📁 Changes** - File yang belum di-group
   - Right-click untuk "Add to Group"

## Troubleshooting

**Q: Masih muncul 2 SCM provider (Git dan GitFolder)?**
A: Pastikan `"git.enabled": false` sudah ditambahkan dan window sudah di-reload.

**Q: Stage tidak berfungsi?**
A: Pastikan file sudah ada di working tree changes (belum di-stage di git).

**Q: Staged changes tidak muncul?**
A: Staged Changes group akan muncul otomatis ketika ada file yang di-stage.

**Q: File tidak hilang dari Changes saat add to group?**
A: Refresh dengan klik icon refresh di toolbar GitFolder.
