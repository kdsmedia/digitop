# Digitop

Digitop adalah sebuah toko online berbasis WhatsApp yang memudahkan pelanggan untuk membeli produk melalui chat. Bot ini memungkinkan pengguna untuk melihat produk, memilih sub-produk, menentukan metode pembayaran, dan mengonfirmasi pembayaran.

## Fitur

- Menampilkan daftar produk
- Menampilkan sub-produk dari produk yang dipilih
- Menampilkan detail produk termasuk gambar
- Mengatur metode pembayaran dan konfirmasi pembayaran
- Meminta alamat untuk produk fisik atau kontak untuk produk digital

## Prerequisites

- Node.js (versi 16.x atau lebih baru)
- NPM atau Yarn

## Instalasi

1. **Clone repositori:**

    ```bash
    git clone https://github.com/kdsmedia/digitop.git
    cd digitop
    ```

2. **Instal dependensi:**

    ```bash
    npm install
    ```

3. **Setup Autentikasi:**

    Pastikan Anda memiliki file `auth_info.json` untuk menyimpan sesi autentikasi WhatsApp. File ini dapat diperoleh melalui proses autentikasi awal.

## Menjalankan Bot

Untuk memulai bot, gunakan perintah berikut:

```bash
npm start
