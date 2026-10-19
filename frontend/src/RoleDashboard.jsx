import { useCallback, useEffect, useState } from "react";
import "./RoleDashboard.css";
import { apiFetch } from "./api";
import { PRODUCT_CATEGORIES } from "./productCategories";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const statusLabels = { PENDING: "Pendiente", PAID: "Pagado", CANCELLED: "Cancelado" };
const roleLabels = { CUSTOMER: "Cliente", EMPLOYEE: "Empleado", ADMIN: "Administrador" };
const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;
const PRODUCT_IMAGE_TYPES = "image/jpeg,image/png,image/webp";
const emptyProductForm = { name: "", model: "", image: null, category: "", description: "", price: "", stock: "0" };

export default function RoleDashboard({ user, token, onClose, onProductChanged }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [staffForm, setStaffForm] = useState({ name: "", username: "", email: "", password: "", role: "EMPLOYEE" });
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");
  const [accountError, setAccountError] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [productMessage, setProductMessage] = useState("");
  const [productError, setProductError] = useState("");
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [productImageInputKey, setProductImageInputKey] = useState(0);
  const [managedProducts, setManagedProducts] = useState([]);
  const [loadingManagedProducts, setLoadingManagedProducts] = useState(true);
  const [managedProductsError, setManagedProductsError] = useState("");
  const [editingProductId, setEditingProductId] = useState(null);
  const [savingProductId, setSavingProductId] = useState(null);
  const [productEditMessage, setProductEditMessage] = useState("");
  const [productEditError, setProductEditError] = useState("");
  const [imageFiles, setImageFiles] = useState({});
  const [uploadingImageId, setUploadingImageId] = useState(null);
  const [imageUploadError, setImageUploadError] = useState("");
  const canManageProducts = user.role === "EMPLOYEE" || user.role === "ADMIN";

  const fetchOrders = useCallback(async () => {
    const path = user.role === "CUSTOMER"
      ? "/api/orders/mine?page=0&size=100"
      : "/api/orders?page=0&size=100&sort=createdAt,desc";
    const response = await apiFetch(path, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || data.message || `No se pudieron cargar los pedidos (HTTP ${response.status}).`);
    }
    return Array.isArray(data.content) ? data.content : [];
  }, [token, user.role]);

  const fetchManagedProducts = useCallback(async () => {
    const response = await apiFetch("/api/products?page=0&size=100");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || data.message || `No se pudo cargar el catálogo (HTTP ${response.status}).`);
    }
    return Array.isArray(data.content) ? data.content : [];
  }, []);

  useEffect(() => {
    if (!canManageProducts) return undefined;
    let cancelled = false;
    setLoadingManagedProducts(true);
    fetchManagedProducts()
      .then((data) => { if (!cancelled) setManagedProducts(data); })
      .catch((loadError) => {
        if (!cancelled) setManagedProductsError(loadError instanceof Error ? loadError.message : "No se pudo cargar el catálogo.");
      })
      .finally(() => { if (!cancelled) setLoadingManagedProducts(false); });
    return () => { cancelled = true; };
  }, [canManageProducts, fetchManagedProducts]);

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
      const response = await apiFetch(`/api/orders/${orderId}/status`, {
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
      const response = await apiFetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(staffForm),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || data.message || `No se pudo crear la cuenta (HTTP ${response.status}).`);
      setAccountMessage(`Cuenta de ${roleLabels[data.role] ?? data.role} creada para ${data.username}.`);
      setStaffForm({ name: "", username: "", email: "", password: "", role: "EMPLOYEE" });
      setShowStaffPassword(false);
    } catch (createError) {
      setAccountError(createError instanceof Error ? createError.message : "No se pudo crear la cuenta.");
    } finally {
      setCreatingAccount(false);
    }
  };

  const createProduct = async (event) => {
    event.preventDefault();
    setCreatingProduct(true);
    setProductError("");
    setProductMessage("");

    try {
      const formData = new FormData();
      formData.append("product", new Blob([JSON.stringify({
        name: productForm.name.trim(),
        model: productForm.model.trim(),
        category: productForm.category,
        description: productForm.description.trim(),
        price: Number(productForm.price),
        stock: Number(productForm.stock),
      })], { type: "application/json" }));
      formData.append("image", productForm.image);
      const response = await apiFetch("/api/products", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || data.message || `No se pudo agregar el producto (HTTP ${response.status}).`);
      }

      setProductMessage(`Producto “${data.name}” agregado al catálogo (#${data.id}).`);
      setProductForm(emptyProductForm);
      setProductImageInputKey((key) => key + 1);
      setManagedProducts((current) => [data, ...current.filter((product) => product.id !== data.id)]);
      onProductChanged?.(data);
    } catch (createError) {
      setProductError(createError instanceof Error ? createError.message : "No se pudo agregar el producto.");
    } finally {
      setCreatingProduct(false);
    }
  };

  const updateProduct = async (event, product) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const request = {
      name: String(formData.get("name") ?? "").trim(),
      model: String(formData.get("model") ?? "").trim(),
      imageUrl: product.imageUrl ?? null,
      category: String(formData.get("category") ?? "OTHER"),
      description: String(formData.get("description") ?? "").trim(),
      price: Number(formData.get("price")),
      stock: Number(formData.get("stock")),
    };

    setSavingProductId(product.id);
    setProductEditError("");
    setProductEditMessage("");
    try {
      const response = await apiFetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || data.message || `No se pudo actualizar el producto (HTTP ${response.status}).`);
      }

      setManagedProducts((current) => current.map((item) => item.id === product.id ? data : item));
      onProductChanged?.(data);
      setEditingProductId(null);
      setProductEditMessage(`Se actualizaron los datos de “${data.name}”.`);
    } catch (updateError) {
      setProductEditError(updateError instanceof Error ? updateError.message : "No se pudo actualizar el producto.");
    } finally {
      setSavingProductId(null);
    }
  };

  const selectProductImage = (productId, file, clearInput) => {
    setImageUploadError("");
    if (file && file.size > MAX_PRODUCT_IMAGE_SIZE) {
      clearInput?.();
      setImageUploadError("La imagen no puede superar 5 MB.");
      return;
    }
    setImageFiles((current) => ({ ...current, [productId]: file ?? null }));
  };

  const updateProductImage = async (productId) => {
    const image = imageFiles[productId];
    if (!image) return;
    setUploadingImageId(productId);
    setImageUploadError("");
    try {
      const formData = new FormData();
      formData.append("image", image);
      const response = await apiFetch(`/api/products/${productId}/image`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || data.message || `No se pudo actualizar la imagen (HTTP ${response.status}).`);
      }
      setManagedProducts((current) => current.map((product) => product.id === productId ? data : product));
      setImageFiles((current) => ({ ...current, [productId]: null }));
      onProductChanged?.(data);
    } catch (uploadError) {
      setImageUploadError(uploadError instanceof Error ? uploadError.message : "No se pudo actualizar la imagen.");
    } finally {
      setUploadingImageId(null);
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

      {canManageProducts && (
        <details className="staff-account-panel product-management-panel">
          <summary className="staff-account-toggle">
            <span>
              <strong>Editar productos del catálogo</strong>
              <small>Modifica nombre, modelo, categoría, descripción, precio o existencias.</small>
            </span>
            <span className="staff-account-toggle-icon" aria-hidden="true">⌄</span>
          </summary>
          <div className="staff-account-content">
            {loadingManagedProducts && <p className="orders-description">Cargando productos…</p>}
            {managedProductsError && <p className="orders-error" role="alert">{managedProductsError}</p>}
            {productEditMessage && <p className="dashboard-success" role="status">{productEditMessage}</p>}
            {productEditError && <p className="orders-error" role="alert">{productEditError}</p>}
            {!loadingManagedProducts && !managedProductsError && managedProducts.length === 0 && (
              <p className="orders-description">Todavía no hay productos en el catálogo.</p>
            )}
            {managedProducts.length > 0 && (
              <div className="product-edit-list">
                {managedProducts.map((product) => (
                  <article className="product-edit-card" key={product.id}>
                    <div className="product-edit-card-heading">
                      <div className="product-image-management-thumbnail">
                        <span>{(product.name || "P").trim().charAt(0).toUpperCase()}</span>
                        {product.imageUrl && (
                          <img src={product.imageUrl} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />
                        )}
                      </div>
                      <div className="product-image-management-name">
                        <strong>{product.name}</strong>
                        <small>Producto #{product.id}</small>
                      </div>
                      {editingProductId !== product.id && (
                        <button
                          className="clear-search-button"
                          type="button"
                          onClick={() => {
                            setEditingProductId(product.id);
                            setProductEditError("");
                            setProductEditMessage("");
                          }}
                        >
                          Editar datos
                        </button>
                      )}
                    </div>
                    {editingProductId === product.id && (
                      <form className="staff-account-form product-edit-form" onSubmit={(event) => updateProduct(event, product)}>
                        <label>Nombre del producto
                          <input name="name" defaultValue={product.name} maxLength={150} required />
                        </label>
                        <label>Modelo
                          <input name="model" defaultValue={product.model ?? ""} maxLength={120} />
                        </label>
                        <label>Categoría
                          <select name="category" defaultValue={product.category ?? "OTHER"} required>
                            {PRODUCT_CATEGORIES.map((category) => (
                              <option key={category.value} value={category.value}>{category.label}</option>
                            ))}
                          </select>
                        </label>
                        <label>Precio (MXN)
                          <input name="price" type="number" defaultValue={product.price} min="0.01" step="0.01" required />
                        </label>
                        <label>Existencias
                          <input name="stock" type="number" defaultValue={product.stock} min="0" step="1" required />
                        </label>
                        <label className="product-description-field">Descripción
                          <textarea name="description" defaultValue={product.description ?? ""} maxLength={5000} rows={3} />
                        </label>
                        <div className="product-edit-actions">
                          <button className="checkout-button" type="submit" disabled={savingProductId === product.id}>
                            {savingProductId === product.id ? "Guardando cambios…" : "Guardar cambios"}
                          </button>
                          <button className="clear-search-button" type="button" disabled={savingProductId === product.id} onClick={() => setEditingProductId(null)}>
                            Cancelar
                          </button>
                        </div>
                      </form>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </details>
      )}

      {canManageProducts && (
        <details className="staff-account-panel product-management-panel">
          <summary className="staff-account-toggle">
            <span>
              <strong>Agregar producto al catálogo</strong>
              <small>Disponible para empleados y administradores.</small>
            </span>
            <span className="staff-account-toggle-icon" aria-hidden="true">⌄</span>
          </summary>
          <div className="staff-account-content">
            <form className="staff-account-form" onSubmit={createProduct}>
              <label>Nombre del producto
                <input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} maxLength={150} required />
              </label>
              <label>Modelo
                <input value={productForm.model} onChange={(event) => setProductForm({ ...productForm, model: event.target.value })} maxLength={120} />
              </label>
              <label className="product-image-file-field">Imagen del producto (JPG, PNG o WEBP · máximo 5 MB)
                <input
                  key={productImageInputKey}
                  type="file"
                  accept={PRODUCT_IMAGE_TYPES}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file && file.size > MAX_PRODUCT_IMAGE_SIZE) {
                      event.target.value = "";
                      setProductError("La imagen no puede superar 5 MB.");
                      return;
                    }
                    setProductError("");
                    setProductForm({ ...productForm, image: file });
                  }}
                  required
                />
              </label>
              <label>Categoría
                <select value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} required>
                  <option value="" disabled>Selecciona una categoría</option>
                  {PRODUCT_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
              </label>
              <label className="product-description-field">Descripción
                <textarea value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} maxLength={5000} rows={3} />
              </label>
              <label>Precio (MXN)
                <input type="number" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} min="0.01" step="0.01" required />
              </label>
              <label>Existencias
                <input type="number" value={productForm.stock} onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })} min="0" step="1" required />
              </label>
              <button className="checkout-button" type="submit" disabled={creatingProduct}>
                {creatingProduct ? "Agregando producto..." : "Agregar producto"}
              </button>
            </form>
            {productMessage && <p className="dashboard-success" role="status">{productMessage}</p>}
            {productError && <p className="orders-error" role="alert">{productError}</p>}
          </div>
        </details>
      )}

      {canManageProducts && (
        <details className="staff-account-panel product-management-panel">
          <summary className="staff-account-toggle">
            <span>
              <strong>Actualizar imágenes del catálogo</strong>
              <small>Selecciona una foto para cambiar la de un producto existente.</small>
            </span>
            <span className="staff-account-toggle-icon" aria-hidden="true">⌄</span>
          </summary>
          <div className="staff-account-content">
            {loadingManagedProducts && <p className="orders-description">Cargando productos…</p>}
            {managedProductsError && <p className="orders-error" role="alert">{managedProductsError}</p>}
            {imageUploadError && <p className="orders-error" role="alert">{imageUploadError}</p>}
            {!loadingManagedProducts && !managedProductsError && managedProducts.length === 0 && (
              <p className="orders-description">Todavía no hay productos en el catálogo.</p>
            )}
            {managedProducts.length > 0 && (
              <div className="product-image-management-list">
                {managedProducts.map((product) => (
                  <article className="product-image-management-item" key={product.id}>
                    <div className="product-image-management-info">
                      <div className="product-image-management-thumbnail">
                        <span>{(product.name || "P").trim().charAt(0).toUpperCase()}</span>
                        {product.imageUrl && (
                          <img src={product.imageUrl} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />
                        )}
                      </div>
                      <div className="product-image-management-name">
                        <strong>{product.name}</strong>
                        <small>{product.imageUrl ? "Imagen cargada" : "Sin imagen"}</small>
                      </div>
                    </div>
                    <div className="product-image-change-controls">
                      <label>
                        <span>{imageFiles[product.id]?.name ?? "Seleccionar imagen"}</span>
                        <input
                          key={`${product.id}-${product.imageUrl ?? "empty"}`}
                          type="file"
                          accept={PRODUCT_IMAGE_TYPES}
                          onChange={(event) => selectProductImage(
                            product.id,
                            event.target.files?.[0] ?? null,
                            () => { event.target.value = ""; }
                          )}
                        />
                      </label>
                      <button
                        className="clear-search-button"
                        type="button"
                        onClick={() => updateProductImage(product.id)}
                        disabled={!imageFiles[product.id] || uploadingImageId === product.id}
                      >
                        {uploadingImageId === product.id ? "Subiendo…" : "Guardar imagen"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </details>
      )}

      {user.role === "ADMIN" && (
        <details className="staff-account-panel" onToggle={(event) => { if (!event.currentTarget.open) setShowStaffPassword(false); }}>
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
                <span className="staff-password-field">
                  <input type={showStaffPassword ? "text" : "password"} value={staffForm.password} onChange={(event) => setStaffForm({ ...staffForm, password: event.target.value })} minLength={10} maxLength={72} autoComplete="new-password" required />
                  <button
                    className="password-visibility-toggle"
                    type="button"
                    onClick={() => setShowStaffPassword((visible) => !visible)}
                    aria-label={showStaffPassword ? "Ocultar contraseña temporal" : "Mostrar contraseña temporal"}
                    aria-pressed={showStaffPassword}
                  >
                    {showStaffPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </span>
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
