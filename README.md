# Portal KPI Imunisasi Dinkes Kota Cimahi

![Dashboard Overview](https://img.shields.io/badge/Status-Active-success)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![Tech](https://img.shields.io/badge/Tech-HTML%20%7C%20CSS%20%7C%20JS-orange)

Portal KPI Imunisasi adalah dashboard analitik berbasis web yang dikembangkan khusus untuk Dinas Kesehatan Kota Cimahi. Aplikasi ini bertugas untuk memvisualisasikan, menganalisis, dan mengevaluasi data cakupan imunisasi bayi di seluruh fasilitas kesehatan (Puskesmas) dari tahun 2017 hingga 2024.

Proyek ini dibangun menggunakan konsep desain **Premium SaaS Light Mode**, yang memberikan tampilan layaknya perangkat lunak korporasi kelas atas dengan tata letak yang bersih, modern, dan sangat profesional.

## ✨ Fitur Utama

- **Ikhtisar Eksekutif (Overview):** Kartu KPI untuk melihat total sasaran, capaian imunisasi, tingkat persentase cakupan, dan total defisit target secara komprehensif.
- **Analisis Tren Tahunan:** Visualisasi pergerakan kinerja cakupan secara kolektif (Kota Cimahi) dan komparatif (antar Puskesmas) dengan *Line Charts* interaktif.
- **Kinerja Puskesmas:** Evaluasi tingkat mikro menggunakan *Radar Chart* untuk menilai konsistensi pencapaian suatu puskesmas dalam kurun waktu tertentu.
- **Demografi Gender:** Komposisi capaian imunisasi antara Laki-laki dan Perempuan dalam bentuk *Doughnut Chart* dan *Stacked Bar*.
- **Pangkalan Data (Data Induk):** Tabel data *raw* dengan fitur pencarian interaktif, *sorting* data multi-kolom, dan tombol **Unduh CSV** otomatis.

## 🛠 Teknologi yang Digunakan

Aplikasi ini bersifat sepenuhnya berbasis *Client-Side* dan *Stateless*, memastikan performa pemuatan yang cepat:
- **Struktur & Gaya:** HTML5 dan CSS3 Murni (Variabel CSS, Grid Layout, Flexbox).
- **Logika & Interaktivitas:** Vanilla JavaScript (ES6+).
- **Visualisasi Data:** [Chart.js (v4)](https://www.chartjs.org/) via CDN.
- **Sumber Data:** Format file `CSV` statis yang ditarik secara dinamis menggunakan *Fetch API*.

## 🚀 Cara Menjalankan Proyek di Lokal

Karena dashboard ini membaca file *eksternal* (CSV) menggunakan fungsi `fetch()` dari JavaScript, protokol standar `file://` akan diblokir oleh peramban web karena kebijakan *CORS (Cross-Origin Resource Sharing)*.

Oleh karena itu, Anda harus menggunakan **Local Web Server** (seperti MAMP, XAMPP, atau Live Server di VSCode).

### Langkah-langkah:
1. **Kloning Repositori:**
   ```bash
   git clone https://github.com/FAJRIAG/DasboardKPI.git
   ```
2. Pindahkan folder `DasboardKPI` ke dalam direktori lokal server Anda:
   - Jika menggunakan **MAMP**: Masukkan ke `/Applications/MAMP/htdocs/`
   - Jika menggunakan **XAMPP**: Masukkan ke `C:\xampp\htdocs\`
3. Jalankan server (Apache) dari panel kontrol MAMP / XAMPP.
4. Buka peramban (browser) dan akses alamat berikut:
   ```text
   http://localhost:8888/DasboardKPI/ 
   ```
   *(Catatan: Ganti `8888` dengan `80` atau port Apache Anda jika berbeda).*

---
*Dikembangkan oleh [FAJRIAG](https://github.com/FAJRIAG).*
