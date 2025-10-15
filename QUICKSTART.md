# 🚀 Quick Start Guide - GitFolder

## Test Extension (5 Menit)

### Step 1: Jalankan Extension
```bash
# Di folder extension
npm install
npm run compile
```
Tekan **F5** → Window baru akan terbuka

### Step 2: Hide Git Default  
Di window Extension Development Host:
1. `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Ketik: **"Preferences: Open User Settings (JSON)"**
3. Tambahkan:
   ```json
   {
     "git.enabled": false
   }
   ```
4. Save
5. `Ctrl+Shift+P` → **"Developer: Reload Window"**

### Step 3: Buka Git Repository
- File → Open Folder
- Pilih folder yang ada git repository
- Edit beberapa file (biar ada changes)

### Step 4: Test GitFolder!
1. **Buka Source Control**: `Ctrl+Shift+G` / `Cmd+Shift+G`
2. Anda akan lihat **"Git (GitFolder)"** sebagai provider
3. Semua changes muncul di section "**Changes**"

### Step 5: Buat Group & Test
```
➕ Klik icon + → Buat group "Feature A"
📁 Klik kanan file di Changes → "Add to Group" → Pilih "Feature A"
✨ File HILANG dari Changes!
✨ File muncul di group "📁 Feature A"
✓ Hover group → Klik icon ✓ (stage all)
✅ File ter-stage!
```

### Step 6: Test Remove & Move
```
− Hover file di group → Klik icon − (remove)
✨ File kembali ke Changes!

📁 Buat group "Feature B"
→ Klik kanan file di "Feature A" → "Move to Group" → Pilih "Feature B"
✨ File pindah ke Feature B!
```

### Step 7: Test Local-Only
```
🔒 Klik kanan file di group → "Mark as Local Only"
✓ Stage group lagi
✅ File 🔒 tidak ikut di-stage! (auto-excluded)
```

## 🎮 Button & Actions

Di setiap file, hover untuk lihat buttons:
- **+** (Stage) - Stage file ini
- **−** (Remove) - Remove dari group, kembali ke Changes

Di setiap group:
- **✓** (Stage All) - Stage semua file (kecuali 🔒)

Context menu (klik kanan):
- **Add to Group** - Dari Changes
- **Move to Group** - Pindah ke group lain
- **Mark as Local Only** - Tandai 🔒
- **Remove from Group** - Kembali ke Changes

## Expected Result

Sebelum add to group:
```
Git (GitFolder)
└── Changes (5)
    ├── file1.ts
    ├── file2.ts
    ├── file3.ts
    ├── config.json
    └── .env
```

Setelah add ke group:
```
Git (GitFolder)
├── 📁 Feature A (3)
│   ├── file1.ts [Modified]
│   ├── file2.ts [Added]  
│   └── file3.ts [Modified]
│   └── ✓ (stage all)
│
└── Changes (2)  ← file1-3 HILANG dari sini!
    ├── config.json
    └── .env
```

Setelah mark as local:
```
Git (GitFolder)
├── 📁 Feature A (3)
│   ├── file1.ts [Modified]
│   ├── file2.ts [Added]  
│   └── 🔒 file3.ts [Modified] ← Won't be staged!
│
└── Changes (2)
    ├── config.json
    └── .env
```

## Troubleshooting

❌ **"Masih muncul 2 SCM (Git dan GitFolder)"**
→ Pastikan `"git.enabled": false` sudah ada di settings
→ Reload window: `Ctrl+Shift+P` → "Reload Window"

❌ **"Stage tidak berfungsi"**
→ Cek apakah file masih di working tree (belum staged)
→ Cek di terminal: `git status`

❌ **"File tidak hilang dari Changes"**
→ Klik icon refresh di toolbar
→ Atau reload window

## 🎉 Success!
Jika sudah bisa seperti di atas, extension sudah bekerja dengan benar!
