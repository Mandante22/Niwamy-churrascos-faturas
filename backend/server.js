// niwamy_app/backend/server.js
// VERSÃO 6 - FATURA PDF COMPLETA COM TABELA E TOTAIS

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 5000;

// --- INFORMAÇÕES DA NIWAMY ---
const NIWAMY_EMAIL = 'niwamy.churrascos@gmail.com';
const NIWAMY_PHONE = '+244 924 646 391';
const NIWAMY_ADDRESS = 'Luanda, Ingombota, Bairro Kinaxixi, Rua Cdte. KWenha';
const NIWAMY_NAME = 'Niwamy Churrascos';
const LOGO_PATH = path.join(__dirname, '../public/niwamy_logo_white_corrected.webp');

// --- Configurações do Express ---
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Configuração do Banco de Dados SQLite ---
const DB_PATH = path.join(__dirname, 'niwamy_app.db');
let db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados SQLite:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite em:', DB_PATH);
        initDb();
    }
});

function initDb() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema, (err) => {
        if (err) {
            console.error('Erro ao inicializar o banco de dados:', err.message);
        } else {
            console.log('Banco de dados verificado e inicializado com sucesso.');
        }
    });
}

// --- Rota de Geração de PDF COMPLETA ---
app.get('/api/orders/:id/pdf', (req, res) => {
    const orderId = req.params.id;
    const sql = `
        SELECT o.*, c.name AS customerName, c.phone AS customerPhone, c.email AS customerEmail, c.nif AS customerNif, c.address AS customerAddress
        FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.id = ?
    `;

    db.get(sql, [orderId], (err, order) => {
        if (err || !order) {
            return res.status(404).send('Fatura não encontrada.');
        }

        const itemsSql = `SELECT oi.*, mi.name as itemName FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id WHERE oi.order_id = ?`;
        db.all(itemsSql, [orderId], (err, items) => {
            if (err) {
                return res.status(500).send('Erro ao buscar itens da fatura.');
            }

            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="fatura_FAT-${order.id}.pdf"`);
            doc.pipe(res);

            // --- HEADER ---
            if (fs.existsSync(LOGO_PATH)) {
                doc.image(LOGO_PATH, 50, 45, { width: 75 });
            } else {
                doc.rect(50, 45, 75, 50).stroke();
                doc.fontSize(8).text('Logo Aqui', 55, 65);
            }
            
            doc.fontSize(10).font('Helvetica').text(NIWAMY_NAME, 200, 50, { align: 'right' });
            doc.text(NIWAMY_ADDRESS, { align: 'right' });
            doc.text(`Tel: ${NIWAMY_PHONE}`, { align: 'right' });
            doc.text(`Email: ${NIWAMY_EMAIL}`, { align: 'right' });
            doc.moveDown(2);

            // --- TÍTULO E DETALHES DA FATURA ---
            doc.fontSize(16).font('Helvetica-Bold').text(`FATURA FAT-${order.id}`, 50, 160);
            doc.font('Helvetica');
            doc.text(`Data de Emissão: ${new Date(order.order_date).toLocaleDateString('pt-PT')}`);
            if (order.due_date) doc.text(`Data de Vencimento: ${new Date(order.due_date).toLocaleDateString('pt-PT')}`);
            doc.text(`Status: ${order.status}`);
            doc.moveDown();

            // --- DETALHES DO CLIENTE ---
            doc.text(`Cliente: ${order.customerName}`);
            doc.text(`Email: ${order.customerEmail || 'N/A'}`);
            doc.text(`Telefone: ${order.customerPhone}`);
            doc.text(`NIF: ${order.customerNif || 'N/A'}`);
            doc.text(`Endereço: ${order.customerAddress || 'N/A'}`);
            doc.moveDown(2);

            // --- TABELA DE ITENS (CÓDIGO REINTRODUZIDO) ---
            const tableTop = doc.y > 320 ? doc.y : 320; // Posição inicial da tabela
            doc.font('Helvetica-Bold');
            doc.text('Descrição', 50, tableTop);
            doc.text('Qtd', 250, tableTop);
            doc.text('Preço Unit.', 350, tableTop, { align: 'right' });
            doc.text('Total', 450, tableTop, { align: 'right' });
            doc.moveTo(50, tableTop + 20).lineTo(550, tableTop + 20).stroke();
            doc.font('Helvetica');
            
            let currentY = tableTop + 30;
            let subtotal = 0;
            items.forEach(item => {
                const itemTotal = item.price_at_order * item.quantity;
                subtotal += itemTotal;
                doc.text(item.itemName, 50, currentY, { width: 190 });
                doc.text(item.quantity.toString(), 250, currentY, { width: 50, align: 'center' });
                doc.text(`${item.price_at_order.toFixed(2)} Kz`, 350, currentY, { align: 'right' });
                doc.text(`${itemTotal.toFixed(2)} Kz`, 450, currentY, { align: 'right' });
                currentY += 25;
            });
            doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
            doc.moveDown(2);

            // --- SUMÁRIO DE TOTAIS (CÓDIGO REINTRODUZIDO) ---
            const total = subtotal + order.delivery_fee;
            doc.text(`Subtotal: ${subtotal.toFixed(2)} Kz`, 400, doc.y, { align: 'right' });
            doc.text(`Taxa de Entrega: ${order.delivery_fee.toFixed(2)} Kz`, 400, doc.y, { align: 'right' });
            doc.moveDown();
            doc.font('Helvetica-Bold').fontSize(14).text(`TOTAL: ${total.toFixed(2)} Kz`, 400, doc.y, { align: 'right' });
            
            // --- FOOTER ---
            doc.fontSize(8).text(`Documento gerado em ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT')}`, 50, 750, { align: 'center' });

            doc.end();
        });
    });
});


// --- OUTRAS ROTAS (mantidas como estão para referência) ---
// ... (todas as outras rotas como /api/orders, /login, etc., permanecem aqui)
app.post('/api/orders', (req, res) => {
    const { customer, cart, totals, payment, notes } = req.body;
    const orderDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(orderDate.getDate() + 7);
    db.serialize(() => {
        db.run('BEGIN TRANSACTION;');
        const findOrCreateCustomer = (callback) => {
            if (customer.id) { return callback(null, customer.id); }
            const findSql = 'SELECT id FROM customers WHERE phone = ?';
            db.get(findSql, [customer.phone], (err, row) => {
                if (err) return callback(err);
                if (row) return callback(null, row.id);
                const insertSql = 'INSERT INTO customers (name, phone, address, address_ref) VALUES (?, ?, ?, ?)';
                db.run(insertSql, [customer.name, customer.phone, customer.address, customer.addressRef], function(err) {
                    if (err) return callback(err);
                    callback(null, this.lastID);
                });
            });
        };
        findOrCreateCustomer((err, customerId) => {
            if (err) { db.run('ROLLBACK;'); return res.status(500).json({ error: "Erro ao processar cliente." }); }
            const insertOrderSql = `INSERT INTO orders (customer_id, total_amount, delivery_fee, status, payment_method, notes, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)`;
            db.run(insertOrderSql, [customerId, totals.totalGeneral, totals.deliveryFee, 'Pendente', payment.paymentMethod, notes, dueDate.toISOString()], function(err) {
                if (err) { db.run('ROLLBACK;'); return res.status(500).json({ error: 'Erro ao criar o pedido.' }); }
                const orderId = this.lastID;
                const insertOrderItemSql = 'INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_order) VALUES (?, ?, ?, ?)';
                const stmt = db.prepare(insertOrderItemSql);
                function insertItemsSequentially(index) {
                    if (index >= cart.length) {
                        stmt.finalize((err) => {
                            if (err) { db.run('ROLLBACK;'); return res.status(500).json({ error: 'Erro ao salvar itens do pedido.' }); }
                            db.run('COMMIT;');
                            console.log(`Pedido ${orderId} criado com sucesso.`);
                            return res.status(201).json({ message: 'Pedido criado com sucesso!', orderId });
                        });
                        return;
                    }
                    const item = cart[index];
                    stmt.run([orderId, item.id, item.quantity, item.price], (err) => {
                        if (err) { db.run('ROLLBACK;'); stmt.finalize(); return res.status(500).json({ error: 'Falha ao inserir um item do pedido.' }); }
                        insertItemsSequentially(index + 1);
                    });
                }
                insertItemsSequentially(0);
            });
        });
    });
});
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, '../public/login.html')); });
app.get('/:page', (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, `../public/${page}`);
    if (fs.existsSync(filePath) && path.extname(page) === '.html') {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Página não encontrada');
    }
});
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = `SELECT * FROM users WHERE username = ?`;
    db.get(sql, [username], (err, user) => {
        if (err) return res.status(500).send('Erro no servidor.');
        if (!user || user.password !== password) { return res.send('Credenciais inválidas. <a href="/">Tente novamente</a>.'); }
        res.redirect('/dashboard.html');
    });
});
app.get('/api/menu_items', (req, res) => {
    const sql = 'SELECT id, name, category, price FROM menu_items WHERE is_available = 1 ORDER BY category, name';
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
app.get('/api/customers/search', (req, res) => {
    const searchTerm = req.query.q;
    if (!searchTerm) { return res.status(400).json({ error: 'Termo de busca não fornecido.' }); }
    const likeTerm = `%${searchTerm}%`;
    const sql = `SELECT id, name, phone, address, address_ref FROM customers WHERE name LIKE ? OR phone LIKE ? LIMIT 10`;
    db.all(sql, [likeTerm, likeTerm], (err, rows) => {
        if (err) { console.error('Erro ao buscar clientes:', err.message); return res.status(500).json({ error: 'Erro ao buscar clientes no banco de dados.' }); }
        res.json(rows);
    });
});
app.get('/api/orders', (req, res) => {
    const { status } = req.query;
    let sql = `SELECT o.id AS orderId, o.total_amount, o.status, c.name AS customerName, c.phone AS customerPhone FROM orders o JOIN customers c ON o.customer_id = c.id`;
    const params = [];
    if (status) { sql += ` WHERE o.status = ?`; params.push(status); }
    sql += ` ORDER BY o.order_date DESC`;
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});