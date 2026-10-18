import { useEffect, useState } from "react";
import "./App.css";
import RoleDashboard from "./RoleDashboard.jsx";
import { apiFetch } from "./api";

const formatoPrecio = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const CART_STORAGE_KEY = "urban-shop-cart";
const AUTH_STORAGE_KEY = "urban-shop-token";
const HERO_BACKGROUNDS = ["#253a32", "#35464b", "#4b3d35", "#403a54"];

function App({ initialAuthError = "" }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [orderMessage, setOrderMessage] = useState("");
  const [orderMessageType, setOrderMessageType] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("featured");
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [token, setToken] = useState(() => window.sessionStorage.getItem(AUTH_STORAGE_KEY) ?? "");
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState(() => initialAuthError ? "login" : null);
  const [authForm, setAuthForm] = useState({ name: "", email: "", identifier: "", password: "" });
  const [authError, setAuthError] = useState(initialAuthError);
  const [authLoading, setAuthLoading] = useState(false);
  const [authProviders, setAuthProviders] = useState({ googleEnabled: false, googleAuthorizationUrl: "" });
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);

      if (!savedCart) {
        return [];
      }

      const parsedCart = JSON.parse(savedCart);
      return Array.isArray(parsedCart) ? parsedCart : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = cart.reduce(
    (total, item) => total + Number(item.price) * item.quantity,
    0,
  );
  const filteredProducts = products
    .filter((product) => {
      const searchableText = `${product.name ?? ""} ${product.model ?? ""} ${product.description ?? ""}`;
      return searchableText
        .toLocaleLowerCase("es-MX")
        .includes(searchTerm.trim().toLocaleLowerCase("es-MX"));
    })
    .sort((productA, productB) => {
      if (sortOrder === "price-asc") {
        return Number(productA.price) - Number(productB.price);
      }

      if (sortOrder === "price-desc") {
        return Number(productB.price) - Number(productA.price);
      }

      if (sortOrder === "name") {
        return (productA.name ?? "").localeCompare(
          productB.name ?? "",
          "es-MX",
        );
      }

      return 0;
    });
  const heroProducts = products.slice(0, 5);
  const heroSlideIndex = heroProducts.length
    ? activeHeroIndex % heroProducts.length
    : 0;
  const activeHeroProduct = heroProducts[heroSlideIndex] ?? null;

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches ?? false;

    if (heroProducts.length < 2 || isHeroPaused || prefersReducedMotion) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveHeroIndex((currentIndex) => (currentIndex + 1) % heroProducts.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [activeHeroIndex, heroProducts.length, isHeroPaused]);

  const cartQuantity = (productId) =>
    cart.find((item) => item.id === productId)?.quantity ?? 0;

  const canAddMore = (product) =>
    cartQuantity(product.id) < Number(product.stock);

  const addToCart = (product) => {
    setCart((currentCart) => {
      const itemInCart = currentCart.find((item) => item.id === product.id);
      const currentQuantity = itemInCart?.quantity ?? 0;

      if (currentQuantity >= Number(product.stock)) {
        return currentCart;
      }

      if (!itemInCart) {
        return [...currentCart, { ...product, quantity: 1 }];
      }

      return currentCart.map((item) =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      );
    });
  };

  const changeCartQuantity = (productId, amount) => {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id !== productId) {
          return item;
        }

        const nextQuantity = item.quantity + amount;
        const limitedQuantity = Math.min(
          Number(item.stock),
          Math.max(1, nextQuantity),
        );

        return { ...item, quantity: limitedQuantity };
      }),
    );
  };

  const removeFromCart = (productId) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== productId),
    );
  };

  const handleCheckout = async (event) => {
    event.preventDefault();
    if (currentUser?.role !== "CUSTOMER" || !token) {
      setOrderMessageType("error");
      setOrderMessage("Inicia sesión con una cuenta de cliente para confirmar el pedido.");
      setAuthMode("login");
      return;
    }
    setOrderMessage("");
    setIsSubmittingOrder(true);

    try {
      const response = await apiFetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerName: currentUser.name,
          customerEmail: currentUser.email,
          shippingAddress,
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.detail ||
            result.message ||
            `No se pudo crear el pedido (HTTP ${response.status}).`,
        );
      }

      setProducts((currentProducts) =>
        currentProducts.map((product) => {
          const orderedItem = result.items?.find(
            (item) => item.productId === product.id,
          );

          if (!orderedItem) {
            return product;
          }

          return {
            ...product,
            stock: Math.max(
              0,
              Number(product.stock) - Number(orderedItem.quantity),
            ),
          };
        }),
      );

      setCart([]);
      setShippingAddress("");
      setOrderMessageType("success");
      setOrderMessage(
        `Pedido #${result.id} creado. Total: ${formatoPrecio.format(Number(result.total))}`,
      );
    } catch (err) {
      setOrderMessageType("error");
      setOrderMessage(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al crear el pedido.",
      );
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/auth/providers")
      .then((response) => response.ok ? response.json() : null)
      .then((providers) => {
        if (!cancelled && providers) {
          setAuthProviders(providers);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await apiFetch("/api/products");

        if (!response.ok) {
          throw new Error(`El servidor respondió con HTTP ${response.status}`);
        }

        const data = await response.json();
        const productList = Array.isArray(data) ? data : data.content;

        if (!Array.isArray(productList)) {
          throw new Error(
            "La respuesta no contiene la lista esperada de productos.",
          );
        }

        setProducts(productList);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Ocurrió un error inesperado.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    let cancelled = false;
    apiFetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("La sesión venció. Inicia sesión de nuevo.");
        }
        return response.json();
      })
      .then((user) => {
        if (!cancelled) setCurrentUser(user);
      })
      .catch(() => {
        if (cancelled) return;
        window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
        setToken("");
        setCurrentUser(null);
      });

    return () => { cancelled = true; };
  }, [token]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    const registering = authMode === "register";

    try {
      const response = await apiFetch(registering ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registering
          ? { name: authForm.name, email: authForm.email, password: authForm.password }
          : { identifier: authForm.identifier, password: authForm.password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.detail || result.message || `No se pudo iniciar sesión (HTTP ${response.status}).`);
      }

      window.sessionStorage.setItem(AUTH_STORAGE_KEY, result.token);
      setCurrentUser(result.user);
      setToken(result.token);
      setAuthMode(null);
      setAuthForm({ name: "", email: "", identifier: "", password: "" });
    } catch (authRequestError) {
      setAuthError(authRequestError instanceof Error ? authRequestError.message : "No se pudo completar el acceso.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await apiFetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } finally {
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
      setToken("");
      setCurrentUser(null);
      setShowOrderHistory(false);
    }
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (storageError) {
      console.error(
        "No se pudo guardar el carrito en este navegador.",
        storageError,
      );
    }
  }, [cart]);

  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">U</span>
          <span>
            URBAN<span className="brand-accent">SHOP</span>
          </span>
        </a>

        <span className="topbar-note">Tu próximo favorito está aquí</span>
        <div className="topbar-actions">
          {currentUser ? (
            <>
              <span className="account-summary">
                {currentUser.name} · {currentUser.role === "CUSTOMER" ? "Cliente" : currentUser.role === "EMPLOYEE" ? "Empleado" : "Administrador"}
              </span>
              <button
                className="cart-toggle"
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  setShowOrderHistory((visible) => !visible);
                }}
                aria-expanded={showOrderHistory}
                aria-controls="orders-panel"
              >
                {showOrderHistory ? "Cerrar panel" : currentUser.role === "CUSTOMER" ? "Mis pedidos" : "Panel de pedidos"}
              </button>
              <button className="cart-toggle" type="button" onClick={handleLogout}>Cerrar sesión</button>
            </>
          ) : (
            <>
              <button className="cart-toggle" type="button" onClick={() => { setAuthMode("login"); setAuthError(""); }}>Iniciar sesión</button>
              <button className="cart-toggle auth-register-button" type="button" onClick={() => { setAuthMode("register"); setAuthError(""); }}>Crear cuenta</button>
            </>
          )}

          <button
            className="cart-toggle"
            type="button"
            onClick={() => {
              setShowOrderHistory(false);
              setIsCartOpen((isOpen) => !isOpen);
            }}
            aria-expanded={isCartOpen}
            aria-controls="cart-panel"
          >
            Carrito ({cartCount})
          </button>
        </div>
      </header>

      {authMode && (
        <div className="auth-overlay" role="presentation">
          <button className="auth-backdrop" type="button" aria-label="Cerrar acceso" onClick={() => setAuthMode(null)} />
          <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <div className="auth-modal-header">
              <div>
                <p className="eyebrow">URBANSHOP</p>
                <h2 id="auth-title">{authMode === "register" ? "Crear cuenta de cliente" : "Iniciar sesión"}</h2>
              </div>
              <button className="cart-close" type="button" onClick={() => setAuthMode(null)} aria-label="Cerrar">×</button>
            </div>
            <p className="auth-intro">
              {authMode === "register" ? "El registro público crea una cuenta de cliente." : "Accede con tu correo o usuario."}
            </p>
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === "register" ? (
                <>
                  <label>Nombre completo
                    <input value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} autoComplete="name" maxLength={120} required />
                  </label>
                  <label>Correo electrónico
                    <input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} autoComplete="email" maxLength={254} required />
                  </label>
                </>
              ) : (
                <label>Correo o usuario
                  <input value={authForm.identifier} onChange={(event) => setAuthForm({ ...authForm, identifier: event.target.value })} autoComplete="username" maxLength={254} required />
                </label>
              )}
              <label>Contraseña
                <input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} autoComplete={authMode === "register" ? "new-password" : "current-password"} minLength={authMode === "register" ? 10 : undefined} maxLength={72} required />
              </label>
              {authMode === "register" && <small>Usa al menos 10 caracteres. Las cuentas de empleado y administrador las crea un administrador.</small>}
              {authError && <p className="auth-error" role="alert">{authError}</p>}
              <button className="checkout-button" type="submit" disabled={authLoading}>
                {authLoading ? "Procesando..." : authMode === "register" ? "Crear cuenta" : "Entrar"}
              </button>
            </form>
            {authProviders.googleEnabled && authProviders.googleAuthorizationUrl && (
              <div className="google-auth-section">
                <div className="auth-divider"><span>o continúa con</span></div>
                <button
                  className="google-auth-button"
                  type="button"
                  disabled={authLoading}
                  onClick={() => window.location.assign(authProviders.googleAuthorizationUrl)}
                >
                  <span className="google-auth-mark" aria-hidden="true">G</span>
                  Continuar con Google
                </button>
              </div>
            )}
            <p className="auth-switch">
              {authMode === "register" ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?"}{" "}
              <button type="button" onClick={() => { setAuthMode(authMode === "register" ? "login" : "register"); setAuthError(""); }}>
                {authMode === "register" ? "Inicia sesión" : "Regístrate como cliente"}
              </button>
            </p>
          </section>
        </div>
      )}

      {isCartOpen && (
        <div className="cart-overlay">
          <button
            className="cart-backdrop"
            type="button"
            onClick={() => setIsCartOpen(false)}
            aria-label="Cerrar carrito"
          />

          <section
            className="cart-panel"
            id="cart-panel"
            aria-label="Carrito de compras"
          >
            <div className="cart-panel-header">
              <h2>Tu carrito</h2>
              <button
                className="cart-close"
                type="button"
                onClick={() => setIsCartOpen(false)}
                aria-label="Cerrar carrito"
              >
                ×
              </button>
            </div>

            {orderMessage && (
              <p
                className={`checkout-message ${orderMessageType}`}
                role={orderMessageType === "error" ? "alert" : "status"}
              >
                {orderMessage}
              </p>
            )}

            {cart.length === 0 ? (
              orderMessageType !== "success" && (
                <p className="cart-empty">Todavía no agregas productos.</p>
              )
            ) : (
              <>
                <ul className="cart-list">
                  {cart.map((item) => (
                    <li className="cart-item" key={item.id}>
                      <div className="cart-item-details">
                        <strong>{item.name}</strong>
                        {item.model?.trim() && (
                          <span className="cart-item-model">{item.model}</span>
                        )}
                        <span>
                          {formatoPrecio.format(Number(item.price))} por unidad
                        </span>
                      </div>

                      <div className="cart-item-actions">
                        <div className="quantity-control">
                          <button
                            className="quantity-button"
                            type="button"
                            onClick={() => changeCartQuantity(item.id, -1)}
                            disabled={item.quantity <= 1}
                            aria-label={`Restar una unidad de ${item.name}`}
                          >
                            −
                          </button>

                          <span className="quantity-value">
                            {item.quantity}
                          </span>

                          <button
                            className="quantity-button"
                            type="button"
                            onClick={() => changeCartQuantity(item.id, 1)}
                            disabled={item.quantity >= Number(item.stock)}
                            aria-label={`Agregar una unidad de ${item.name}`}
                          >
                            +
                          </button>
                        </div>

                        <button
                          className="remove-button"
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                        >
                          Quitar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="cart-total">
                  <span>Subtotal</span>
                  <strong>{formatoPrecio.format(cartSubtotal)}</strong>
                </div>
                <form className="checkout-form" onSubmit={handleCheckout}>
                  <h3>Datos de entrega</h3>
                  {currentUser?.role === "CUSTOMER" ? (
                    <>
                      <p className="checkout-account">Pedido a nombre de <strong>{currentUser.name}</strong> ({currentUser.email})</p>
                      <label>Dirección de entrega
                        <textarea value={shippingAddress} onChange={(event) => setShippingAddress(event.target.value)} autoComplete="street-address" maxLength={500} rows={3} required />
                      </label>
                      <button className="checkout-button" type="submit" disabled={isSubmittingOrder}>
                        {isSubmittingOrder ? "Procesando pedido..." : "Confirmar pedido"}
                      </button>
                    </>
                  ) : (
                    <div className="checkout-login-notice">
                      <p>Inicia sesión con una cuenta de cliente para realizar la compra.</p>
                      {!currentUser && <button className="checkout-button" type="button" onClick={() => { setAuthMode("login"); setIsCartOpen(false); }}>Iniciar sesión</button>}
                    </div>
                  )}
                </form>
              </>
            )}
          </section>
        </div>
      )}

      <main className="page">
        <section
          className="hero"
          role="region"
          aria-roledescription="carrusel"
          aria-label="Productos destacados"
          style={{ backgroundColor: HERO_BACKGROUNDS[heroSlideIndex % HERO_BACKGROUNDS.length] }}
        >
          <div className="hero-content" key={activeHeroProduct?.id ?? "catalog-intro"}>
            <p className="eyebrow">
              {activeHeroProduct ? "PRODUCTO DESTACADO" : "TIENDA EN LÍNEA"}
            </p>
            <h1>
              {activeHeroProduct?.name ?? (
                <>Encuentra algo<br />que te encante.</>
              )}
            </h1>
            <p className="hero-copy">
              {activeHeroProduct
                ? activeHeroProduct.description || "Descubre este producto en nuestro catálogo."
                : "Explora nuestro catálogo y descubre los productos disponibles."}
            </p>
            {activeHeroProduct && (
              <div className="hero-product-details">
                {activeHeroProduct.model?.trim() && (
                  <span>Modelo: {activeHeroProduct.model}</span>
                )}
                <strong>{formatoPrecio.format(Number(activeHeroProduct.price))}</strong>
                <button
                  className="hero-cta"
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Explorar catálogo <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
          </div>

          <div className="hero-stamp" aria-hidden="true">
            <span>{activeHeroProduct ? "DESTACADO" : "SELECCIÓN"}</span>
            <strong>{String(heroSlideIndex + 1).padStart(2, "0")}</strong>
            <span>{activeHeroProduct ? `DE ${heroProducts.length}` : "DE TEMPORADA"}</span>
          </div>

          {heroProducts.length > 1 && (
            <>
              <button
                className="hero-arrow hero-arrow--previous"
                type="button"
                aria-label="Producto destacado anterior"
                onClick={() => setActiveHeroIndex((heroSlideIndex - 1 + heroProducts.length) % heroProducts.length)}
              >
                ‹
              </button>
              <div className="hero-controls" aria-label="Controles del carrusel">
                <div className="hero-dots" aria-label={`Producto ${heroSlideIndex + 1} de ${heroProducts.length}`}>
                  {heroProducts.map((product, index) => (
                    <button
                      className={`hero-dot${index === heroSlideIndex ? " is-active" : ""}`}
                      type="button"
                      key={product.id}
                      aria-label={`Mostrar ${product.name}`}
                      aria-current={index === heroSlideIndex ? "true" : undefined}
                      onClick={() => setActiveHeroIndex(index)}
                    />
                  ))}
                </div>
                <button
                  className="hero-pause"
                  type="button"
                  aria-label={isHeroPaused ? "Reanudar carrusel" : "Pausar carrusel"}
                  onClick={() => setIsHeroPaused((paused) => !paused)}
                >
                  {isHeroPaused ? "▶" : "Ⅱ"}
                </button>
              </div>
              <button
                className="hero-arrow hero-arrow--next"
                type="button"
                aria-label="Siguiente producto destacado"
                onClick={() => setActiveHeroIndex((heroSlideIndex + 1) % heroProducts.length)}
              >
                ›
              </button>
            </>
          )}
        </section>

        <section className="catalog" id="catalog">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DESCUBRE</p>
              <h2>Nuestros productos</h2>
            </div>
            <span className="product-count">
              {filteredProducts.length === products.length
                ? `${products.length} productos`
                : `${filteredProducts.length} de ${products.length} productos`}
            </span>
          </div>

          {!loading && !error && products.length > 0 && (
            <div className="catalog-controls">
              <label>
                Buscar por nombre, modelo o descripción
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Ej. teclado, mouse..."
                />
              </label>

              <label>
                Ordenar por
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                >
                  <option value="featured">Recomendados</option>
                  <option value="price-asc">Menor precio</option>
                  <option value="price-desc">Mayor precio</option>
                  <option value="name">Nombre A-Z</option>
                </select>
              </label>
            </div>
          )}

          {loading && (
            <p className="message">Cargando productos desde la API...</p>
          )}

          {!loading && error && (
            <div className="message error-message" role="alert">
              <strong>No pudimos cargar el catálogo.</strong>
              <p>{error}</p>
              <p>
                Confirma que Spring Boot esté ejecutándose en el puerto 8080.
              </p>
            </div>
          )}

          {!loading && !error && products.length === 0 && (
            <p className="message">
              La API respondió, pero aún no hay productos activos.
            </p>
          )}

          {!loading &&
            !error &&
            products.length > 0 &&
            filteredProducts.length === 0 && (
              <div className="message">
                <p>No encontramos productos con esa búsqueda.</p>
                <button
                  className="clear-search-button"
                  type="button"
                  onClick={() => setSearchTerm("")}
                >
                  Limpiar búsqueda
                </button>
              </div>
            )}

          {!loading && !error && products.length > 0 && (
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <article className="product-card" id={`product-${product.id}`} key={product.id}>
                  <div className="product-art" aria-hidden="true">
                    <span className="product-initial">
                      {(product.name || "P").trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="product-number">
                      PRODUCTO #{product.id}
                    </span>
                  </div>

                  <div className="product-info">
                    <div className="stock-label">
                      <span className="stock-dot" />
                      {Number(product.stock) > 0
                        ? `${product.stock} en stock`
                        : "Agotado"}
                    </div>

                    <h3>{product.name}</h3>
                    {product.model?.trim() && (
                      <p className="product-model">Modelo: {product.model}</p>
                    )}
                    <p className="description">
                      {product.description || "Sin descripción disponible."}
                    </p>

                    <div className="price-row">
                      <span>Precio</span>
                      <strong>
                        {formatoPrecio.format(Number(product.price))}
                      </strong>
                    </div>
                    <button
                      className="add-button"
                      type="button"
                      onClick={() => addToCart(product)}
                      disabled={!canAddMore(product)}
                    >
                      {Number(product.stock) === 0
                        ? "Agotado"
                        : canAddMore(product)
                          ? "Agregar al carrito"
                          : "Stock máximo alcanzado"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      {showOrderHistory && currentUser && (
        <div className="orders-overlay">
          <button
            className="orders-backdrop"
            type="button"
            onClick={() => setShowOrderHistory(false)}
            aria-label="Cerrar panel de pedidos"
          />
          <section
            className="orders-panel"
            id="orders-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="orders-dialog-title"
          >
            <RoleDashboard
              user={currentUser}
              token={token}
              onClose={() => setShowOrderHistory(false)}
              onProductCreated={(product) => setProducts((currentProducts) => [...currentProducts, product])}
            />
          </section>
        </div>
      )}
    </>
  );
}

export default App;
