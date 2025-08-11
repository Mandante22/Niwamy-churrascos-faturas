// niwamy_app/public/js/dashboard.js
// VERSÃO CORRIGIDA - BUSCA E RENDERIZA OS PEDIDOS

document.addEventListener('DOMContentLoaded', () => {
    const ordersListContainer = document.getElementById('orders-list'); // Assumindo que você tem um container com este ID
    const filterButtons = document.querySelectorAll('.filter-btn');

    // Função para buscar os pedidos da API
    const fetchOrders = async (status = null) => {
        let url = '/api/orders';
        if (status) {
            url += `?status=${status}`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Não foi possível carregar os pedidos do servidor.');
            }
            const orders = await response.json();
            renderOrders(orders); // Chama a função para mostrar os pedidos na tela
        } catch (error) {
            ordersListContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    };

    // Função para renderizar (desenhar) os pedidos na tabela
    const renderOrders = (orders) => {
        ordersListContainer.innerHTML = ''; // Limpa a lista antes de adicionar os novos dados

        if (orders.length === 0) {
            ordersListContainer.innerHTML = '<p>Nenhum pedido encontrado.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'orders-table'; // Adiciona uma classe para estilização se necessário
        table.innerHTML = `
            <thead>
                <tr>
                    <th># Pedido</th>
                    <th>Cliente</th>
                    <th>Telefone</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        const tbody = table.querySelector('tbody');
        orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.orderId}</td>
                <td>${order.customerName}</td>
                <td>${order.customerPhone}</td>
                <td>${order.total_amount.toFixed(2)} Kz</td>
                <td><span class="status status-${order.status.toLowerCase()}">${order.status}</span></td>
                <td class="actions">
                    <a href="/api/orders/${order.orderId}/pdf" target="_blank" class="btn btn-view">Ver PDF</a>
                </td>
            `;
            tbody.appendChild(row);
        });
        ordersListContainer.appendChild(table);
    };
    
    // Event listeners para os botões de filtro (se existirem)
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const status = button.dataset.status;
            fetchOrders(status);
        });
    });

    // --- PONTO CHAVE ---
    // Busca os pedidos assim que a página é carregada
    fetchOrders();
});