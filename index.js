const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@adiwajshing/baileys');
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
const { state, saveState } = useSingleFileAuthState('./auth_info.json');

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

    // Fungsi untuk meminta bukti transfer
    const askForTransferProof = async (jid) => {
        try {
            await sock.sendMessage(jid, { text: 'Jika sudah, silakan kirim bukti transfer.' });
            userOrder[jid].awaitingTransferProof = true;
        } catch (error) {
            console.error('Error asking for transfer proof:', error);
        }
    };

    // Menangani pesan masuk
    sock.ev.on('messages.upsert', async (msg) => {
        const message = msg.messages[0];
        const jid = message.key.remoteJid;
        const text = message.message?.conversation?.toLowerCase() ||
            message.message?.extendedTextMessage?.text?.toLowerCase();
        const buttonResponse = message.message?.buttonsResponseMessage?.selectedButtonId;

        if (!message.key.fromMe && message.message) {
            try {
                // Periksa apakah pengguna sudah pernah berinteraksi sebelumnya
                if (!userStatus[jid]) {
                    // Jika pengguna baru, kirim ucapan selamat datang dan tandai mereka
                    await sendWelcomeMessage(jid);
                    userStatus[jid] = { hasInteracted: true };
                }

                if (buttonResponse) {
                    if (buttonResponse === 'buy') {
                        await showPaymentMethods(jid);
                    } else if (buttonResponse === 'bank' || buttonResponse === 'ewallet') {
                        await sendPaymentImage(jid, buttonResponse);
                        await askProductType(jid);
                    } else if (buttonResponse === 'physical') {
                        await askPhysicalAddress(jid);
                    } else if (buttonResponse === 'digital') {
                        await askDigitalContact(jid);
                    } else if (buttonResponse === 'paid') {
                        await askForTransferProof(jid);
                    } else if (buttonResponse === 'not_paid') {
                        await askPaymentConfirmation(jid);
                    }
                } else if (text) {
                    if (text === 'menu') {
                        await showProducts(jid);
                    } else if (text.match(/^\d+$/)) {
                        const productIndex = parseInt(text) - 1;
                        if (productIndex >= 0 && productIndex < products.length) {
                            await showSubProducts(jid, productIndex);
                        } else {
                            await sock.sendMessage(jid, { text: 'Pilihan produk tidak valid.' });
                        }
                    } else if (text.match(/^\d+\.\d+$/)) {
                        const [productIndex, subProductIndex] = text.split('.').map(Number);
                        if (productIndex >= 1 && productIndex <= products.length) {
                            const product = products[productIndex - 1];
                            if (subProductIndex >= 1 && subProductIndex <= product.subProducts.length) {
                                await showProductDetails(jid, productIndex - 1, subProductIndex - 1);
                            } else {
                                await sock.sendMessage(jid, { text: 'Pilihan sub-produk tidak valid.' });
                            }
                        } else {
                            await sock.sendMessage(jid, { text: 'Pilihan produk tidak valid.' });
                        }
                    } else {
                        await sock.sendMessage(jid, { text: 'Perintah tidak dikenali. Ketik "menu" untuk melihat pilihan produk.' });
                    }
                }
            } catch (error) {
                console.error('Error handling message:', error);
            }
        }
    });

    // Menangani disconnect
    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut);
            console.log('Disconnected due to', lastDisconnect.error, 'Reconnecting:', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        }
    });
};

// Mulai bot
startBot();
