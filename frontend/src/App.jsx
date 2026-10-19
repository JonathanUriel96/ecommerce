import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./App.css";
import "./Theme.css";
import RoleDashboard from "./RoleDashboard.jsx";
import { apiFetch } from "./api";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS } from "./productCategories";
import { clearSession, setCurrentUser, setSession } from "./features/auth/authSlice";
import {
  addCartItem,
  changeCartItemQuantity,
  clearCart,
  removeCartItem,
  replaceCart,
} from "./features/cart/cartSlice";
import {
  setProducts,
  setProductsError,
  updateStockFromOrder,
  upsertProduct,
} from "./features/products/productsSlice";

const formatoPrecio = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const CART_STORAGE_KEY = "urban-shop-cart";
const AUTH_STORAGE_KEY = "urban-shop-token";
const THEME_STORAGE_KEY = "urban-shop-theme";
const ADDRESS_BOOK_STORAGE_PREFIX = "urban-shop-addresses:";
const HERO_BACKGROUNDS = ["#253a32", "#35464b", "#4b3d35", "#403a54"];
const MEXICAN_STATES = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche",
  "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima",
  "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo",
  "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca",
  "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa",
  "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán",
  "Zacatecas",
];
const EMPTY_ADDRESS_FORM = {
  firstName: "",
  lastName: "",
  company: "",
  phone: "",
  gender: "",
  street: "",
  exteriorNumber: "",
  interiorNumber: "",
  reference: "",
  neighborhood: "",
  postalCode: "",
  city: "",
  state: "",
};
const CATEGORY_HERO_COPY = {
  MOUSE: "Encuentra opciones precisas y cómodas para trabajar o jugar.",
  KEYBOARD: "Explora teclados para completar tu espacio de trabajo o juego.",
  HEADPHONES: "Descubre opciones para escuchar, jugar y comunicarte.",
  MONITOR: "Encuentra la pantalla ideal para tu espacio y tus proyectos.",
  OTHER: "Explora los productos disponibles en esta categoría.",
};

function formatDescriptionInline(text, keyPrefix) {
  return text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g).map((part, index) => {
    const isBold = (part.startsWith("**") && part.endsWith("**"))
      || (part.startsWith("__") && part.endsWith("__"));

    return isBold
      ? <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>
      : part;
  });
}

function renderProductDescription(description) {
  const text = String(description ?? "").trim();
  if (!text) return <p>Este producto aún no tiene una descripción.</p>;

  const blocks = [];
  let paragraphLines = [];
  let listItems = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    const key = `description-paragraph-${blocks.length}`;
    blocks.push(<p key={key}>{formatDescriptionInline(paragraphLines.join(" "), key)}</p>);
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    const key = `description-list-${blocks.length}`;
    blocks.push(
      <ul className="product-description-list" key={key}>
        {listItems.map((item, index) => (
          <li key={`${key}-${index}`}>{formatDescriptionInline(item, `${key}-${index}`)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  text.replace(/\r\n?/g, "\n").split("\n").forEach((line) => {
    const headingMatch = line.match(/^\s{0,3}(#{1,4})\s+(.+?)\s*$/);
    const listMatch = line.match(/^\s*(?:[-*•])\s+(.+?)\s*$/);

    if (!line.trim()) {
      flushParagraph();
      flushList();
      return;
    }

    if (headingMatch) {
      flushParagraph();
      flushList();
      const Heading = headingMatch[1].length <= 3 ? "h3" : "h4";
      const key = `description-heading-${blocks.length}`;
      blocks.push(<Heading key={key}>{formatDescriptionInline(headingMatch[2], key)}</Heading>);
      return;
    }

    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1]);
      return;
    }

    flushList();
    paragraphLines.push(line.trim());
  });

  flushParagraph();
  flushList();
  return blocks;
}

function getCatalogDescription(product) {
  const shortDescription = String(product.shortDescription ?? "").trim();
  if (shortDescription) return shortDescription;

  // Para productos creados antes del campo breve, conserva el catálogo compacto.
  const plainText = String(product.description ?? "")
    .replace(/^\s*#{1,4}\s+/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/\*\*|__/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!plainText) return "Sin descripción disponible.";
  if (plainText.length <= 140) return plainText;
  return `${plainText.slice(0, 137).replace(/\s+\S*$/, "").trimEnd()}…`;
}

function formatAddressForDisplay(address) {
  const street = [
    address.street,
    address.exteriorNumber && `No. ${address.exteriorNumber}`,
    address.interiorNumber && `Int. ${address.interiorNumber}`,
  ].filter(Boolean).join(" ");
  const location = [
    address.neighborhood,
    address.postalCode && `CP ${address.postalCode}`,
    address.city,
    address.state,
  ].filter(Boolean).join(", ");

  return [street, location, address.reference && `Referencia: ${address.reference}`]
    .filter(Boolean)
    .join(" · ");
}

function formatAddressForOrder(address) {
  const recipient = `${address.firstName} ${address.lastName}`.trim();
  const street = [
    address.street,
    address.exteriorNumber,
    address.interiorNumber && `Int. ${address.interiorNumber}`,
  ].filter(Boolean).join(" ");
  return [
    `Destinatario: ${recipient}`,
    address.company && `Empresa: ${address.company}`,
    `Tel: ${address.phone}`,
    `${street}, ${address.neighborhood}, CP ${address.postalCode}, ${address.city}, ${address.state}`,
    address.reference && `Ref: ${address.reference}`,
  ].filter(Boolean).join(" | ").slice(0, 500);
}

function App({ initialAuthError = "" }) {
  const productPageId = new URLSearchParams(window.location.search).get("productId");
  const dispatch = useDispatch();
  const { items: products, loading, error } = useSelector((state) => state.products);
  const cart = useSelector((state) => state.cart);
  const { token, currentUser } = useSelector((state) => state.auth);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressBookLoadedFor, setAddressBookLoadedFor] = useState("");
  const [isAddressEditorOpen, setIsAddressEditorOpen] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState("");
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);
  const [orderMessage, setOrderMessage] = useState("");
  const [orderMessageType, setOrderMessageType] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("featured");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [productPageProduct, setProductPageProduct] = useState(null);
  const [selectedProductImage, setSelectedProductImage] = useState({ productId: null, url: "" });
  const [productPageLoading, setProductPageLoading] = useState(Boolean(productPageId));
  const [productPageError, setProductPageError] = useState("");
  const [productPageCartMessage, setProductPageCartMessage] = useState("");
  const [productPageQuantity, setProductPageQuantity] = useState(1);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return window.localStorage.getItem(THEME_STORAGE_KEY) === "blue" ? "blue" : "light";
    } catch {
      return "light";
    }
  });
  const [themeTransition, setThemeTransition] = useState("");
  const [authMode, setAuthMode] = useState(() => initialAuthError ? "login" : null);
  const [authForm, setAuthForm] = useState({ name: "", email: "", identifier: "", password: "" });
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authError, setAuthError] = useState(initialAuthError);
  const [authLoading, setAuthLoading] = useState(false);
  const [authProviders, setAuthProviders] = useState({ googleEnabled: false, googleAuthorizationUrl: "" });
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const addressStorageKey = currentUser?.role === "CUSTOMER" && currentUser.email
    ? `${ADDRESS_BOOK_STORAGE_PREFIX}${currentUser.email.trim().toLowerCase()}`
    : "";
  const selectedAddress = savedAddresses.find((address) => address.id === selectedAddressId) ?? null;
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = cart.reduce(
    (total, item) => total + Number(item.price) * item.quantity,
    0,
  );
  const filteredProducts = products
    .filter((product) => {
      const matchesCategory = categoryFilter === "ALL" || (product.category ?? "OTHER") === categoryFilter;
      const categoryLabel = PRODUCT_CATEGORY_LABELS[product.category] ?? PRODUCT_CATEGORY_LABELS.OTHER;
      const searchableText = `${product.name ?? ""} ${product.model ?? ""} ${product.shortDescription ?? ""} ${product.description ?? ""} ${categoryLabel}`;
      return matchesCategory && searchableText
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
  const heroCategories = PRODUCT_CATEGORIES
    .map(({ value, label }) => ({
      value,
      label,
      products: products.filter((product) => (product.category ?? "OTHER") === value),
    }))
    .filter((category) => category.products.length > 0);
  const heroSlideIndex = heroCategories.length
    ? activeHeroIndex % heroCategories.length
    : 0;
  const activeHeroCategory = heroCategories[heroSlideIndex] ?? null;

  useEffect(() => {
    if (!addressStorageKey) {
      setSavedAddresses([]);
      setSelectedAddressId("");
      setAddressBookLoadedFor("");
      setShowAddressPicker(false);
      return;
    }

    let addresses = [];
    let storedSelectedAddressId = "";
    try {
      const storedAddressBook = JSON.parse(window.localStorage.getItem(addressStorageKey) ?? "{}");
      addresses = Array.isArray(storedAddressBook)
        ? storedAddressBook
        : Array.isArray(storedAddressBook.addresses) ? storedAddressBook.addresses : [];
      storedSelectedAddressId = storedAddressBook.selectedAddressId ?? "";
    } catch {
      addresses = [];
    }

    const initialSelection = addresses.some((address) => address.id === storedSelectedAddressId)
      ? storedSelectedAddressId
      : addresses[0]?.id ?? "";
    setSavedAddresses(addresses);
    setSelectedAddressId(initialSelection);
    setAddressBookLoadedFor(addressStorageKey);
    setShowAddressPicker(false);
  }, [addressStorageKey]);

  useEffect(() => {
    if (!addressStorageKey || addressBookLoadedFor !== addressStorageKey) return;
    try {
      window.localStorage.setItem(addressStorageKey, JSON.stringify({
        addresses: savedAddresses,
        selectedAddressId,
      }));
    } catch {
      // Las direcciones siguen disponibles durante esta sesión si el almacenamiento no está disponible.
    }
  }, [addressBookLoadedFor, addressStorageKey, savedAddresses, selectedAddressId]);

  useEffect(() => {
    if (!isAddressEditorOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsAddressEditorOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isAddressEditorOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The selected theme still works for this visit if storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.siteTheme = theme;
    return () => {
      delete document.documentElement.dataset.siteTheme;
    };
  }, [theme]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches ?? false;

    if (heroCategories.length < 2 || isHeroPaused || prefersReducedMotion) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveHeroIndex((currentIndex) => (currentIndex + 1) % heroCategories.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [activeHeroIndex, heroCategories.length, isHeroPaused]);

  const cartQuantity = (productId) =>
    cart.find((item) => item.id === productId)?.quantity ?? 0;

  const canAddMore = (product) =>
    cartQuantity(product.id) < Number(product.stock);

  const addToCart = (product, quantityToAdd = 1) => {
    dispatch(addCartItem({ product, quantity: quantityToAdd }));
  };

  const changeCartQuantity = (productId, amount) => {
    dispatch(changeCartItemQuantity({ productId, amount }));
  };

  const removeFromCart = (productId) => {
    dispatch(removeCartItem(productId));
  };

  const startAddingAddress = () => {
    const nameParts = String(currentUser?.name ?? "").trim().split(/\s+/).filter(Boolean);
    setAddressForm({
      ...EMPTY_ADDRESS_FORM,
      firstName: nameParts[0] ?? "",
      lastName: nameParts.slice(1).join(" "),
    });
    setEditingAddressId("");
    setIsAddressEditorOpen(true);
  };

  const startEditingAddress = () => {
    if (!selectedAddress) return;
    setAddressForm({ ...EMPTY_ADDRESS_FORM, ...selectedAddress });
    setEditingAddressId(selectedAddress.id);
    setIsAddressEditorOpen(true);
  };

  const handleSaveAddress = (event) => {
    event.preventDefault();
    const normalizedAddress = Object.fromEntries(
      Object.entries(addressForm).map(([field, value]) => [field, value.trim()]),
    );
    const addressId = editingAddressId || window.crypto?.randomUUID?.() || String(Date.now());
    const savedAddress = { ...normalizedAddress, id: addressId };

    setSavedAddresses((addresses) => editingAddressId
      ? addresses.map((address) => address.id === editingAddressId ? savedAddress : address)
      : [...addresses, savedAddress]);
    setSelectedAddressId(addressId);
    setShowAddressPicker(false);
    setIsAddressEditorOpen(false);
    setEditingAddressId("");
    setAddressForm(EMPTY_ADDRESS_FORM);
  };

  const updateAddressField = (field, value) => {
    setAddressForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const handleCheckout = async (event) => {
    event.preventDefault();
    if (currentUser?.role !== "CUSTOMER" || !token) {
      setOrderMessageType("error");
      setOrderMessage("Inicia sesión con una cuenta de cliente para confirmar el pedido.");
      setAuthMode("login");
      return;
    }
    if (!selectedAddress) {
      setOrderMessageType("error");
      setOrderMessage("Agrega o selecciona una dirección de entrega para continuar.");
      setIsAddressEditorOpen(true);
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
          shippingAddress: formatAddressForOrder(selectedAddress),
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

      dispatch(updateStockFromOrder(result.items ?? []));
      dispatch(clearCart());
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

        dispatch(setProducts(productList));
      } catch (err) {
        dispatch(setProductsError(
          err instanceof Error ? err.message : "Ocurrió un error inesperado.",
        ));
      }
    }

    loadProducts();
  }, []);

  useEffect(() => {
    if (!productPageId) {
      return undefined;
    }

    let cancelled = false;

    apiFetch(`/api/products/${encodeURIComponent(productPageId)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.detail || data.message || `No se pudo cargar el producto (HTTP ${response.status}).`);
        }
        return data;
      })
      .then((product) => {
        if (!cancelled) setProductPageProduct(product);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setProductPageError(loadError instanceof Error ? loadError.message : "No se pudo cargar el producto.");
        }
      })
      .finally(() => {
        if (!cancelled) setProductPageLoading(false);
      });

    return () => { cancelled = true; };
  }, [productPageId]);

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
        if (!cancelled) dispatch(setCurrentUser(user));
      })
      .catch(() => {
        if (cancelled) return;
        window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
        dispatch(clearSession());
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
        const fallbackMessage = registering
          ? `No se pudo crear la cuenta (HTTP ${response.status}).`
          : `No se pudo iniciar sesión (HTTP ${response.status}).`;
        throw new Error(result.detail || result.message || fallbackMessage);
      }

      window.sessionStorage.setItem(AUTH_STORAGE_KEY, result.token);
      dispatch(setSession({ token: result.token, user: result.user }));
      setAuthMode(null);
      setAuthForm({ name: "", email: "", identifier: "", password: "" });
      setShowAuthPassword(false);
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
      dispatch(clearSession());
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

  useEffect(() => {
    const syncCartFromOtherTab = (event) => {
      if (event.key !== CART_STORAGE_KEY) return;
      try {
        const savedCart = event.newValue ? JSON.parse(event.newValue) : [];
        dispatch(replaceCart(Array.isArray(savedCart) ? savedCart : []));
      } catch {
        dispatch(clearCart());
      }
    };

    window.addEventListener("storage", syncCartFromOtherTab);
    return () => window.removeEventListener("storage", syncCartFromOtherTab);
  }, []);

  if (productPageId) {
    const product = productPageProduct;
    const productImageUrls = product
      ? (Array.isArray(product.imageUrls) ? [...product.imageUrls] : []).filter((url) => typeof url === "string" && url.trim())
      : [];
    if (product?.imageUrl && !productImageUrls.includes(product.imageUrl)) {
      productImageUrls.unshift(product.imageUrl);
    }
    const activeProductImage = product && selectedProductImage.productId === product.id
      && productImageUrls.includes(selectedProductImage.url)
      ? selectedProductImage.url
      : productImageUrls[0];
    const remainingStock = product
      ? Math.max(0, Number(product.stock) - cartQuantity(product.id))
      : 0;
    const selectedQuantity = Math.min(
      productPageQuantity,
      Math.max(1, remainingStock),
    );
    return (
      <div className="app-shell product-page-shell" data-theme={theme}>
        {themeTransition && (
          <div
            className={`theme-transition-effect theme-transition-effect--${themeTransition}`}
            aria-hidden="true"
            onAnimationEnd={() => setThemeTransition("")}
          />
        )}
        <header className="topbar product-page-topbar">
          <a className="brand" href="/">
            <span className="brand-mark">U</span>
            <span>URBAN<span className="brand-accent">SHOP</span></span>
          </a>
          <div className="product-page-header-actions">
            <button
              className={`theme-toggle${theme === "blue" ? " is-blue" : ""}`}
              type="button"
              onClick={() => {
                const nextTheme = theme === "blue" ? "light" : "blue";
                const prefersReducedMotion = window.matchMedia?.(
                  "(prefers-reduced-motion: reduce)",
                ).matches ?? false;
                setThemeTransition(prefersReducedMotion ? "" : nextTheme);
                setTheme(nextTheme);
              }}
              role="switch"
              aria-checked={theme === "blue"}
              aria-label="Modo azul"
              title={theme === "blue" ? "Modo azul activado. Cambiar al tema claro" : "Modo azul desactivado. Activar tema azul"}
            >
              <span className="theme-switch-track" aria-hidden="true">
                <span className="theme-switch-thumb">
                  <span className="theme-toggle-icon">{theme === "blue" ? "☾" : "☼"}</span>
                </span>
              </span>
            </button>
            <a className="cart-toggle product-page-back-link" href="/#catalog">Volver al catálogo</a>
          </div>
        </header>

        <main className="product-page-main">
          <nav className="product-page-breadcrumb" aria-label="Ruta de navegación">
            <a href="/#catalog">Catálogo</a>
            <span aria-hidden="true">›</span>
            <span aria-current="page">{product?.name ?? "Detalle del producto"}</span>
          </nav>

          {productPageLoading && <p className="message">Cargando detalles del producto…</p>}
          {productPageError && (
            <div className="message error-message" role="alert">
              <strong>No pudimos cargar este producto.</strong>
              <p>{productPageError}</p>
              <a className="product-details-continue" href="/#catalog">Volver al catálogo</a>
            </div>
          )}

          {!productPageLoading && !productPageError && product && (
            <article className={`product-details-modal product-page-layout product-card--${(product.category ?? "OTHER").toLowerCase()}`}>
              <div className="product-page-overview">
                <div className="product-page-gallery-column">
                  <div className="product-details-gallery">
                    <div className="product-details-image-stage">
                      <span className="product-initial" aria-hidden="true">
                        {(product.name || "P").trim().charAt(0).toUpperCase()}
                      </span>
                      {activeProductImage ? (
                        <img
                          className="product-details-image"
                          src={activeProductImage}
                          alt={`${product.name}, imagen del producto`}
                          onError={(event) => { event.currentTarget.hidden = true; }}
                        />
                      ) : (
                        <span className="product-details-no-image">Imagen no disponible</span>
                      )}
                      <span className="product-number">PRODUCTO #{product.id}</span>
                    </div>
                    {productImageUrls.length > 1 && (
                      <div className="product-details-thumbnails" role="group" aria-label="Imágenes del producto">
                        {productImageUrls.map((imageUrl, index) => (
                          <button
                            className={`product-details-thumbnail${activeProductImage === imageUrl ? " is-selected" : ""}`}
                            type="button"
                            key={`${product.id}-${imageUrl}`}
                            onClick={() => setSelectedProductImage({ productId: product.id, url: imageUrl })}
                            aria-label={`Mostrar imagen ${index + 1} de ${productImageUrls.length}`}
                            aria-pressed={activeProductImage === imageUrl}
                          >
                            <img src={imageUrl} alt="" loading="lazy" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <section className="product-page-more-info" aria-labelledby="product-more-info-title">
                    <h2 id="product-more-info-title">Más información</h2>
                    <div className="product-page-more-info-grid">
                      <div>
                        <span>Modelo</span>
                        <strong>{product.model?.trim() || "No especificado"}</strong>
                      </div>
                      <div>
                        <span>Categoría</span>
                        <strong>{PRODUCT_CATEGORY_LABELS[product.category] ?? PRODUCT_CATEGORY_LABELS.OTHER}</strong>
                      </div>
                    </div>
                  </section>
                </div>

                <section className="product-details-content" aria-label="Información de compra">
                  <p className="eyebrow">DETALLES DEL PRODUCTO</p>
                  <h1 className="product-page-title">{product.name}</h1>
                  <p className="product-page-sku"><strong>Código del producto:</strong> #{product.id}</p>
                  <div className="product-page-price-line">
                    <span>Precio</span>
                    <strong className="product-details-price">{formatoPrecio.format(Number(product.price))}</strong>
                  </div>

                  <div className="product-page-buy-row">
                    <div className="product-page-availability">
                      <p className={`product-details-stock${remainingStock > 0 ? " is-available" : " is-unavailable"}`}>
                        <span className="stock-dot" />
                        {remainingStock > 0 ? `${remainingStock} pzas. disponibles` : "Producto agotado"}
                      </p>
                      <div className="product-quantity-picker" aria-label="Cantidad del producto">
                        <button
                          type="button"
                          aria-label="Disminuir cantidad"
                          disabled={selectedQuantity <= 1}
                          onClick={() => setProductPageQuantity(Math.max(1, selectedQuantity - 1))}
                        >−</button>
                        <output aria-live="polite">{selectedQuantity}</output>
                        <button
                          type="button"
                          aria-label="Aumentar cantidad"
                          disabled={selectedQuantity >= remainingStock}
                          onClick={() => setProductPageQuantity(Math.min(remainingStock, selectedQuantity + 1))}
                        >+</button>
                      </div>
                    </div>
                    <button
                      className="add-button product-page-add-button"
                      type="button"
                      onClick={() => {
                        addToCart(product, selectedQuantity);
                        const verb = selectedQuantity === 1 ? "se agregó" : "se agregaron";
                        const unit = selectedQuantity === 1 ? "unidad" : "unidades";
                        setProductPageCartMessage(`${selectedQuantity} ${unit} de “${product.name}” ${verb} al carrito.`);
                      }}
                      disabled={remainingStock === 0}
                    >
                      {remainingStock === 0 ? "Agotado" : "Agregar al carrito"}
                    </button>
                  </div>

                  {productPageCartMessage && <p className="product-page-cart-message" role="status">{productPageCartMessage}</p>}

                  <section className="product-page-info-card product-page-essentials product-details-specifications" aria-labelledby="product-specifications-title">
                    <h2 id="product-specifications-title">Especificaciones esenciales</h2>
                    <dl>
                      <div>
                        <dt>Categoría</dt>
                        <dd>{PRODUCT_CATEGORY_LABELS[product.category] ?? PRODUCT_CATEGORY_LABELS.OTHER}</dd>
                      </div>
                      <div>
                        <dt>Modelo</dt>
                        <dd>{product.model?.trim() || "No especificado"}</dd>
                      </div>
                      <div>
                        <dt>Disponibilidad</dt>
                        <dd>{Number(product.stock) > 0 ? `${product.stock} unidades` : "Agotado"}</dd>
                      </div>
                      <div>
                        <dt>Código del producto</dt>
                        <dd>#{product.id}</dd>
                      </div>
                    </dl>
                  </section>
                </section>
              </div>

              <section className="product-page-information" id="product-information">
                <section className="product-page-info-card product-details-description" aria-labelledby="product-description-title">
                  <h2 id="product-description-title">Detalles del producto</h2>
                  <div className="product-description-content">
                    {renderProductDescription(product.description)}
                  </div>
                </section>
              </section>
            </article>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell" data-theme={theme}>
      {themeTransition && (
        <div
          className={`theme-transition-effect theme-transition-effect--${themeTransition}`}
          aria-hidden="true"
          onAnimationEnd={() => setThemeTransition("")}
        />
      )}
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
              <button className="cart-toggle" type="button" onClick={() => { setAuthMode("login"); setAuthError(""); setShowAuthPassword(false); }}>Iniciar sesión</button>
              <button className="cart-toggle auth-register-button" type="button" onClick={() => { setAuthMode("register"); setAuthError(""); setShowAuthPassword(false); }}>Crear cuenta</button>
            </>
          )}

          <button
            className={`theme-toggle${theme === "blue" ? " is-blue" : ""}`}
            type="button"
            onClick={() => {
              const nextTheme = theme === "blue" ? "light" : "blue";
              const prefersReducedMotion = window.matchMedia?.(
                "(prefers-reduced-motion: reduce)",
              ).matches ?? false;
              setThemeTransition(prefersReducedMotion ? "" : nextTheme);
              setTheme(nextTheme);
            }}
            role="switch"
            aria-checked={theme === "blue"}
            aria-label="Modo azul"
            title={theme === "blue" ? "Modo azul activado. Cambiar al tema claro" : "Modo azul desactivado. Activar tema azul"}
          >
            <span className="theme-switch-track" aria-hidden="true">
              <span className="theme-switch-thumb">
                <span className="theme-toggle-icon">{theme === "blue" ? "☾" : "☼"}</span>
              </span>
            </span>
          </button>

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
          <button className="auth-backdrop" type="button" aria-label="Cerrar acceso" onClick={() => { setAuthMode(null); setShowAuthPassword(false); }} />
          <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <div className="auth-modal-header">
              <div>
                <p className="eyebrow">URBANSHOP</p>
                <h2 id="auth-title">{authMode === "register" ? "Crear cuenta de cliente" : "Iniciar sesión"}</h2>
              </div>
              <button className="cart-close" type="button" onClick={() => { setAuthMode(null); setShowAuthPassword(false); }} aria-label="Cerrar">×</button>
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
                <span className="auth-password-field">
                  <input type={showAuthPassword ? "text" : "password"} value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} autoComplete={authMode === "register" ? "new-password" : "current-password"} minLength={authMode === "register" ? 10 : undefined} maxLength={72} required />
                  <button
                    className="password-visibility-toggle"
                    type="button"
                    onClick={() => setShowAuthPassword((visible) => !visible)}
                    aria-label={showAuthPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    aria-pressed={showAuthPassword}
                  >
                    {showAuthPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </span>
              </label>
              {authMode === "register" && <small>Usa al menos 10 caracteres.</small>}
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
              <button type="button" onClick={() => { setAuthMode(authMode === "register" ? "login" : "register"); setAuthError(""); setShowAuthPassword(false); }}>
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
                      {selectedAddress ? (
                        <>
                          <div className="delivery-address-summary">
                            <div className="delivery-address-details">
                              <span>Destinatario</span>
                              <strong>{selectedAddress.firstName} {selectedAddress.lastName}</strong>
                              <span>Dirección</span>
                              <strong>{formatAddressForDisplay(selectedAddress)}</strong>
                              <span>Teléfono/celular</span>
                              <strong>{selectedAddress.phone}</strong>
                            </div>
                            <div className="delivery-address-actions">
                              <button className="delivery-address-action" type="button" onClick={startEditingAddress}>
                                <span aria-hidden="true">✎</span> Editar dirección
                              </button>
                              {savedAddresses.length > 1 && (
                                <button
                                  className="delivery-address-action"
                                  type="button"
                                  onClick={() => setShowAddressPicker((showing) => !showing)}
                                  aria-expanded={showAddressPicker}
                                >
                                  <span aria-hidden="true">☷</span> Seleccionar otra
                                </button>
                              )}
                              <button className="delivery-address-action" type="button" onClick={startAddingAddress}>
                                <span aria-hidden="true">＋</span> Agregar datos
                              </button>
                            </div>
                          </div>
                          {showAddressPicker && (
                            <div className="delivery-address-picker" aria-label="Direcciones guardadas">
                              {savedAddresses.map((address) => (
                                <button
                                  className={`delivery-address-option${address.id === selectedAddressId ? " is-selected" : ""}`}
                                  type="button"
                                  key={address.id}
                                  onClick={() => {
                                    setSelectedAddressId(address.id);
                                    setShowAddressPicker(false);
                                  }}
                                  aria-pressed={address.id === selectedAddressId}
                                >
                                  <strong>{address.firstName} {address.lastName}</strong>
                                  <span>{formatAddressForDisplay(address)}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="delivery-address-empty">
                          <p>Aún no has agregado una dirección de entrega.</p>
                          <button className="delivery-address-action delivery-address-add" type="button" onClick={startAddingAddress}>
                            <span aria-hidden="true">＋</span> Agregar datos
                          </button>
                        </div>
                      )}
                      <button className="checkout-button" type="submit" disabled={isSubmittingOrder || !selectedAddress}>
                        {isSubmittingOrder ? "Procesando pedido..." : "Confirmar pedido"}
                      </button>
                    </>
                  ) : (
                    <div className="checkout-login-notice">
                      <p>Inicia sesión con una cuenta de cliente para realizar la compra.</p>
                      {!currentUser && <button className="checkout-button" type="button" onClick={() => { setAuthMode("login"); setIsCartOpen(false); setShowAuthPassword(false); }}>Iniciar sesión</button>}
                    </div>
                  )}
                </form>
              </>
            )}
          </section>
          {isAddressEditorOpen && currentUser?.role === "CUSTOMER" && (
            <div className="address-modal-overlay">
              <button
                className="address-modal-backdrop"
                type="button"
                onClick={() => setIsAddressEditorOpen(false)}
                aria-label="Cerrar ventana de dirección"
              />
              <section className="address-dialog" role="dialog" aria-modal="true" aria-labelledby="address-dialog-title">
                <form onSubmit={handleSaveAddress}>
                  <header className="address-dialog-header">
                    <h2 id="address-dialog-title">{editingAddressId ? "Editar dirección" : "Agregar dirección"}</h2>
                    <button type="button" onClick={() => setIsAddressEditorOpen(false)} aria-label="Cerrar">×</button>
                  </header>
                  <div className="address-form-grid">
                    <label className="address-field address-field--first-name">*Nombre(s) del destinatario
                      <input autoFocus required maxLength={40} autoComplete="given-name" value={addressForm.firstName} onChange={(event) => updateAddressField("firstName", event.target.value)} />
                    </label>
                    <label className="address-field address-field--last-name">*Apellido(s) del destinatario
                      <input required maxLength={40} autoComplete="family-name" value={addressForm.lastName} onChange={(event) => updateAddressField("lastName", event.target.value)} />
                    </label>
                    <label className="address-field address-field--company">Empresa destino
                      <input maxLength={40} autoComplete="organization" value={addressForm.company} onChange={(event) => updateAddressField("company", event.target.value)} />
                    </label>
                    <label className="address-field address-field--phone">*Teléfono/Celular
                      <input required type="tel" minLength={7} maxLength={15} autoComplete="tel" value={addressForm.phone} onChange={(event) => updateAddressField("phone", event.target.value)} />
                    </label>
                    <fieldset className="address-field address-field--gender">
                      <legend>Género (opcional)</legend>
                      <div className="address-gender-options">
                        {[["H", "Hombre"], ["M", "Mujer"]].map(([shortLabel, value]) => (
                          <button
                            className={addressForm.gender === value ? "is-selected" : ""}
                            type="button"
                            key={value}
                            onClick={() => updateAddressField("gender", addressForm.gender === value ? "" : value)}
                            aria-pressed={addressForm.gender === value}
                            aria-label={value}
                          >
                            {shortLabel}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <label className="address-field address-field--street">*Calle
                      <input required maxLength={70} autoComplete="address-line1" value={addressForm.street} onChange={(event) => updateAddressField("street", event.target.value)} />
                    </label>
                    <label className="address-field address-field--exterior">*No. Ext.
                      <input required maxLength={8} value={addressForm.exteriorNumber} onChange={(event) => updateAddressField("exteriorNumber", event.target.value)} />
                    </label>
                    <label className="address-field address-field--interior">No. Int.
                      <input maxLength={8} value={addressForm.interiorNumber} onChange={(event) => updateAddressField("interiorNumber", event.target.value)} />
                    </label>
                    <label className="address-field address-field--reference">Referencia
                      <input maxLength={25} value={addressForm.reference} onChange={(event) => updateAddressField("reference", event.target.value)} />
                      <small>El servicio de paquetería limita la referencia a 25 caracteres.</small>
                    </label>
                    <label className="address-field address-field--neighborhood">*Colonia
                      <input required maxLength={60} autoComplete="address-level3" value={addressForm.neighborhood} onChange={(event) => updateAddressField("neighborhood", event.target.value)} />
                    </label>
                    <label className="address-field address-field--postal-code">*Código Postal
                      <input required inputMode="numeric" pattern="[0-9]{5}" maxLength={5} autoComplete="postal-code" value={addressForm.postalCode} onChange={(event) => updateAddressField("postalCode", event.target.value.replace(/\D/g, ""))} />
                    </label>
                    <label className="address-field address-field--city">*Ciudad
                      <input required maxLength={40} autoComplete="address-level2" value={addressForm.city} onChange={(event) => updateAddressField("city", event.target.value)} />
                    </label>
                    <label className="address-field address-field--state">*Estado
                      <select required autoComplete="address-level1" value={addressForm.state} onChange={(event) => updateAddressField("state", event.target.value)}>
                        <option value="" disabled>Selecciona tu estado</option>
                        {MEXICAN_STATES.map((state) => <option value={state} key={state}>{state}</option>)}
                      </select>
                    </label>
                  </div>
                  <p className="address-required-note">*Campos requeridos</p>
                  <footer className="address-dialog-actions">
                    <button className="address-dialog-back" type="button" onClick={() => setIsAddressEditorOpen(false)}>Regresar</button>
                    <button className="address-dialog-save" type="submit">Guardar</button>
                  </footer>
                </form>
              </section>
            </div>
          )}
        </div>
      )}

      <main className="page">
        <section
          className="hero"
          role="region"
          aria-roledescription="carrusel"
          aria-label="Categorías destacadas"
          style={{ "--hero-background": HERO_BACKGROUNDS[heroSlideIndex % HERO_BACKGROUNDS.length] }}
        >
          <div className="hero-content" key={activeHeroCategory?.value ?? "catalog-intro"}>
            <p className="eyebrow">
              {activeHeroCategory ? "EXPLORA POR CATEGORÍA" : "TIENDA EN LÍNEA"}
            </p>
            <h1>
              {activeHeroCategory?.label ?? (
                <>Encuentra algo<br />que te encante.</>
              )}
            </h1>
            <p className="hero-copy">
              {activeHeroCategory
                ? CATEGORY_HERO_COPY[activeHeroCategory.value] ?? CATEGORY_HERO_COPY.OTHER
                : "Explora nuestro catálogo y descubre los productos disponibles."}
            </p>
            {activeHeroCategory && (
              <div className="hero-product-details">
                <span>{activeHeroCategory.products.length} {activeHeroCategory.products.length === 1 ? "producto disponible" : "productos disponibles"}</span>
                <button
                  className="hero-cta"
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryFilter(activeHeroCategory.value);
                    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Ver categoría <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
          </div>

          <div className="hero-stamp" aria-hidden="true">
            <span>{activeHeroCategory ? "CATEGORÍA" : "SELECCIÓN"}</span>
            <strong>{activeHeroCategory ? String(activeHeroCategory.products.length).padStart(2, "0") : "01"}</strong>
            <span>{activeHeroCategory ? "PRODUCTOS" : "DE TEMPORADA"}</span>
          </div>

          {heroCategories.length > 1 && (
            <>
              <button
                className="hero-arrow hero-arrow--previous"
                type="button"
                aria-label="Categoría anterior"
                onClick={() => setActiveHeroIndex((heroSlideIndex - 1 + heroCategories.length) % heroCategories.length)}
              >
                ‹
              </button>
              <div className="hero-controls" aria-label="Controles del carrusel">
                <div className="hero-dots" aria-label={activeHeroCategory ? `Categoría ${activeHeroCategory.label}, ${heroSlideIndex + 1} de ${heroCategories.length}` : "Categorías"}>
                  {heroCategories.map((category, index) => (
                    <button
                      className={`hero-dot${index === heroSlideIndex ? " is-active" : ""}`}
                      type="button"
                      key={category.value}
                      aria-label={`Mostrar categoría ${category.label}`}
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
                aria-label="Siguiente categoría"
                onClick={() => setActiveHeroIndex((heroSlideIndex + 1) % heroCategories.length)}
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

              <label>
                Filtrar por categoría
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  <option value="ALL">Todas las categorías</option>
                  {PRODUCT_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
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
                <p>No encontramos productos con esos filtros.</p>
                <button
                  className="clear-search-button"
                  type="button"
                  onClick={() => { setSearchTerm(""); setCategoryFilter("ALL"); }}
                >
                  Limpiar búsqueda
                </button>
              </div>
            )}

          {!loading && !error && products.length > 0 && (
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <article className={`product-card product-card--${(product.category ?? "OTHER").toLowerCase()}`} id={`product-${product.id}`} key={product.id}>
                  <a
                    className="product-art product-art-link"
                    href={`/?productId=${encodeURIComponent(product.id)}`}
                    aria-label={`Ver detalles de ${product.name}`}
                  >
                    <span className="product-initial" aria-hidden="true">
                      {(product.name || "P").trim().charAt(0).toUpperCase()}
                    </span>
                    {product.imageUrl && (
                      <img
                        className="product-image"
                        src={product.imageUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={(event) => { event.currentTarget.hidden = true; }}
                      />
                    )}
                    <span className="product-number">
                      PRODUCTO #{product.id}
                    </span>
                  </a>

                  <div className="product-info">
                    <span className="product-category">
                      {PRODUCT_CATEGORY_LABELS[product.category] ?? PRODUCT_CATEGORY_LABELS.OTHER}
                    </span>
                    <div className="stock-label">
                      <span className="stock-dot" />
                      {Number(product.stock) > 0
                        ? `${product.stock} en stock`
                        : "Agotado"}
                    </div>

                    <h3>
                      <a
                        className="product-title-link"
                        href={`/?productId=${encodeURIComponent(product.id)}`}
                      >
                        {product.name}
                      </a>
                    </h3>
                    {product.model?.trim() && (
                      <p className="product-model">Modelo: {product.model}</p>
                    )}
                    <p className="description">
                      {getCatalogDescription(product)}
                    </p>

                    <div className="price-row">
                      <span>Precio</span>
                      <strong>
                        {formatoPrecio.format(Number(product.price))}
                      </strong>
                    </div>
                    <div className="product-card-actions">
                      <a
                        className="product-details-trigger"
                        href={`/?productId=${encodeURIComponent(product.id)}`}
                      >
                        Ver más detalles
                      </a>
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
              onProductChanged={(product) => dispatch(upsertProduct(product))}
            />
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
