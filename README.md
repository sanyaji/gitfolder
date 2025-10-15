# GitFolder

Extension VS Code untuk mengelola dan mengelompokkan git changes, mirip dengan fitur change management di IntelliJ IDEA.

## ✨ Fitur Utama

- **Override Git Changes View**: Menggantikan tampilan git changes default dengan tampilan terorganisir
- **Pengelompokan Changes**: Buat folder/grup kustom untuk mengorganisir perubahan git Anda
- **Hide Grouped Files**: File yang masuk ke group **HILANG** dari "Changes" - benar-benar terpisah!
- **Stage dari Group**: Stage file/group langsung dengan 1 klik
- **Tandai Local-Only**: Tandai file yang tidak akan di-push (🔒 auto-exclude saat stage group)
- **Full SCM Integration**: Menggunakan VS Code SCM API untuk integrasi penuh
- **Manajemen Mudah**: Kelola changes tanpa perlu menggunakan git stash

## ⚙️ Setup Agar Git Default Tidak Muncul

Untuk benar-benar menggantikan tampilan git default, Anda perlu disable git extension bawaan:

### Cara 1: Via Settings UI
1. Buka Settings (`Ctrl+,` atau `Cmd+,`)
2. Cari **"git enabled"**
3. **Uncheck** "Git: Enabled"
4. Reload VS Code (`Ctrl+Shift+P` → "Reload Window")

### Cara 2: Via settings.json
Tambahkan ke settings.json Anda:
```json
{
  "git.enabled": false
}
```
Lalu reload window.

Setelah itu, hanya GitFolder yang akan muncul di Source Control! ✨

---

## 🚀 Cara Penggunaan

### 1. Buka Source Control Panel
- Tekan `Ctrl+Shift+G` (Windows/Linux) atau `Cmd+Shift+G` (Mac)
- Atau klik icon Git di Activity Bar
- Anda akan melihat **"Git (GitFolder)"** sebagai source control provider

### 2. Lihat Perubahan
Extension akan menampilkan:
- **📁 Groups** - File yang sudah dikelompokkan
- **Changes** - File yang belum masuk ke group (ungrouped)

File yang masuk ke group **TIDAK muncul** di Changes - benar-benar terpisah!

### 3. Membuat Group Baru
- Klik icon **➕** di toolbar Source Control
- Masukkan nama group (contoh: "Feature A", "Local Changes", "Bug Fix #123")

### 4. Menambahkan File ke Group

**Cara 1: Dari Changes (Ungrouped)**
- Klik kanan pada file di section "Changes"
- Pilih **"Add to Group"**
- Pilih group tujuan
- ✨ File akan **hilang** dari Changes dan muncul di group!

**Cara 2: Manual via Command**
- Tekan `Ctrl+Shift+P` / `Cmd+Shift+P`
- Ketik "GitFolder: Add Files to Group"
- Pilih group dan file

### 4b. Remove & Move File

### 6. Mengelola Group

### 5. Stage Changes

**Stage Individual File:**
- Hover file → Klik icon **+** (stage)
- Atau klik kanan → "Stage Changes"

**Remove File dari Group:**
- Hover file → Klik icon **−** (remove)
- File kembali ke "Changes"

**Move File ke Group Lain:**
- Klik kanan file → "Move to Group"
- Pilih group tujuan

**Stage Semua File di Group:**
- Hover group → Klik icon **✓** (stage all)
- File yang ditandai 🔒 local-only **otomatis di-skip**

### 6. Mark sebagai Local-Only 🔒
File local-only **tidak akan di-stage** saat stage group!

**Cara Mark:**
- Klik kanan file di group
- Pilih "Mark as Local Only"

**Use Cases:**
- `config.local.json` - konfigurasi lokal
- `.env.local` - environment variables pribadi  
- `debug.log` - file debug
- Test files yang masih WIP

### 8. Mengelola Group
- **Rename**: Klik kanan pada group → Rename
- **Delete**: Klik kanan pada group → Delete
- **Stage All**: Hover group → Klik icon ✓
- **Stage Group**: Klik icon ✓ di group (exclude local-only files)

## 📋 Requirements

- VS Code 1.85.0 atau lebih baru
- Git extension (built-in di VS Code)
- Git repository aktif di workspace

## 🔧 Instalasi untuk Development

### Prasyarat
Pastikan Node.js dan npm sudah terinstall:
```bash
node --version
npm --version
```

### Langkah-langkah:

1. Clone atau buka project ini
2. Install dependencies:
```bash
npm install
```

3. Compile extension:
```bash
npm run compile
```

4. Jalankan extension:
   - Tekan `F5` di VS Code untuk membuka Extension Development Host
   - Atau jalankan: Debug → Start Debugging

5. **PENTING**: Di window Extension Development Host yang terbuka:
   - Tekan `Ctrl+Shift+P` / `Cmd+Shift+P`
   - Ketik: **"Preferences: Open User Settings (JSON)"**
   - Tambahkan: `"git.enabled": false`
   - Save dan reload window (`Ctrl+Shift+P` → "Reload Window")
   
   Ini untuk **menyembunyikan Git default** dan hanya menampilkan GitFolder.

6. Buka folder dengan git repository dan mulai testing!

## 🛠️ Development

- **Compile**: `npm run compile`
- **Watch mode**: `npm run watch` (auto-compile saat ada perubahan)
- **Package**: `npm run package` (untuk production build)

## 📝 Catatan

- Data pengelompokan disimpan di workspace state VS Code
- Data tidak akan hilang saat VS Code ditutup
- Setiap workspace memiliki konfigurasi sendiri

## 🤝 Contributing

Kontribusi sangat diterima! Silakan buat issue atau pull request.

## 📄 License

MIT

## 💡 Workflow Example

### Before GitFolder:
```
Source Control (Git)
└── Changes (15 files)  😵 Semua tercampur!
    ├── ComponentA.tsx
    ├── ComponentB.tsx
    ├── config.local.json
    ├── feature1.ts
    ├── feature2.ts
    ├── bugfix.ts
    ├── debug.log
    └── ... (8 more files)
```

### After GitFolder:
```
Source Control (Git - GitFolder)
├── 📁 Feature A (3)
│   ├── ComponentA.tsx [Modified]
│   ├── ComponentB.tsx [Modified]
│   └── feature1.ts [Added]
│   └── ✓ (stage all)
│
├── 📁 Feature B (2)  
│   ├── feature2.ts [Modified]
│   └── feature2.test.ts [Added]
│   └── ✓ (stage all)
│
├── 📁 Local Configs (2)
│   ├── 🔒 config.local.json ← Won't be staged!
│   └── 🔒 .env.local
│
├── 📁 Bug Fix #123 (1)
│   └── bugfix.ts [Modified]
│
└── Changes (7)  ← Sisa file yang belum di-group
    ├── README.md
    ├── debug.log
    └── ...
```

**Keuntungan:**
- ✅ File di group **HILANG** dari Changes - tidak tercampur!
- ✅ Stage per group dengan 1 klik, semua file sekaligus
- ✅ Local-only files (🔒) auto-excluded saat stage group
- ✅ Mudah track: "Changes untuk feature A ada di sini, untuk feature B di sana"
- ✅ Commit partial changes dengan mudah: stage 1 group = 1 commit
- ✅ Mirip IntelliJ IDEA!

## 🎯 Roadmap

- [x] Integrasi dengan Source Control panel
- [x] Hide grouped files dari ungrouped changes
- [x] Stage file/group dari GitFolder
- [x] Mark as local-only
- [x] Remove from group (button -)
- [x] Move file between groups
- [ ] Drag & drop visual (currently via context menu)
- [ ] Export/import konfigurasi group
- [ ] Tema warna untuk group
- [ ] Shortcut keyboard
- [ ] Git commit dengan auto-exclude local files

---

## 🐛 Troubleshooting

### ❌ Masih Muncul 2 SCM Provider (Git dan GitFolder)?

**Penyebab**: Git default belum di-disable

**Solusi:**
1. Di window Extension Development Host, tekan `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Ketik: **"Preferences: Open User Settings (JSON)"**
3. Tambahkan:
   ```json
   {
     "git.enabled": false
   }
   ```
4. Save file
5. Reload: `Ctrl+Shift+P` → **"Developer: Reload Window"**
6. Buka Source Control lagi → Hanya **Git (GitFolder)** yang muncul! ✅

### ❌ Stage Tidak Berfungsi?

**Penyebab**: File mungkin sudah staged atau ada error di git

**Solusi:**
- Cek status dengan: `git status` di terminal
- Pastikan file di **working tree** (belum staged)
- Klik icon refresh (🔄) di toolbar GitFolder
- Coba unstage dulu jika sudah staged

### ❌ File Tidak Hilang dari Changes Setelah Add to Group?

**Solusi:**
- Klik icon **refresh** (🔄) di toolbar GitFolder
- Atau reload window: `Ctrl+Shift+P` → "Reload Window"

---

## 📖 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Panduan test 5 menit
- **[SETUP.md](./SETUP.md)** - Setup detail dan troubleshooting

---

**Selamat menggunakan GitFolder! 🎉**

Jika ada pertanyaan atau menemukan bug, silakan buat issue di repository ini.
