import { useState } from "react";
import "./OrderHistory.css";

const formatoPrecio = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const estadosPedido = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  CANCELLED: "Cancelado",
};

function codificarCredenciales(username, password) {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  const textoBinario = Array.from(bytes, (byte) =>
    String.fromCharCode(byte),
  ).join("");

  return btoa(textoBinario);
}

export default function OrderHistory() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  async function loadOrders(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    setHasLoaded(false);

    try {
      const token = codificarCredenciales(username, password);
      const response = await fetch(
        "/api/orders?page=0&size=20&sort=createdAt,desc",
        {
          headers: {
            Authorization: `Basic ${token}`,
          },
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          response.status === 401 || response.status === 403
            ? "Credenciales incorrectas o sin permiso para consultar pedidos."
            : data?.detail ||
                data?.message ||
                `Error al cargar pedidos (HTTP ${response.status}).`,
        );
      }

      setOrders(Array.isArray(data?.content) ? data.content : []);
      setHasLoaded(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudieron cargar los pedidos.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page orders-page" id="orders-admin">
      <div className="orders-admin">
        <p className="eyebrow">ADMINISTRACIÓN</p>
        <h2>Historial de pedidos</h2>
        <p className="orders-description">
          Ingresa con el usuario administrador configurado en IntelliJ.
        </p>

        <form className="orders-auth-form" onSubmit={loadOrders}>
          <label>
            Usuario
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Cargando..." : "Consultar pedidos"}
          </button>
        </form>

        {error && (
          <p className="orders-error" role="alert">
            {error}
          </p>
        )}

        {hasLoaded && orders.length === 0 && (
          <p className="orders-empty">Todavía no hay pedidos registrados.</p>
        )}

        {orders.length > 0 && (
          <div className="orders-list">
            {orders.map((order) => (
              <article className="order-card" key={order.id}>
                <div className="order-card-header">
                  <h3>Pedido #{order.id}</h3>
                  <span
                    className={`order-status ${String(order.status).toLowerCase()}`}
                  >
                    {estadosPedido[order.status] ?? order.status}
                  </span>
                </div>

                <p className="order-date">
                  {order.createdAt
                    ? new Intl.DateTimeFormat("es-MX", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(order.createdAt))
                    : "Fecha no disponible"}
                </p>

                <ul className="order-items">
                  {(order.items ?? []).map((item, index) => (
                    <li key={`${order.id}-${item.productId}-${index}`}>
                      <span>
                        {item.quantity} × {item.productName}
                      </span>
                      <span>
                        {formatoPrecio.format(Number(item.lineTotal))}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="order-total">
                  <span>Total</span>
                  <strong>
                    {formatoPrecio.format(Number(order.total))}
                  </strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}