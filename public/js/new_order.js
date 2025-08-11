// niwamy_app/public/js/new_order.js

document.addEventListener('DOMContentLoaded', () => {
    // Referências aos elementos do HTML
    const menuContainer = document.getElementById('menu-items-container');
    const customerSearchInput = document.getElementById('customer-search');
    const customerSearchResults = document.getElementById('customer-search-results');
    const customerNameInput = document.getElementById('customer-name');
    const customerPhoneInput = document.getElementById('customer-phone');
    const customerAddressInput = document.getElementById('customer-address');
    const customerAddressRefInput = document.getElementById('customer-address-ref');
    const deliveryFeeInput = document.getElementById('delivery-fee');
    const subtotalSpan = document.getElementById('cart-subtotal');
    const totalGeneralSpan = document.getElementById('cart-total-general');
    const finalizeOrderBtn = document.getElementById('finalize-order-btn');

    let cart = {}; // Objeto para guardar os itens e quantidades { itemId: { ...item, quantity: X } }
    let selectedCustomer = null;

    // Função para buscar e renderizar os itens do menu
    const fetchMenuItems = async () => {
        try {
            const response = await fetch('/api/menu_items');
            const items = await response.json();
            const itemsByCategory = items.reduce((acc, item) => {
                if (!acc[item.category]) acc[item.category] = [];
                acc[item.category].push(item);
                return acc;
            }, {});

            menuContainer.innerHTML = '';
            for (const category in itemsByCategory) {
                const categoryHeader = document.createElement('div');
                categoryHeader.className = 'category-header';
                categoryHeader.textContent = category;
                menuContainer.appendChild(categoryHeader);

                const gridContainer = document.createElement('div');
                gridContainer.className = 'items-grid';
                itemsByCategory[category].forEach(item => {
                    gridContainer.appendChild(createMenuItemCard(item));
                });
                menuContainer.appendChild(gridContainer);
            }
        } catch (error) {
            console.error('Erro ao buscar menu:', error);
            menuContainer.innerHTML = '<p>Não foi possível carregar o menu.</p>';
        }
    };

    // Função para criar o "card" de cada item do menu
    const createMenuItemCard = (item) => {
        const card = document.createElement('div');
        card.className = 'menu-item-card';
        card.innerHTML = `
            <h3 class="item-name">${item.name}</h3>
            <p class="item-price">${item.price.toFixed(2)} Kz</p>
            <div class="quantity-controls">
                <button class="quantity-btn minus">-</button>
                <input type="number" class="quantity-input" value="0" min="0" readonly>
                <button class="quantity-btn plus">+</button>
            </div>
        `;
        const plusBtn = card.querySelector('.plus');
        const minusBtn = card.querySelector('.minus');
        const quantityInput = card.querySelector('.quantity-input');

        plusBtn.addEventListener('click', () => {
            quantityInput.value = parseInt(quantityInput.value) + 1;
            updateCart(item, quantityInput.value);
        });
        minusBtn.addEventListener('click', () => {
            let val = parseInt(quantityInput.value);
            if (val > 0) {
                quantityInput.value = val - 1;
                updateCart(item, quantityInput.value);
            }
        });
        return card;
    };

    // Função para atualizar o carrinho e os totais
    const updateCart = (item, quantity) => {
        const qty = parseInt(quantity);
        if (qty > 0) {
            cart[item.id] = { ...item, quantity: qty };
        } else {
            delete cart[item.id];
        }
        updateTotals();
    };

    const updateTotals = () => {
        const subtotal = Object.values(cart).reduce((sum, item) => sum + item.price * item.quantity, 0);
        const deliveryFee = parseFloat(deliveryFeeInput.value) || 0;
        const totalGeneral = subtotal + deliveryFee;

        subtotalSpan.textContent = subtotal.toFixed(2);
        totalGeneralSpan.textContent = totalGeneral.toFixed(2);
    };
    deliveryFeeInput.addEventListener('input', updateTotals);

    // Lógica da Busca de Clientes
    customerSearchInput.addEventListener('input', async (e) => {
        const searchTerm = e.target.value;
        if (searchTerm.length < 2) {
            customerSearchResults.innerHTML = '';
            return;
        }
        try {
            const response = await fetch(`/api/customers/search?q=${searchTerm}`);
            const customers = await response.json();
            customerSearchResults.innerHTML = '';
            customers.forEach(customer => {
                const li = document.createElement('li');
                li.textContent = `${customer.name} - ${customer.phone}`;
                li.addEventListener('click', () => {
                    selectCustomer(customer);
                });
                customerSearchResults.appendChild(li);
            });
        } catch (error) {
            console.error('Erro na busca de clientes:', error);
        }
    });

    const selectCustomer = (customer) => {
        selectedCustomer = customer;
        customerNameInput.value = customer.name;
        customerPhoneInput.value = customer.phone;
        customerAddressInput.value = customer.address || '';
        customerAddressRefInput.value = customer.address_ref || '';
        customerSearchResults.innerHTML = '';
        customerSearchInput.value = '';
    };

    // Lógica para Finalizar o Pedido
    finalizeOrderBtn.addEventListener('click', async () => {
        // Validação dos dados
        const customerName = customerNameInput.value.trim();
        const customerPhone = customerPhoneInput.value.trim();
        if (!customerName || !customerPhone) {
            alert('O nome e o telefone do cliente são obrigatórios.');
            return;
        }
        if (Object.keys(cart).length === 0) {
            alert('O carrinho está vazio. Adicione pelo menos um item.');
            return;
        }

        // Montar o objeto do pedido para enviar ao backend
        const orderData = {
            customer: {
                id: selectedCustomer ? selectedCustomer.id : null,
                name: customerName,
                phone: customerPhone,
                address: customerAddressInput.value.trim(),
                addressRef: customerAddressRefInput.value.trim()
            },
            cart: Object.values(cart),
            totals: {
                subtotal: parseFloat(subtotalSpan.textContent),
                deliveryFee: parseFloat(deliveryFeeInput.value) || 0,
                totalGeneral: parseFloat(totalGeneralSpan.textContent)
            },
            payment: {
                paymentMethod: document.querySelector('input[name="payment-method"]:checked').value,
                paymentReceived: 0 // Este campo pode ser atualizado depois
            },
            notes: document.getElementById('notes').value.trim()
        };

        try {
            finalizeOrderBtn.disabled = true;
            finalizeOrderBtn.textContent = 'A processar...';

            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            const result = await response.json();

            if (response.ok) {
                alert(`Pedido #${result.orderId} criado com sucesso!`);
                window.location.href = '/dashboard.html'; // Redireciona para o dashboard
            } else {
                throw new Error(result.error || 'Ocorreu um erro desconhecido.');
            }
        } catch (error) {
            console.error('Erro ao finalizar pedido:', error);
            alert(`Falha ao criar o pedido: ${error.message}`);
        } finally {
            finalizeOrderBtn.disabled = false;
            finalizeOrderBtn.textContent = 'Finalizar Pedido';
        }
    });

    // Iniciar a página
    fetchMenuItems();
    updateTotals();
});