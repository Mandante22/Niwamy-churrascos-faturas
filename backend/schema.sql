-- niwamy_app/backend/schema.sql

DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS order_items;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT, -- ADICIONADO
    nif TEXT,   -- ADICIONADO
    address TEXT,
    address_ref TEXT
);

CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    is_available INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME, -- ADICIONADO
    total_amount REAL NOT NULL,
    delivery_fee REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    payment_method TEXT,
    payment_received_amount REAL,
    notes TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    menu_item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price_at_order REAL NOT NULL,
    item_notes TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

-- Insere dados iniciais com os novos campos
INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', 'adminpass', 'admin');
INSERT OR IGNORE INTO users (username, password, role) VALUES ('caixa', 'caixapass', 'employee');

INSERT OR IGNORE INTO menu_items (name, category, price) VALUES
('Picanha Grelhada (500g)', 'Carnes', 3000.00),
('Frango Inteiro (500g)', 'Carnes', 5000.00),
('Coxa (unidade)', 'Carnes', 1500.00),
('Pernil', 'Carnes', 2500.00),
('Entrecosto', 'Carnes', 2500.00),
('Entremeada', 'Carnes', 2000.00),
('Pincho', 'Carnes', 1000.00),
('Arroz Branco', 'Acompanhamentos', 1000.00),
('Feijão preto', 'Acompanhamentos', 1000.00),
('Batata Frita', 'Acompanhamentos', 1000.00),
('Batata Doce Fervida', 'Acompanhamentos', 1000.00),
('Banana pão frita', 'Acompanhamentos', 1000.00),
('Refrigerante (Lata)', 'Bebidas', 1000.00),
('Água Mineral', 'Bebidas', 200.00);

INSERT OR IGNORE INTO customers (name, phone, email, nif, address, address_ref) VALUES
('Liliane Yambo', '937119530', 'liliane.yambo@email.com', '123456789', 'Rua A, 123', 'Portão verde'),
('Alice Massoko', '910123456', 'alice.massoko@email.com', '987654321', 'Avenida B, 45', 'Prédio da Kitanda');