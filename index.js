const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@adiwajshing/baileys');
const fs = require('fs');
const { Boom } = require('@hapi/boom');
const axios = require('axios'); // Mengimpor axios
const WebSocket = require('ws'); // Mengimpor ws

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

// Untuk menyimpan sesi autentikasi
const { state, saveState } = useMultiFileAuthState('./auth_info'); // Menggunakan useMultiFileAuthState untuk versi terbaru

let userOrder = {};
let userStatus = {};

// Fungsi untuk memulai bot
const startBot = async () => {
    const sock = makeWASocket({
        logger: console,
        printQRInTerminal: true,
        auth: state
    });

    sock.ev.on('creds.update', saveState);

    // Fungsi untuk mengirim ucapan selamat datang
    const sendWelcomeMessage = async (jid) => {
        try {
            await sock.sendMessage(jid, {
                text: 'Selamat datang di layanan kami! Bagaimana kami dapat membantu Anda hari ini?',
            });
        } catch (error) {
            console.error('Error sending welcome message:', error);
        }
    };

    // Fungsi untuk menampilkan menu produk
    const showProducts = async (jid) => {
        try {
            let message = 'Pilih produk:\n';
            products.forEach((product, index) => {
                message += `${index + 1}. ${product.name}\n`;
            });
            await sock.sendMessage(jid, { text: message });
        } catch (error) {
            console.error('Error showing products:', error);
        }
    };

    // Fungsi untuk menampilkan sub-produk
    const showSubProducts = async (jid, productIndex) => {
        try {
            const selectedProduct = products[productIndex];
            let message = `Pilih sub-produk dari ${selectedProduct.name}:\n`;
            selectedProduct.subProducts.forEach((subProduct, index) => {
                message += `${index + 1}. ${subProduct.name} - Rp${subProduct.price}\n`;
            });
            await sock.sendMessage(jid, { text: message });
        } catch (error) {
            console.error('Error showing sub-products:', error);
        }
    };

    // Fungsi untuk menampilkan detail sub-produk
    const showProductDetails = async (jid, productIndex, subProductIndex) => {
        try {
            const subProduct = products[productIndex].subProducts[subProductIndex];
            userOrder[jid] = { product: subProduct }; // Menyimpan pilihan produk
            if (fs.existsSync(subProduct.image)) {
                await sock.sendMessage(jid, {
                    image: { url: subProduct.image },
                    caption: `Nama: ${subProduct.name}\nHarga: Rp${subProduct.price}\nDeskripsi: ${subProduct.description}`,
                    buttons: [
                        { buttonId: 'buy', buttonText: { displayText: 'Beli' }, type: 1 }
                    ],
                    headerType: 4
                });
            } else {
                await sock.sendMessage(jid, { text: 'Gambar produk tidak ditemukan.' });
            }
        } catch (error) {
            console.error('Error showing product details:', error);
        }
    };

    // Fungsi untuk menampilkan metode pembayaran dengan gambar
    const showPaymentMethods = async (jid) => {
        try {
            await sock.sendMessage(jid, {
                text: 'Pilih metode pembayaran:',
                buttons: [
                    { buttonId: 'bank', buttonText: { displayText: 'BANK' }, type: 1 },
                    { buttonId: 'ewallet', buttonText: { displayText: 'E-Wallet' }, type: 1 }
                ],
                headerType: 1
            });
        } catch (error) {
            console.error('Error showing payment methods:', error);
        }
    };

    // Fungsi untuk mengirim gambar sesuai metode pembayaran
    const sendPaymentImage = async (jid, method) => {
        try {
            let imagePath;
            let caption;

            if (method === 'bank') {
                imagePath = './images/bank.jpg';
                caption = 'Anda memilih metode pembayaran: BANK';
            } else if (method === 'ewallet') {
                imagePath = './images/ewallet.jpg';
                caption = 'Anda memilih metode pembayaran: E-Wallet';
            }

            if (fs.existsSync(imagePath)) {
                await sock.sendMessage(jid, {
                    image: { url: imagePath },
                    caption: caption
                });
            } else {
                await sock.sendMessage(jid, { text: 'Gambar tidak ditemukan.' });
            }
        } catch (error) {
            console.error('Error sending payment image:', error);
        }
    };

    // Fungsi untuk menampilkan pertanyaan produk fisik atau digital
    const askProductType = async (jid) => {
        try {
            await sock.sendMessage(jid, {
                text: 'Apa yang kamu beli?',
                buttons: [
                    { buttonId: 'physical', buttonText: { displayText: 'Ini produk fisik' }, type: 1 },
                    { buttonId: 'digital', buttonText: { displayText: 'Ini produk digital' }, type: 1 }
                ],
                headerType: 1
            });
        } catch (error) {
            console.error('Error asking product type:', error);
        }
    };

    // Fungsi untuk meminta detail alamat produk fisik
    const askPhysicalAddress = async (jid) => {
        try {
            await sock.sendMessage(jid, { text: 'Silakan isi detail alamat lengkap:\nNama lengkap, Alamat rumah, RT/RW, Desa/Kelurahan, Kecamatan, Kota/Kabupaten, Kode Pos' });
            userOrder[jid].awaitingAddress = 'physical';
        } catch (error) {
            console.error('Error asking physical address:', error);
        }
    };

    // Fungsi untuk meminta detail kontak produk digital
    const askDigitalContact = async (jid) => {
        try {
            await sock.sendMessage(jid, { text: 'Silakan beri detail kontak digital (misalnya email atau nomor telepon).' });
            userOrder[jid].awaitingAddress = 'digital';
        } catch (error) {
            console.error('Error asking digital contact:', error);
        }
    };

    // Fungsi untuk meminta konfirmasi pembayaran
    const askPaymentConfirmation = async (jid) => {
        try {
            await sock.sendMessage(jid, {
                text: 'Apakah pesanan Anda sudah dibayar?',
                buttons: [
                    { buttonId: 'paid', buttonText: { displayText: 'Sudah Dibayar' }, type: 1 },
                    { buttonId: 'not_paid', buttonText: { displayText: 'Belum Dibayar' }, type: 1 }
                ],
                headerType: 1
            });
        } catch (error) {
            console.error('Error asking payment confirmation:', error);
        }
    };

    // Fungsi untuk menangani pesan masuk
    sock.ev.on('messages.upsert', async (m) => {
        try {
            const message = m.messages[0];
            if (!message.message) return;

            const jid = message.key.remoteJid;
            const messageType = Object.keys(message.message)[0];
            const messageContent = message.message[messageType];

            if (message.key.fromMe) return; // Mengabaikan pesan dari bot sendiri

            if (messageContent.text) {
                const text = messageContent.text.toLowerCase();

                if (text === 'hi' || text === 'hello') {
                    await sendWelcomeMessage(jid);
                } else if (text === 'menu') {
                    await showProducts(jid);
                } else if (text.startsWith('pilih produk')) {
                    const productIndex = parseInt(text.split(' ')[2]) - 1;
                    if (productIndex >= 0 && productIndex < products.length) {
                        await showSubProducts(jid, productIndex);
                    } else {
                        await sock.sendMessage(jid, { text: 'Produk tidak ditemukan.' });
                    }
                } else if (text.startsWith('sub produk')) {
                    const [_, productIndex, subProductIndex] = text.split(' ').map(Number);
                    if (products[productIndex] && products[productIndex].subProducts[subProductIndex]) {
                        await showProductDetails(jid, productIndex, subProductIndex);
                    } else {
                        await sock.sendMessage(jid, { text: 'Sub-produk tidak ditemukan.' });
                    }
                } else if (text === 'payment') {
                    await showPaymentMethods(jid);
                } else if (text.startsWith('bank') || text.startsWith('ewallet')) {
                    const method = text.split(' ')[0];
                    await sendPaymentImage(jid, method);
                } else if (text === 'fisik' || text === 'digital') {
                    await askProductType(jid);
                } else if (text === 'fisik') {
                    await askPhysicalAddress(jid);
                } else if (text === 'digital') {
                    await askDigitalContact(jid);
                } else if (text === 'bayar') {
                    await askPaymentConfirmation(jid);
                } else {
                    await sock.sendMessage(jid, { text: 'Perintah tidak dikenali. Ketik "menu" untuk melihat opsi.' });
                }
            }
        } catch (error) {
            console.error('Error handling incoming messages:', error);
        }
    });

    // Event handler untuk disconnect
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut);
            if (shouldReconnect) {
                startBot(); // Rekoneksikan jika perlu
            }
        }
    });

    // Event handler untuk QR code
    sock.ev.on('qr', (qr) => {
        console.log('QR Code received:', qr);
    });

    console.log('Bot is running...');
};

// Mulai bot
startBot();
