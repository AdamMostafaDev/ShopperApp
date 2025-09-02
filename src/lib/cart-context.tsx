'use client';

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Cart, CartItem, Product } from '@/types';

interface CartState {
  cart: Cart;
}

interface CartAction {
  type: 'ADD_ITEM' | 'REMOVE_ITEM' | 'UPDATE_QUANTITY' | 'CLEAR_CART' | 'LOAD_CART';
  payload?: unknown;
}

const initialState: CartState = {
  cart: {
    items: [],
    total: 0,
    itemCount: 0
  }
};

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}>({
  state: initialState,
  dispatch: () => null,
  addToCart: () => null,
  removeFromCart: () => null,
  updateQuantity: () => null,
  clearCart: () => null,
});

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { product, quantity = 1 } = action.payload;
      console.log('🛍️ Adding product to cart:', product.title);
      console.log('📦 Product weight:', product.weight, 'kg');
      console.log('🔢 Quantity:', quantity);
      
      const existingItemIndex = state.cart.items.findIndex(
        item => item.product.id === product.id
      );

      let newItems: CartItem[];
      
      if (existingItemIndex >= 0) {
        // Update existing item quantity
        console.log('✅ Product already in cart, updating quantity');
        newItems = state.cart.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Add new item
        console.log('🆕 Adding new product to cart');
        const newItem: CartItem = {
          product,
          quantity,
          addedAt: new Date()
        };
        newItems = [...state.cart.items, newItem];
      }

      const total = newItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);

      return {
        cart: {
          items: newItems,
          total,
          itemCount
        }
      };
    }

    case 'REMOVE_ITEM': {
      const productId = action.payload;
      const newItems = state.cart.items.filter(item => item.product.id !== productId);
      const total = newItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);

      return {
        cart: {
          items: newItems,
          total,
          itemCount
        }
      };
    }

    case 'UPDATE_QUANTITY': {
      const { productId, quantity } = action.payload;
      
      if (quantity <= 0) {
        return cartReducer(state, { type: 'REMOVE_ITEM', payload: productId });
      }

      const newItems = state.cart.items.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      );

      const total = newItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);

      return {
        cart: {
          items: newItems,
          total,
          itemCount
        }
      };
    }

    case 'CLEAR_CART':
      return initialState;

    case 'LOAD_CART':
      return action.payload as CartState;

    default:
      return state;
  }
}

// Load cart from localStorage
const loadCartFromStorage = (): CartState => {
  if (typeof window === 'undefined') return initialState;
  
  try {
    const savedCart = localStorage.getItem('unishopper-cart');
    if (savedCart) {
      const parsed = JSON.parse(savedCart);
      return parsed;
    }
  } catch (error) {
    console.error('Error loading cart from localStorage:', error);
  }
  
  return initialState;
};

// Save cart to localStorage
const saveCartToStorage = (state: CartState) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('unishopper-cart', JSON.stringify(state));
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
  }
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedState = loadCartFromStorage();
    if (savedState.cart.items.length > 0) {
      dispatch({ type: 'LOAD_CART', payload: savedState });
    }
    setIsInitialized(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized) {
      saveCartToStorage(state);
    }
  }, [state, isInitialized]);

  const addToCart = (product: Product, quantity = 1) => {
    dispatch({
      type: 'ADD_ITEM',
      payload: { product, quantity }
    });
  };

  const removeFromCart = (productId: string) => {
    dispatch({
      type: 'REMOVE_ITEM',
      payload: productId
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    dispatch({
      type: 'UPDATE_QUANTITY',
      payload: { productId, quantity }
    });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  return (
    <CartContext.Provider value={{
      state,
      dispatch,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
