import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  items: [],
  loading: true,
  error: "",
};

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    setProducts(state, action) {
      state.items = action.payload;
      state.loading = false;
      state.error = "";
    },
    setProductsError(state, action) {
      state.error = action.payload;
      state.loading = false;
    },
    updateStockFromOrder(state, action) {
      const orderedItems = action.payload ?? [];
      state.items = state.items.map((product) => {
        const orderedItem = orderedItems.find(
          (item) => item.productId === product.id,
        );

        if (!orderedItem) return product;
        return {
          ...product,
          stock: Math.max(
            0,
            Number(product.stock) - Number(orderedItem.quantity),
          ),
        };
      });
    },
    upsertProduct(state, action) {
      const product = action.payload;
      const index = state.items.findIndex((item) => item.id === product.id);
      if (index === -1) state.items.push(product);
      else state.items[index] = product;
    },
  },
});

export const {
  setProducts,
  setProductsError,
  updateStockFromOrder,
  upsertProduct,
} = productsSlice.actions;
export default productsSlice.reducer;
