import { createSlice } from "@reduxjs/toolkit";

const CART_STORAGE_KEY = "urban-shop-cart";

function loadCart() {
  try {
    const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
    const parsedCart = savedCart ? JSON.parse(savedCart) : [];
    return Array.isArray(parsedCart) ? parsedCart : [];
  } catch {
    return [];
  }
}

const cartSlice = createSlice({
  name: "cart",
  initialState: loadCart(),
  reducers: {
    addCartItem(state, action) {
      const { product, quantity = 1 } = action.payload;
      const requestedQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
      const item = state.find((entry) => entry.id === product.id);
      const currentQuantity = item?.quantity ?? 0;
      const nextQuantity = Math.min(
        Number(product.stock),
        currentQuantity + requestedQuantity,
      );

      if (nextQuantity <= currentQuantity) return;
      if (item) item.quantity = nextQuantity;
      else state.push({ ...product, quantity: nextQuantity });
    },
    changeCartItemQuantity(state, action) {
      const { productId, amount } = action.payload;
      const item = state.find((entry) => entry.id === productId);
      if (!item) return;
      item.quantity = Math.min(
        Number(item.stock),
        Math.max(1, item.quantity + amount),
      );
    },
    removeCartItem(state, action) {
      return state.filter((item) => item.id !== action.payload);
    },
    clearCart() {
      return [];
    },
    replaceCart(_state, action) {
      return Array.isArray(action.payload) ? action.payload : [];
    },
  },
});

export const {
  addCartItem,
  changeCartItemQuantity,
  removeCartItem,
  clearCart,
  replaceCart,
} = cartSlice.actions;
export default cartSlice.reducer;
