const { default: makeWASocket } = require('@adiwajshing/baileys');
const fs = require('fs');

// Data produk dengan 5 sub-produk
const products = [
    {
        name: 'Produk 1',
        subProducts: [
            { name: 'Sub-Produk 1A', price: 10000, description: 'Deskripsi Sub-Produk 1A', image: './images/product1A.jpg' },
            { name: 'Sub-Produk 1B', price: 15000, description: 'Deskripsi Sub-Produk 1B', image: './images/product1B.jpg' },
            { name: 'Sub-Produk 1C', price: 20000, description: 'Deskripsi Sub-Produk 1C', image: './images/product1C.jpg' },
            { name: 'Sub-Produk 1D', price: 25000, description: 'Deskripsi Sub-Produk 1D', image: './images/product1D.jpg' },
            { name: 'Sub-Produk 1E', price: 30000, description: 'Deskripsi Sub-Produk 1E', image: './images/product1E.jpg' }
        ]
    },
    // Tambahkan produk lainnya sesuai kebutuhan
];

let userOrder = {};
let userStatus = {};

const startBot = () => {
    const sock = makeWASocket({
        logger: console,
        printQRInTerminal: true,
    });

    // Fungsi untuk mengirim ucapan selamat datang
    const sendWelcomeMessage = async (jid) => {
        await sock.sendMessage(jid, {
            text: 'Selamat datang di layanan kami! Bagaimana kami dapat membantu Anda hari ini?',
        });
    };

    // Fungsi untuk menampilkan menu produk
    const showProducts = async (jid) => {
        let message = 'Pilih produk:\n';
        products.forEach((product, index) => {
            message += `${index + 1}. ${product.name}\n`;
        });
        await sock.sendMessage(jid, { text: message });
    };

    // Fungsi untuk menampilkan sub-produk
    const showSubProducts = async (jid, productIndex) => {
        const selectedProduct = products[productIndex];
        let message = `Pilih sub-produk dari ${selectedProduct.name}:\n`;
        selectedProduct.subProducts.forEach((subProduct, index) => {
            message += `${index + 1}. ${subProduct.name} - Rp${subProduct.price}\n`;
        });
        await sock.sendMessage(jid, { text: message });
    };

    // Fungsi untuk menampilkan detail sub-produk
    const showProductDetails = async (jid, productIndex, subProductIndex) => {
        const subProduct = products[productIndex].subProducts[subProductIndex];
        userOrder[jid] = { product: subProduct }; // Menyimpan pilihan produk
        await sock.sendMessage(jid, {
            image: { url: subProduct.image },
            caption: `Nama: ${subProduct.name}\nHarga: Rp${subProduct.price}\nDeskripsi: ${subProduct.description}`,
            buttons: [
                { buttonId: 'buy', buttonText: { displayText: 'Beli' }, type: 1 }
            ],
            headerType: 4
        });
    };

    // Fungsi untuk menampilkan metode pembayaran dengan gambar
    const showPaymentMethods = async (jid) => {
        await sock.sendMessage(jid, {
            text: 'Pilih metode pembayaran:',
            buttons: [
                { buttonId: 'bank', buttonText: { displayText: 'BANK' }, type: 1 },
                { buttonId: 'ewallet', buttonText: { displayText: 'E-Wallet' }, type: 1 }
            ],
            headerType: 1
        });
    };

    // Fungsi untuk mengirim gambar sesuai metode pembayaran
    const sendPaymentImage = async (jid, method) => {
        let imagePath;
        let caption;

        if (method === 'bank') {
            imagePath = './images/bank.jpg';
            caption = 'Anda memilih metode pembayaran: BANK';
        } else if (method === 'ewallet') {
            imagePath = './images/ewallet.jpg';
            caption = 'Anda memilih metode pembayaran: E-Wallet';
        }

        await sock.sendMessage(jid, {
            image: { url: imagePath },
            caption: caption
        });
    };

    // Fungsi untuk menampilkan pertanyaan produk fisik atau digital
    const askProductType = async (jid) => {
        await sock.sendMessage(jid, {
            text: 'Apa yang kamu beli?',
            buttons: [
                { buttonId: 'physical', buttonText: { displayText: 'Ini produk fisik' }, type: 1 },
                { buttonId: 'digital', buttonText: { displayText: 'Ini produk digital' }, type: 1 }
            ],
            headerType: 1
        });
    };

    // Fungsi untuk meminta detail alamat produk fisik
    const askPhysicalAddress = async (jid) => {
        await sock.sendMessage(jid, { text: 'Silakan isi detail alamat lengkap:\nNama lengkap, Alamat rumah, RT/RW, Desa/Kelurahan, Kecamatan, Kota/Kabupaten, Kode Pos' });
        userOrder[jid].awaitingAddress = 'physical';
    };

    // Fungsi untuk meminta detail kontak produk digital
    const askDigitalContact = async (jid) => {
        await sock.sendMessage(jid, { text: 'Silakan beri detail kontak digital (misalnya email atau nomor telepon).' });
        userOrder[jid].awaitingAddress = 'digital';
    };

    // Fungsi untuk meminta konfirmasi pembayaran
    const askPaymentConfirmation = async (jid) => {
        await sock.sendMessage(jid, {
            text: 'Apakah pesanan Anda sudah dibayar?',
            buttons: [
                { buttonId: 'paid', buttonText: { displayText: 'Sudah Dibayar' }, type: 1 },
                { buttonId: 'not_paid', buttonText: { displayText: 'Belum Dibayar' }, type: 1 }
            ],
            headerType: 1
        });
    };

    // Fungsi untuk meminta bukti transfer
    const askForTransferProof = async (jid) => {
        await sock.sendMessage(jid, { text: 'Jika sudah, silakan kirim bukti transfer.' });
        userOrder[jid].awaitingTransferProof = true;
    };

    // Menangani pesan masuk
    sock.ev.on('messages.upsert', async (msg) => {
        const message = msg.messages[0];
        const jid = message.key.remoteJid;
        const text = message.message?.conversation?.toLowerCase();

        if (!message.key.fromMe && message.message) {
            // Periksa apakah pengguna sudah pernah berinteraksi sebelumnya
            if (!userStatus[jid]) {
                // Jika pengguna baru, kirim ucapan selamat datang dan tandai mereka
                await sendWelcomeMessage(jid);
                userStatus[jid] = { hasInteracted: true };
            }

            // Menangani pilihan menu awal
            if (text === 'menu') {
                await showProducts(jid);
            } else if (text.startsWith('pilih produk')) {
                const productIndex = parseInt(text.split(' ')[2]) - 1;
                await showSubProducts(jid, productIndex);
            } else if (text.startsWith('pilih sub-produk')) {
                const [_, __, productIndex, subProductIndex] = text.split(' ');
                await showProductDetails(jid, parseInt(productIndex) - 1, parseInt(subProductIndex) - 1);
            } else if (text === 'beli') {
                await showPaymentMethods(jid);
            }

            // Menangani pilihan metode pembayaran
            else if (text === 'bank' || text === 'ewallet') {
                userOrder[jid].paymentMethod = text.toUpperCase();
                await sendPaymentImage(jid, text);  // Kirim gambar sesuai metode pembayaran
                await askProductType(jid);
            }

            // Menangani pilihan produk fisik atau digital
            else if (text === 'ini produk fisik') {
                await askPhysicalAddress(jid);
            } else if (text === 'ini produk digital') {
                await askDigitalContact(jid);
            }

            // Menangani pengisian detail alamat atau kontak
            else if (userOrder[jid]?.awaitingAddress === 'physical') {
                userOrder[jid].address = text;
                await askPaymentConfirmation(jid);
            } else if (userOrder[jid]?.awaitingAddress === 'digital') {
                userOrder[jid].digitalContact = text;
                await askPaymentConfirmation(jid);
            }

            // Menangani konfirmasi pembayaran
            else if (text === 'sudah dibayar') {
                await askForTransferProof(jid);
            } else if (text === 'belum dibayar') {
                await sock.sendMessage(jid, { text: 'Silakan lakukan pembayaran terlebih dahulu.' });
            }

            // Menangani pengiriman bukti transfer (gambar)
            else if (message.message.imageMessage && userOrder[jid]?.awaitingTransferProof) {
                // Simpan bukti transfer, bisa kamu gunakan sesuai kebutuhan
                await sock.sendMessage(jid, { text: 'Mohon tunggu, kami sedang memeriksa bukti transaksi Anda.' });
                userOrder[jid].awaitingTransferProof = false;
                // Proses lebih lanjut untuk verifikasi bukti transfer
            }
        }
    });

    return sock;
};

startBot();
