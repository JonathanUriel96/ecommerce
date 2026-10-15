import { useCallback, useEffect, useState } from "react";
import "./RoleDashboard.css";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const statusLabels = { PENDING: "Pendiente", PAID: "Pagado", CANCELLED: "Cancelado" };
const roleLabels = { CUSTOMER: "Cliente", EMPLOYEE: "Empleado", ADMIN: "Administrador" };

export default function RoleDashboard({ user, token, onClose }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [staffForm, setStaffForm] = useState({ name: "", username: "", email: "", password: "", role: "EMPLOYEE" });
  const [accountMessage, setAccountMessage] = useState("");
  const [accountError, setAccountError] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);

  const fetchOrders = useCallback(async () => {
    const path = user.role === "CUSTOMER"
      ? "/api/orders/mine?page=0&size=100"
      : "/api/orders?page=0&size=100&sort=createdAt,desc";
    const response = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || data.message || `No se pudieron cargar los pedidos (HTTP ${response.status}).`);
    }
    return Array.isArray(data.content) ? data.content : [];
  }, [token, user.role]);

  useEffect(() => {
    let cancelled = false;
    fetchOrders()
      .then((data) => { if (!cancelled) setOrders(data); })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los pedidos.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchOrders]);

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      setOrders(await fetchOrders());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los pedidos.");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, status) => {
    setBusyOrderId(orderId);
    setError("");
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || data.message || `No se pudo actualizar (HTTP ${response.status}).`);
      setOrders((current) => current.map((order) => order.id === orderId ? data : order));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar el pedido.");
    } finally {
      setBusyOrderId(null);
    }
  };

  const createStaffAccount = async (event) => {
    event.preventDefault();
    setCreatingAccount(true);
    setAccountError("");
    setAccountMessage("");
    try {
      const response = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(staffForm),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || data.message || `No se pudo crear la cuenta (HTTP ${response.status}).`);
      setAccountMessage(`Cuenta de ${roleLabels[data.role] ?? data.role} creada para ${data.username}.`);
      setStaffForm({ name: "", username: "", email: "", password: "", role: "EMPLOYEE" });
    } catch (createError) {
      setAccountError(createError instanceof Error ? createError.message : "No se pudo crear la cuenta.");
    } finally {
      setCreatingAccount(false);
    }
  };

  return (
    <section className="role-dashboard" aria-label="Panel de cuenta">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">{roleLabels[user.role] ?? user.role}</p>
          <h2 id="orders-dialog-title">{user.role === "CUSTOMER" ? "Mis pedidos" : "Gestión de pedidos"}</h2>
          <p className="orders-description">Sesión de {user.name} · {user.username}</p>
        </div>
        <div className="dashboard-heading-actions">
          <button className="clear-search-button" type="button" onClick={loadOrders} disabled={loading}>
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
          <button className="orders-close-button" type="button" onClick={onClose} aria-label="Cerrar panel de pedidos">
            ×
          </button>
        </div>
      </div>

      {user.role === "ADMIN" && (
        <details className="staff-account-panel">
          <summary className="staff-account-toggle">
            <span>
              <strong>Crear cuenta de empleado o administrador</strong>
              <small>Los empleados y administradores no se registran desde la tienda.</small>
            </span>
            <span className="staff-account-toggle-icon" aria-hidden="true">⌄</span>
          </summary>
          <div className="staff-account-content">
            <form className="staff-account-form" onSubmit={createStaffAccount}>
              <label>Nombre completo
                <input value={staffForm.name} onChange={(event) => setStaffForm({ ...staffForm, name: event.target.value })} maxLength={120} required />
              </label>
              <label>Nombre de usuario
                <input value={staffForm.username} onChange={(event) => setStaffForm({ ...staffForm, username: event.target.value })} maxLength={100} autoComplete="username" required />
              </label>
              <label>Correo electrónico
                <input type="email" value={staffForm.email} onChange={(event) => setStaffForm({ ...staffForm, email: event.target.value })} maxLength={254} required />
              </label>
              <label>Contraseña temporal
                <input type="password" value={staffForm.password} onChange={(event) => setStaffForm({ ...staffForm, password: event.target.value })} minLength={10} maxLength={72} autoComplete="new-password" required />
              </label>
              <label>Rol
                <select value={staffForm.role} onChange={(event) => setStaffForm({ ...staffForm, role: event.target.value })}>
                  <option value="EMPLOYEE">Empleado</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </label>
              <button className="checkout-button" type="submit" disabled={creatingAccount}>
                {creatingAccount ? "Creando..." : "Crear cuenta"}
              </button>
            </form>
            {accountMessage && <p className="dashboard-success" role="status">{accountMessage}</p>}
            {accountError && <p className="orders-error" role="alert">{accountError}</p>}
          </div>
        </details>
      )}

      <div className="dashboard-orders">
        <h3>{user.role === "CUSTOMER" ? "Tu historial" : "Pedidos de clientes"}</h3>
        {loading && <p className="orders-empty">Cargando pedidos...</p>}
        {error && <p className="orders-error" role="alert">{error}</p>}
        {!loading && !error && orders.length === 0 && (
          <p className="orders-empty">{user.role === "CUSTOMER" ? "Todavía no tienes pedidos." : "Todavía no hay pedidos registrados."}</p>
        )}
        {!loading && orders.length > 0 && (
          <div className="orders-list">
            {orders.map((order) => (
              <article className="order-card" key={order.id}>
                <div className="order-card-header">
                  <h4>Pedido #{order.id}</h4>
                  {user.role === "CUSTOMER" ? (
                    <span className={`order-status ${String(order.status).toLowerCase()}`}>{statusLabels[order.status] ?? order.status}</span>
                  ) : (
                    <label className="order-status-control">Estado
                      <select value={order.status} disabled={busyOrderId === order.id} onChange={(event) => updateStatus(order.id, event.target.value)}>
                        {Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                      </select>
                    </label>
                  )}
                </div>
                {user.role !== "CUSTOMER" && <p className="order-customer">{order.customerName} · {order.customerEmail}</p>}
                <p className="order-date">{order.createdAt ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.createdAt)) : "Fecha no disponible"}</p>
                <ul className="order-items">
                  {(order.items ?? []).map((item, index) => (
                    <li key={`${order.id}-${item.productId}-${index}`}>
                      <span>{item.quantity} × {item.productName}</span>
                      <span>{money.format(Number(item.lineTotal))}</span>
                    </li>
                  ))}
                </ul>
                <div className="order-total"><span>Total</span><strong>{money.format(Number(order.total))}</strong></div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
