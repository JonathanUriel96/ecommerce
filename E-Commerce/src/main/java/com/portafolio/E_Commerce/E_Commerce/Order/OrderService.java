package com.portafolio.E_Commerce.E_Commerce.Order;

import com.portafolio.E_Commerce.E_Commerce.auth.AccountPrincipal;
import com.portafolio.E_Commerce.E_Commerce.Product.Product;
import com.portafolio.E_Commerce.E_Commerce.Product.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;

@Service
@Transactional(readOnly = true)
public class OrderService {

//    El DTO se construye dentro del servicio, mientras la transacción sigue abierta.
//    Así evitamos problemas al leer los artículos del pedido desde JPA.

    private final CustomerOrderRepository orderRepository;
    private final ProductRepository productRepository;

    public OrderService(
            CustomerOrderRepository orderRepository,
            ProductRepository productRepository
    ) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request, AccountPrincipal customer) {
        CustomerOrder order = new CustomerOrder(
                customer.getName(),
                customer.getEmail(),
                request.shippingAddress(),
                customer.getId()
        );

        BigDecimal total = BigDecimal.ZERO;

        for (OrderItemRequest requestedItem : request.items()) {
            Product product = productRepository
                    .findActiveByIdForUpdate(requestedItem.productId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Producto no disponible: " + requestedItem.productId()
                    ));

            if (product.getStock() < requestedItem.quantity()) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Stock insuficiente para: " + product.getName()
                );
            }

            product.setStock(product.getStock() - requestedItem.quantity());

            OrderItem orderItem = new OrderItem(
                    product.getId(),
                    product.getName(),
                    product.getPrice(),
                    requestedItem.quantity()
            );

            order.addItem(orderItem);

            BigDecimal lineTotal = product.getPrice()
                    .multiply(BigDecimal.valueOf(requestedItem.quantity()));

            total = total.add(lineTotal);
        }

        order.setTotal(total);

        CustomerOrder savedOrder = orderRepository.save(order);
        return OrderResponse.from(savedOrder);

//        Todo ocurre dentro de una transacción: si un producto no existe o no alcanza el stock,
//        el pedido no se guarda y los descuentos de stock se revierten.
//                El precio también se obtiene del producto en MySQL; React no decide el total.
    }

    public Page<OrderResponse> findAll(Pageable pageable) {
        return orderRepository.findAll(pageable)
                .map(OrderResponse::from);
    }

    public Page<OrderResponse> findForCustomer(Long customerId, Pageable pageable) {
        return orderRepository.findByCustomerUserIdOrderByCreatedAtDesc(customerId, pageable)
                .map(OrderResponse::from);
    }

    @Transactional
    public OrderResponse updateStatus(Long id, OrderStatus status) {
        CustomerOrder order = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pedido no encontrado."));
        order.setStatus(status);
        return OrderResponse.from(order);
    }
}
