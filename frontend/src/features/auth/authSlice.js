import { createSlice } from "@reduxjs/toolkit";

const AUTH_STORAGE_KEY = "urban-shop-token";

function loadToken() {
  try {
    return window.sessionStorage.getItem(AUTH_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

const authSlice = createSlice({
  name: "auth",
  initialState: {
    token: loadToken(),
    currentUser: null,
  },
  reducers: {
    setToken(state, action) {
      state.token = action.payload ?? "";
    },
    setCurrentUser(state, action) {
      state.currentUser = action.payload ?? null;
    },
    setSession(state, action) {
      state.token = action.payload.token;
      state.currentUser = action.payload.user;
    },
    clearSession(state) {
      state.token = "";
      state.currentUser = null;
    },
  },
});

export const { setToken, setCurrentUser, setSession, clearSession } = authSlice.actions;
export default authSlice.reducer;
