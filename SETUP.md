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

## Troubleshooting

**Q: Masih muncul 2 SCM provider (Git dan GitFolder)?**
A: Pastikan `"git.enabled": false` sudah ditambahkan dan window sudah di-reload.

**Q: Stage tidak berfungsi?**
A: Pastikan file sudah ada di working tree changes (belum di-stage di git).

**Q: File tidak hilang dari Changes saat add to group?**
A: Refresh dengan klik icon refresh di toolbar GitFolder.
