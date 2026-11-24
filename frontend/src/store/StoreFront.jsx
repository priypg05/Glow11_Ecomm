// src/store/StoreFront.jsx — ShopLab Storefront compliant with Sections 1–12
import { useState, useMemo, useRef, useEffect } from "react";
import { ALL_PRODUCTS } from "../data/products";
import { useAuth } from "../auth/AuthContext";
import { API_BASE_URL, ENDPOINTS } from "../config/api";
import { FALLBACK_PRODUCT_IMAGE } from "../config/constants";
import ProductDetailPage from "./ProductDetailPage";
import PaymentGateway from "./PaymentGateway";

const THEMES = {
  blossom: {
    name: "Blossom",
    light: {
      bg: "#fff5f7", surface: "#ffffff", card: "#ffffff",
      border: "#fcd5ce", borderStrong: "#f4a0bb",
      accent: "#e879a0", accentSoft: "#fce7f3",
      accentGrad: "linear-gradient(135deg, #f8a5c2 0%, #c77dff 100%)",
      text: "#3d1a26", textMid: "#8c4a6e", textSoft: "#c985aa",
      success: "#10b981", warning: "#f59e0b", danger: "#ef4444",
      chip: "#fce7f3", chipText: "#be185d",
    },
  },
};

const STORE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'DM Sans', sans-serif; }
@keyframes fadeSlideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
.sf-btn:hover { opacity:0.88; transform:translateY(-1px); }
.sf-btn:active { transform:scale(0.97); }
.sf-btn { transition:all 0.18s ease; }
.sf-card:hover { transform:translateY(-3px); }
.sf-card { transition:transform 0.2s ease, border-color 0.2s ease; }
.sf-input:focus { border-color: #e879a0 !important; box-shadow: 0 0 0 3px #fce7f3 !important; outline: none; }
`;

function fmtPrice(n) {
  if (typeof n !== "number") n = Number(n) || 0;
  return "$" + n.toFixed(2);
}

function parsePrice(str) {
  if (typeof str === "number") return str;
  if (!str) return 0;
  let s = String(str).trim();
  if (typeof s === "string" && s.includes(".")) {
    s = s.split(".")[0];
  }
  return parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
}

const PER_PAGE = 12; // REQ-CAT-01: 12 products per page

const VIEW_HOME = "home";
const VIEW_CAT = "catalogue";
const VIEW_ORDERS = "orders";
const VIEW_WISHLIST = "wishlist";
const VIEW_PROFILE = "profile";

export default function StoreFront({
  onRequestLogin,
  initialCheckoutOpen = false,
  onCheckoutHandled,
  currentPath,
  initialView,
  initialProductId,
  initialCartOpen = false,
}) {
  const { user, logout } = useAuth();
  const T = THEMES.blossom.light;

  const [products, setProducts] = useState(() => {
    return ALL_PRODUCTS.map((p, i) => ({
      id: String(p.id || p.product_id || (1001 + i)),
      name: (p.name || p.product_name || "Product").trim(),
      brand: (p.brand || "ShopLab").trim(),
      category: (p.category || p.product_type || p.type || "General").trim(),
      type: (p.product_type || p.type || p.category || "General").trim(),
      price: parsePrice(p.price || p.price_num),
      old_price: p.old_price ? parsePrice(p.old_price) : null,
      stock: typeof p.stock === "number" ? p.stock : 20,
      description: p.description || "High quality product.",
      rating: p.rating ?? 4.5,
      reviewCount: p.review_count ?? p.reviewCount ?? 12,
      img: p.picture_src || p.img || "",
    }));
  });

  const getInitialView = () => {
    if (initialView) {
      if (initialView === "orders") return VIEW_ORDERS;
      if (initialView === "wishlist") return VIEW_WISHLIST;
      if (initialView === "profile") return VIEW_PROFILE;
      if (initialView === "catalogue") return VIEW_CAT;
      return VIEW_HOME;
    }
    const p = typeof window !== "undefined" ? window.location.pathname : "";
    if (p === "/wishlist") return VIEW_WISHLIST;
    if (p === "/orders" || p === "/order-history") return VIEW_ORDERS;
    if (p === "/profile") return VIEW_PROFILE;
    if (p === "/catalogue" || p === "/products") return VIEW_CAT;
    if (p === "/" || p === "/home") {
      try {
        const saved = localStorage.getItem("shoplab_last_view");
        if (saved && [VIEW_CAT, VIEW_ORDERS, VIEW_WISHLIST, VIEW_PROFILE].includes(saved)) {
          return saved;
        }
      } catch {}
    }
    return VIEW_HOME;
  };
  const [view, setViewState] = useState(getInitialView);
  const setView = (newView) => {
    setViewState(newView);
    try {
      localStorage.setItem("shoplab_last_view", newView);
    } catch {}
  };

  const getInitialSelectedProduct = () => {
    let pid = initialProductId;
    if (!pid && typeof window !== "undefined" && window.location.pathname.startsWith("/product/")) {
      pid = decodeURIComponent(window.location.pathname.replace("/product/", "").split("/")[0]);
    }
    if (pid) {
      const found = ALL_PRODUCTS.find((p, i) => String(p.id || p.product_id || (1001 + i)) === String(pid));
      if (found) {
        return {
          id: String(found.id || found.product_id || pid),
          name: (found.name || found.product_name || "Product").trim(),
          brand: (found.brand || "ShopLab").trim(),
          category: (found.category || found.product_type || found.type || "General").trim(),
          type: (found.product_type || found.type || found.category || "General").trim(),
          price: parsePrice(found.price || found.price_num),
          old_price: found.old_price ? parsePrice(found.old_price) : null,
          stock: typeof found.stock === "number" ? found.stock : 20,
          description: found.description || "High quality product.",
          rating: found.rating ?? 4.5,
          reviewCount: found.review_count ?? found.reviewCount ?? 12,
          img: found.picture_src || found.img || "",
        };
      }
    }
    return null;
  };
  const [selectedProduct, setSelectedProduct] = useState(getInitialSelectedProduct);
  const [search, setSearch] = useState("");
  // Applied filters (used by filtered useMemo)
  const [appliedCategoryFilter, setAppliedCategoryFilter] = useState("All");
  const [appliedMinPrice, setAppliedMinPrice] = useState("");
  const [appliedMaxPrice, setAppliedMaxPrice] = useState("");
  const [appliedMinRating4, setAppliedMinRating4] = useState(false);
  const [appliedInStockOnly, setAppliedInStockOnly] = useState(false);

  // Draft filters (for sidebar inputs before clicking Apply Filters)
  const [draftCategory, setDraftCategory] = useState("All");
  const [draftMinPrice, setDraftMinPrice] = useState("");
  const [draftMaxPrice, setDraftMaxPrice] = useState("");
  const [draftMinRating4, setDraftMinRating4] = useState(false);
  const [draftInStockOnly, setDraftInStockOnly] = useState(false);

  const [sortBy, setSortBy] = useState("default");
  const [page, setPage] = useState(1);

  // Synchronously restore cart from localStorage to prevent loss on reload
  const [cart, setCart] = useState(() => {
    try {
      const sessionUser = JSON.parse(localStorage.getItem("glowiq_session") || "null");
      const userKey = sessionUser?.email ? `shoplab_cart_${sessionUser.email}` : null;
      const savedUser = userKey ? localStorage.getItem(userKey) : null;
      if (savedUser) return JSON.parse(savedUser);
      const savedGuest = localStorage.getItem("shoplab_guest_cart");
      if (savedGuest) return JSON.parse(savedGuest);
    } catch {}
    return [];
  });
  const isCartInitialized = useRef(false);
  const [cartOpen, setCartOpen] = useState(initialCartOpen || (typeof window !== "undefined" && window.location.pathname === "/cart"));
  const [checkoutOpen, setCheckoutOpen] = useState(initialCheckoutOpen || (typeof window !== "undefined" && (window.location.pathname === "/checkout" || window.location.pathname === "/payment")));

  useEffect(() => {
    if (initialCheckoutOpen) {
      setCheckoutOpen(true);
    }
  }, [initialCheckoutOpen]);

  // Synchronously restore wishlist from localStorage to prevent loss on reload
  const [wishlist, setWishlist] = useState(() => {
    try {
      const sessionUser = JSON.parse(localStorage.getItem("glowiq_session") || "null");
      const userKey = sessionUser?.email ? `shoplab_wishlist_${sessionUser.email}` : "shoplab_guest_wishlist";
      const saved = localStorage.getItem(userKey);
      if (saved) return JSON.parse(saved);
      const guestSaved = localStorage.getItem("shoplab_guest_wishlist");
      if (guestSaved) return JSON.parse(guestSaved);
    } catch {}
    return [];
  });
  const isWishlistInitialized = useRef(false);
  const [orders, setOrders] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [priceUpdateMsg, setPriceUpdateMsg] = useState("");
  const toastId = useRef(0);

  const navigateTo = (path) => {
    if (typeof window !== "undefined" && window.location.pathname !== path) {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const openCart = () => {
    setCartOpen(true);
    navigateTo("/cart");
  };

  const closeCart = () => {
    setCartOpen(false);
    const target = view === VIEW_CAT ? "/catalogue" : (view === VIEW_ORDERS ? "/orders" : (view === VIEW_WISHLIST ? "/wishlist" : (view === VIEW_PROFILE ? "/profile" : "/")));
    navigateTo(target);
  };

  const isInWishlist = (productId) => {
    if (!productId) return false;
    const pid = String(productId);
    return wishlist.some(w => String(w.id || w.product_id) === pid);
  };

  const toggleWishlist = (product) => {
    if (!product) return;
    const pid = String(product.id || product.product_id);
    const exists = isInWishlist(pid);
    if (exists) {
      setWishlist(prev => prev.filter(w => String(w.id || w.product_id) !== pid));
      if (user?.email) {
        fetch(`${API_BASE_URL}/api/wishlist/${pid}?email=${encodeURIComponent(user.email)}`, { method: "DELETE" }).catch(() => {});
      }
      toast("Removed from Wishlist", "info");
    } else {
      const itemToAdd = {
        id: pid,
        product_id: pid,
        name: product.name || product.product_name || "Product",
        product_name: product.name || product.product_name || "Product",
        brand: product.brand || "GlowIQ",
        category: product.category || product.product_type || "General",
        price: parsePrice(product.price),
        old_price: product.old_price ? parsePrice(product.old_price) : null,
        stock: typeof product.stock === "number" ? product.stock : 20,
        rating: product.rating ?? 4.5,
        reviewCount: product.review_count ?? product.reviewCount ?? 12,
        description: product.description || "",
        img: product.img || product.image_url || product.picture_src || "",
        image_url: product.img || product.image_url || product.picture_src || "",
      };
      setWishlist(prev => [itemToAdd, ...prev.filter(w => String(w.id || w.product_id) !== pid)]);
      if (user?.email) {
        fetch(`${API_BASE_URL}/api/wishlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_email: user.email, product_id: pid }),
        }).catch(() => {});
      }
      toast("❤️ Saved to your Wishlist!", "success");
    }
  };

  const removeFromWishlist = (productId) => {
    const pid = String(productId);
    setWishlist(prev => prev.filter(w => String(w.id || w.product_id) !== pid));
    if (user?.email) {
      fetch(`${API_BASE_URL}/api/wishlist/${pid}?email=${encodeURIComponent(user.email)}`, { method: "DELETE" }).catch(() => {});
    }
    toast("Removed from Wishlist", "info");
  };

  // Sync products from backend if server is active
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/products`)
      .then(r => r.json())
      .then(d => {
        if (d.products && d.products.length > 0) {
          setProducts(d.products.map(p => ({
            id: String(p.id || p.product_id),
            name: p.name || p.product_name,
            brand: p.brand || "ShopLab",
            category: p.category || "General",
            type: p.category || "General",
            price: parsePrice(p.price),
            old_price: p.old_price ? parsePrice(p.old_price) : null,
            stock: typeof p.stock === "number" ? p.stock : 20,
            description: p.description || "",
            rating: p.rating ?? 4.5,
            reviewCount: p.review_count ?? 10,
            img: p.image_url || p.img || p.picture_src || "",
            skintype: p.skintype || "",
            notableEffects: p.notable_effects || "",
          })));
        }
      })
      .catch(() => {});
  }, []);

  // REQ-CART-04: Guest cart persistence and customer cart merge
  useEffect(() => {
    const userKey = user ? `shoplab_cart_${user.email}` : null;
    const savedUser = userKey ? localStorage.getItem(userKey) : null;
    const savedGuest = localStorage.getItem("shoplab_guest_cart");

    if (user) {
      let merged = [];
      try {
        if (savedUser) merged = JSON.parse(savedUser);
      } catch {}
      if (savedGuest) {
        try {
          const guestItems = JSON.parse(savedGuest);
          guestItems.forEach(gItem => {
            const ex = merged.find(m => m.id === gItem.id || m.name === gItem.name);
            if (ex) {
              ex.qty = Math.min(10, ex.qty + gItem.qty);
            } else {
              merged.push({ ...gItem, qty: Math.min(10, gItem.qty) });
            }
          });
          localStorage.removeItem("shoplab_guest_cart");
        } catch {}
      }
      setCart(merged);
      try {
        localStorage.setItem(`shoplab_cart_${user.email}`, JSON.stringify(merged));
      } catch {}
    } else if (savedGuest) {
      try {
        setCart(JSON.parse(savedGuest));
      } catch {}
    }
    isCartInitialized.current = true;
  }, [user]);

  // Save cart changes (only after initial load has finished)
  useEffect(() => {
    if (!isCartInitialized.current) return;
    try {
      if (user) {
        localStorage.setItem(`shoplab_cart_${user.email}`, JSON.stringify(cart));
      } else {
        localStorage.setItem("shoplab_guest_cart", JSON.stringify(cart));
      }
    } catch {}
  }, [cart, user]);

  // REQ-CART-05: Price change notification
  useEffect(() => {
    let changed = false;
    setCart(prev => prev.map(item => {
      const fresh = products.find(p => p.id === item.id);
      if (fresh && fresh.price !== item.price) {
        changed = true;
        return { ...item, price: fresh.price };
      }
      return item;
    }));
    if (changed) {
      setPriceUpdateMsg("Price updated");
      setTimeout(() => setPriceUpdateMsg(""), 4000);
    }
  }, [products]);

  // Load orders if logged in
  useEffect(() => {
    if (user?.email) {
      fetch(`${API_BASE_URL}/api/orders?email=${encodeURIComponent(user.email)}`)
        .then(r => r.json())
        .then(d => { setOrders(d.orders || []); })
        .catch(() => {});
    }
  }, [user, view]);

  // REQ-WSH-01: Load and merge wishlist on user login or change
  useEffect(() => {
    const userKey = user?.email ? `shoplab_wishlist_${user.email}` : null;
    const savedUser = userKey ? localStorage.getItem(userKey) : null;
    const savedGuest = localStorage.getItem("shoplab_guest_wishlist");

    if (user?.email) {
      let localItems = [];
      try {
        if (savedUser) localItems = JSON.parse(savedUser);
      } catch {}

      if (savedGuest) {
        try {
          const guestList = JSON.parse(savedGuest);
          if (Array.isArray(guestList)) {
            guestList.forEach(g => {
              const gPid = String(g.id || g.product_id);
              if (!localItems.some(x => String(x.id || x.product_id) === gPid)) {
                localItems.push(g);
                fetch(`${API_BASE_URL}/api/wishlist`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ user_email: user.email, product_id: gPid }),
                }).catch(() => {});
              }
            });
            localStorage.removeItem("shoplab_guest_wishlist");
          }
        } catch {}
      }

      fetch(`${API_BASE_URL}/api/wishlist?email=${encodeURIComponent(user.email)}`)
        .then(r => r.json())
        .then(d => {
          if (d.ok && Array.isArray(d.wishlist)) {
            const backendMap = new Map(d.wishlist.map(w => [String(w.id || w.product_id), w]));
            localItems.forEach(item => {
              const k = String(item.id || item.product_id);
              if (!backendMap.has(k)) {
                backendMap.set(k, item);
                fetch(`${API_BASE_URL}/api/wishlist`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ user_email: user.email, product_id: k }),
                }).catch(() => {});
              }
            });
            const merged = Array.from(backendMap.values());
            setWishlist(merged);
            try {
              localStorage.setItem(`shoplab_wishlist_${user.email}`, JSON.stringify(merged));
            } catch {}
          } else if (localItems.length > 0) {
            setWishlist(localItems);
          }
        })
        .catch(() => {
          if (localItems.length > 0) setWishlist(localItems);
        });
    } else if (savedGuest) {
      try {
        setWishlist(JSON.parse(savedGuest));
      } catch {}
    }
    isWishlistInitialized.current = true;
  }, [user]);

  // Persist wishlist changes to localStorage
  useEffect(() => {
    if (!isWishlistInitialized.current) return;
    try {
      if (user?.email) {
        localStorage.setItem(`shoplab_wishlist_${user.email}`, JSON.stringify(wishlist));
      } else {
        localStorage.setItem("shoplab_guest_wishlist", JSON.stringify(wishlist));
      }
    } catch {}
  }, [wishlist, user]);

  // Handle URL route synchronization on popstate
  useEffect(() => {
    const onPop = () => {
      const p = window.location.pathname;
      if (p.startsWith("/product/")) {
        const pid = decodeURIComponent(p.replace("/product/", "").split("/")[0]);
        const found = products.find(x => String(x.id || x.product_id) === pid);
        if (found) setSelectedProduct(found);
        setCheckoutOpen(false);
      } else if (p === "/checkout" || p === "/payment") {
        setCheckoutOpen(true);
        setSelectedProduct(null);
      } else if (p === "/wishlist") {
        setView(VIEW_WISHLIST);
        setSelectedProduct(null);
        setCheckoutOpen(false);
      } else if (p === "/orders") {
        setView(VIEW_ORDERS);
        setSelectedProduct(null);
        setCheckoutOpen(false);
      } else if (p === "/profile") {
        setView(VIEW_PROFILE);
        setSelectedProduct(null);
        setCheckoutOpen(false);
      } else if (p === "/catalogue" || p === "/products") {
        setView(VIEW_CAT);
        setSelectedProduct(null);
        setCheckoutOpen(false);
      } else if (p === "/" || p === "/home") {
        setView(VIEW_HOME);
        setSelectedProduct(null);
        setCheckoutOpen(false);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [products]);

  // Direct product URL route sync & lookup
  useEffect(() => {
    const p = window.location.pathname;
    if (p.startsWith("/product/")) {
      const pid = decodeURIComponent(p.replace("/product/", "").split("/")[0]);
      if (pid && (!selectedProduct || String(selectedProduct.id) !== pid)) {
        const found = products.find(x => String(x.id || x.product_id) === pid);
        if (found) {
          setSelectedProduct(found);
        } else {
          fetch(`${API_BASE_URL}/api/products/${pid}`)
            .then(r => r.json())
            .then(d => {
              const prod = d.product || d;
              if (prod && (prod.id || prod.product_id || prod.name)) {
                setSelectedProduct({
                  id: String(prod.id || prod.product_id || pid),
                  name: (prod.name || prod.product_name || "Product").trim(),
                  brand: (prod.brand || "ShopLab").trim(),
                  category: (prod.category || prod.product_type || "General").trim(),
                  price: parsePrice(prod.price),
                  old_price: prod.old_price ? parsePrice(prod.old_price) : null,
                  stock: typeof prod.stock === "number" ? prod.stock : 20,
                  description: prod.description || "",
                  rating: prod.rating ?? 4.5,
                  reviewCount: prod.review_count ?? 12,
                  img: prod.image_url || prod.img || "",
                  skintype: prod.skintype || "",
                  notableEffects: prod.notable_effects || "",
                });
              }
            })
            .catch(() => {});
        }
      }
    }
  }, [products]);

  const toast = (msg, type = "success") => {
    const id = ++toastId.current;
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 2500);
  };

  // REQ-CAT-02, REQ-CAT-03, REQ-CAT-04 Filtering, Sorting, Search
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products.filter(p => {
      const matchSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.skintype && p.skintype.toLowerCase().includes(q)) ||
        (p.notableEffects && p.notableEffects.toLowerCase().includes(q));

      const isSkinCategory = ["serum", "toner", "moisturizer", "sunscreen", "face wash", "skincare"].includes(p.category.toLowerCase());
      const matchCat = appliedCategoryFilter === "All" ||
        p.category.toLowerCase() === appliedCategoryFilter.toLowerCase() ||
        (appliedCategoryFilter.toLowerCase() === "skincare" && isSkinCategory);

      const matchMinPrice = appliedMinPrice === "" || p.price >= parseFloat(appliedMinPrice);
      const matchMaxPrice = appliedMaxPrice === "" || p.price <= parseFloat(appliedMaxPrice);
      const matchRating = !appliedMinRating4 || (p.rating >= 4.0);
      const matchStock = !appliedInStockOnly || (p.stock > 0);
      return matchSearch && matchCat && matchMinPrice && matchMaxPrice && matchRating && matchStock;
    });

    if (sortBy === "price_asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") list = [...list].sort((a, b) => b.price - a.price);
    else if (sortBy === "rating_desc") list = [...list].sort((a, b) => b.rating - a.rating);
    else if (sortBy === "newest") list = [...list].sort((a, b) => String(b.id).localeCompare(String(a.id)));

    return list;
  }, [products, search, appliedCategoryFilter, appliedMinPrice, appliedMaxPrice, appliedMinRating4, appliedInStockOnly, sortBy]);

  const categoriesList = useMemo(() => {
    const base = ["All", "Skincare", "Face Wash", "Toner", "Serum", "Moisturizer", "Sunscreen", "Electronics", "Accessories", "Audio"];
    const set = new Set(base);
    products.forEach(p => {
      if (p.category && !set.has(p.category)) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Problem 1: Apply Filters handler
  const handleApplyFilters = () => {
    setAppliedCategoryFilter(draftCategory);
    setAppliedMinPrice(draftMinPrice);
    setAppliedMaxPrice(draftMaxPrice);
    setAppliedMinRating4(draftMinRating4);
    setAppliedInStockOnly(draftInStockOnly);
    setPage(1);
  };

  // Problem 1: Clear Filters handler
  const handleClearFilters = () => {
    setDraftCategory("All");
    setDraftMinPrice("");
    setDraftMaxPrice("");
    setDraftMinRating4(false);
    setDraftInStockOnly(false);
    setAppliedCategoryFilter("All");
    setAppliedMinPrice("");
    setAppliedMaxPrice("");
    setAppliedMinRating4(false);
    setAppliedInStockOnly(false);
    setPage(1);
  };

  // Problem 2: Pagination windowing helper
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (page >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  // REQ-CART-01, REQ-CART-02 Add to Cart
  const addToCart = (product, addQty = 1) => {
    const stock = typeof product.stock === "number" ? product.stock : 20;
    if (stock <= 0) {
      toast("Sorry, this product is out of stock", "error");
      return;
    }
    setCart(prev => {
      const ex = prev.find(c => c.id === product.id);
      if (ex) {
        const nextQty = Math.min(10, Math.min(stock, ex.qty + addQty));
        return prev.map(c => c.id === product.id ? { ...c, qty: nextQty } : c);
      }
      const initialQty = Math.min(10, Math.min(stock, addQty));
      return [...prev, {
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        category: product.category,
        img: product.img,
        stock,
        qty: initialQty,
      }];
    });
    toast("✓ Added to cart");
  };

  const updateCartQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const target = item.qty + delta;
        if (target < 1) return item;
        const clamped = Math.min(10, Math.min(item.stock || 20, target));
        return { ...item, qty: clamped };
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(c => c.id !== id));
  };

  // REQ-PRC-01 to REQ-PRC-07 Calculations
  const cartBadgeCount = cart.reduce((s, c) => s + c.qty, 0);
  const cartSubtotal = Math.round(cart.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;
  const cartDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  let cartShipping = (cartSubtotal - cartDiscount) >= 100.00 || appliedCoupon?.code === "FREESHIP" ? 0.00 : 5.99;
  const taxableBase = Math.max(0, cartSubtotal - cartDiscount + cartShipping);
  const cartTax = Math.round(taxableBase * 0.18 * 100) / 100;
  const cartTotal = Math.round((cartSubtotal - cartDiscount + (cartShipping * 2) + cartTax) * 100) / 100;

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponMsg("Please enter a coupon code");
      return;
    }
    try {
      const resp = await fetch(ENDPOINTS.coupons.apply, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          subtotal: cartSubtotal,
          items: cart.map(i => ({ id: i.id, name: i.name, category: i.category, price: i.price, qty: i.qty })),
        }),
      });
      const data = await resp.json();
      if (!resp.ok || data.ok === false || data.valid === false) {
        setCouponMsg(data.error?.message || data.message || data.detail || "Invalid coupon");
      } else {
        setAppliedCoupon({ code, discount: data.discount });
        setCouponMsg(data.message || "Coupon applied successfully");
        setCouponCode("");
      }
    } catch {
      setCouponMsg("Invalid coupon");
    }
  };

  // REQ-CHK-01: Checkout needs login
  const handleStartCheckout = () => {
    if (cart.length === 0) {
      toast("Your cart is empty", "error");
      return;
    }
    setSelectedProduct(null);
    if (!user) {
      // Guest is sent to login and comes back to checkout
      onRequestLogin?.(true);
      return;
    }
    setCartOpen(false);
    setCheckoutOpen(true);
    navigateTo("/checkout");
  };

  // REQ-ORD-02: Cancel order while placed
  const handleCancelOrder = async (orderId) => {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/orders/${orderId}/cancel`, {
        method: "POST",
      });
      const d = await resp.json();
      if (!resp.ok) {
        toast(d.error?.message || "Failed to cancel order", "error");
      } else {
        toast("✓ Order cancelled and stock restored");
        setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, status: "Cancelled" } : o));
      }
    } catch {
      toast("Error cancelling order", "error");
    }
  };

  // REQ-WSH-01: Wishlist Move to Cart
  const handleMoveToCart = (item) => {
    addToCart(item);
    removeFromWishlist(item.id);
    toast("Moved item to cart!");
  };

  if (selectedProduct && !checkoutOpen) {
    return (
      <ProductDetailPage
        product={selectedProduct}
        onBack={() => {
          setSelectedProduct(null);
          navigateTo(view === VIEW_CAT ? "/catalogue" : "/");
        }}
        onAddToCart={(p) => addToCart(p, p.qty || 1)}
        onBuyNow={(p) => {
          setSelectedProduct(null);
          addToCart(p, p.qty || 1);
          if (!user) onRequestLogin?.(true);
          else {
            setCheckoutOpen(true);
            navigateTo("/checkout");
          }
        }}
        user={user}
        isInWishlist={isInWishlist(selectedProduct.id)}
        onToggleWishlist={() => toggleWishlist(selectedProduct)}
      />
    );
  }

  if (checkoutOpen) {
    return (
      <PaymentGateway
        cartItems={cart}
        onBack={() => {
          setCheckoutOpen(false);
          onCheckoutHandled?.();
          navigateTo("/");
        }}
        onComplete={(newOrder) => {
          setCart([]);
          setCheckoutOpen(false);
          onCheckoutHandled?.();
          setView(VIEW_ORDERS);
          navigateTo("/orders");
          if (newOrder) setOrders(prev => [newOrder, ...prev]);
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text }}>
      {/* ── HEADER ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: T.surface, borderBottom: `1.5px solid ${T.border}`, padding: "0 2rem", height: 64, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => { setView(VIEW_HOME); setSelectedProduct(null); setCheckoutOpen(false); navigateTo("/"); }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: T.accentGrad, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 18 }}>✨</span>
          </div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: T.text, lineHeight: 1 }}>ShopLab</div>
            <div style={{ fontSize: 10, color: T.textSoft, letterSpacing: 0.5 }}>Practice & QA Shop</div>
          </div>
        </div>

        <nav style={{ display: "flex", gap: 4, marginLeft: 16 }}>
          {[
            { label: "Home", v: VIEW_HOME, path: "/", testId: "nav-home" },
            { label: "Catalogue", v: VIEW_CAT, path: "/catalogue", testId: "nav-catalogue" },
            ...(user ? [
              { label: "My Orders", v: VIEW_ORDERS, path: "/orders", testId: "nav-orders" },
              { label: "Wishlist", v: VIEW_WISHLIST, path: "/wishlist", testId: "nav-wishlist" },
              { label: "Profile", v: VIEW_PROFILE, path: "/profile", testId: "nav-profile" }
            ] : [
              { label: "Wishlist", v: VIEW_WISHLIST, path: "/wishlist", testId: "nav-wishlist" }
            ])
          ].map(({ label, v, path, testId }) => (
            <button
              key={v}
              data-testid={testId}
              onClick={() => {
                setView(v);
                setSelectedProduct(null);
                setCheckoutOpen(false);
                navigateTo(path);
              }}
              style={{
                background: "none", border: "none",
                color: (view === v && !selectedProduct) ? T.accent : T.textMid,
                fontWeight: (view === v && !selectedProduct) ? 700 : 500, fontSize: "0.85rem", cursor: "pointer",
                padding: "6px 12px", borderRadius: 8,
                borderBottom: (view === v && !selectedProduct) ? `2px solid ${T.accent}` : "2px solid transparent",
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Search Bar */}
        <div style={{ flex: 1, maxWidth: 360, position: "relative", marginLeft: "auto" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.textSoft, fontSize: 14 }}>🔍</span>
          <input
            className="sf-input"
            data-testid="search-input"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
              if (e.target.value) setView(VIEW_CAT);
            }}
            placeholder="Search products..."
            style={{ width: "100%", padding: "8px 12px 8px 34px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.surface, color: T.text, fontSize: "0.85rem" }}
          />
        </div>

        {/* User / Auth & Cart */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user ? (
            <>
              <span style={{ color: T.textMid, fontSize: "0.82rem", fontWeight: 600 }}>Hi, {user.name}</span>
              {user.role === "admin" && (
                <a href="/admin" data-testid="nav-admin-link" style={{ padding: "6px 10px", borderRadius: 8, background: T.chip, color: T.chipText, fontSize: "0.78rem", fontWeight: 700, textDecoration: "none" }}>
                  Admin
                </a>
              )}
              <button
                data-testid="nav-logout-btn"
                onClick={logout}
                style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", color: T.textMid, cursor: "pointer", fontSize: "0.78rem" }}
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              data-testid="nav-login-btn"
              onClick={() => onRequestLogin?.(false)}
              style={{ background: T.accentSoft, border: `1.5px solid ${T.borderStrong}`, borderRadius: 8, padding: "6px 14px", color: T.accent, fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}
            >
              Sign In
            </button>
          )}

          {/* Cart toggle */}
          <button
            className="sf-btn"
            data-testid="cart-toggle-btn"
            onClick={() => (cartOpen ? closeCart() : openCart())}
            style={{
              background: cartBadgeCount > 0 ? T.accentSoft : T.surface,
              border: `1.5px solid ${cartBadgeCount > 0 ? T.accent : T.border}`,
              borderRadius: 10, padding: "6px 12px", color: T.text, cursor: "pointer",
              fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 6,
            }}
          >
            🛒 Cart
            {cartBadgeCount > 0 && (
              <span data-testid="cart-badge" style={{ background: T.accent, color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: "0.65rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {cartBadgeCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {priceUpdateMsg && (
        <div data-testid="price-updated-message" style={{ background: "#fef3c7", borderBottom: "1px solid #fde68a", padding: "8px", textAlign: "center", color: "#92400e", fontSize: "0.82rem", fontWeight: 600 }}>
          ℹ️ {priceUpdateMsg}
        </div>
      )}

      {/* ── CART DRAWER ── */}
      {cartOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.3)" }} onClick={closeCart} />
          <div style={{ width: 380, background: T.surface, borderLeft: `1.5px solid ${T.border}`, display: "flex", flexDirection: "column", height: "100vh" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>
                Shopping Cart ({cartBadgeCount})
              </h3>
              <button onClick={closeCart} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: T.textSoft }}>✕</button>
            </div>

            {cart.length === 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: T.textSoft, gap: 10 }}>
                <span style={{ fontSize: 36 }}>🛒</span>
                <p data-testid="empty-cart-message" style={{ fontSize: "0.9rem", fontWeight: 600 }}>Your cart is empty</p>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
                  {cart.map(item => (
                    <div key={item.id} data-testid="cart-item" style={{ background: T.card, borderRadius: 12, padding: "12px", border: `1.5px solid ${T.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.75rem", color: T.textSoft }}>{item.brand}</div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: T.text }}>{item.name}</div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: T.accent, marginTop: 2 }}>{fmtPrice(item.price)}</div>
                        </div>
                        <button data-testid="remove-from-cart-btn" onClick={() => removeFromCart(item.id)} style={{ background: "none", border: "none", color: T.danger, cursor: "pointer", fontSize: 14 }}>✕</button>
                      </div>

                      {/* Quantity Controls (REQ-CART-02) */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <button onClick={() => updateCartQty(item.id, -1)} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, cursor: "pointer", fontWeight: 700 }}>−</button>
                        <span data-testid="cart-item-qty" style={{ fontSize: "0.85rem", fontWeight: 700 }}>{item.qty}</span>
                        <button onClick={() => updateCartQty(item.id, 1)} disabled={item.qty >= 10 || item.qty >= (item.stock || 20)} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, cursor: (item.qty >= 10 || item.qty >= (item.stock || 20)) ? "not-allowed" : "pointer", fontWeight: 700 }}>+</button>
                        <span style={{ fontSize: "0.75rem", color: T.textSoft, marginLeft: "auto" }}>Total: {fmtPrice(item.price * item.qty)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coupon in Cart */}
                <div style={{ padding: "12px 16px", borderTop: `1px dashed ${T.border}`, background: T.accentSoft }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      data-testid="coupon-input"
                      placeholder="Coupon (e.g. SAVE10)"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value)}
                      style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: "0.8rem" }}
                    />
                    <button data-testid="apply-coupon-btn" onClick={handleApplyCoupon} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: T.accent, color: "#fff", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>Apply</button>
                  </div>
                  {couponMsg && <div data-testid="coupon-message" style={{ fontSize: "0.75rem", marginTop: 4, color: (couponMsg.toLowerCase().includes("invalid") || couponMsg.toLowerCase().includes("expired") || couponMsg.toLowerCase().includes("please") || !appliedCoupon) ? T.danger : T.success, fontWeight: 600 }}>{couponMsg}</div>}
                </div>

                {/* Financial Summary */}
                <div style={{ padding: "16px", borderTop: `1.5px solid ${T.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 4 }}>
                    <span style={{ color: T.textMid }}>Subtotal</span>
                    <span data-testid="cart-subtotal" style={{ fontWeight: 600 }}>{fmtPrice(cartSubtotal)}</span>
                  </div>
                  {cartDiscount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 4 }}>
                      <span style={{ color: T.textMid }}>Discount ({appliedCoupon?.code})</span>
                      <span data-testid="cart-discount" style={{ fontWeight: 600, color: T.success }}>-{fmtPrice(cartDiscount)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 4 }}>
                    <span style={{ color: T.textMid }}>Shipping</span>
                    <span data-testid="cart-shipping" style={{ fontWeight: 600 }}>{cartShipping === 0 ? "FREE" : fmtPrice(cartShipping)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 8 }}>
                    <span style={{ color: T.textMid }}>Tax (8%)</span>
                    <span data-testid="cart-tax" style={{ fontWeight: 600 }}>{fmtPrice(cartTax)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1rem", fontWeight: 800, borderTop: `1px solid ${T.border}`, paddingTop: 8, marginBottom: 14 }}>
                    <span>Total</span>
                    <span data-testid="cart-total" style={{ color: T.accent }}>{fmtPrice(cartTotal)}</span>
                  </div>

                  <button
                    className="sf-btn"
                    data-testid="start-checkout-btn"
                    onClick={handleStartCheckout}
                    style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: T.accentGrad, color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}
                  >
                    Checkout →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── VIEWS ── */}
      {view === VIEW_HOME && (
        <div>
          {/* Banner */}
          <div style={{ padding: "4rem 2rem", background: `linear-gradient(135deg, ${T.accentSoft} 0%, ${T.bg} 100%)`, borderBottom: `1.5px solid ${T.border}`, textAlign: "center" }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.6rem", fontWeight: 700, marginBottom: 12 }}>
              Welcome to ShopLab
            </h1>
            <p style={{ color: T.textSoft, fontSize: "1.1rem", maxWidth: 540, margin: "0 auto 24px" }}>
              Realistic e-commerce test website with precision business rules, stable testids, and zero defect tolerance.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <button className="sf-btn" onClick={() => setView(VIEW_CAT)} style={{ padding: "12px 28px", borderRadius: 24, border: "none", background: T.accentGrad, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                Browse Catalogue →
              </button>
            </div>
          </div>

          {/* Featured Categories */}
          <div style={{ padding: "2.5rem 2rem", maxWidth: 1100, margin: "0 auto" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", fontWeight: 700, marginBottom: 18 }}>Categories</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              {["Skincare", "Face Wash", "Serum", "Moisturizer", "Sunscreen", "Electronics", "Accessories", "Audio"].map(cat => (
                <div
                  key={cat}
                  className="sf-card"
                  onClick={() => {
                    setDraftCategory(cat);
                    setAppliedCategoryFilter(cat);
                    setPage(1);
                    setView(VIEW_CAT);
                  }}
                  style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: "20px", textAlign: "center", cursor: "pointer" }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>
                    {cat === "Electronics" ? "💻" : cat === "Accessories" ? "🔌" : cat === "Audio" ? "🎧" : cat === "Face Wash" ? "🧼" : cat === "Serum" ? "💧" : cat === "Moisturizer" ? "🧴" : cat === "Sunscreen" ? "☀️" : "✨"}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1rem" }}>{cat}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Featured Products */}
          <div style={{ padding: "1rem 2rem 3rem", maxWidth: 1100, margin: "0 auto" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", fontWeight: 700, marginBottom: 18 }}>Featured Products</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
              {products.slice(0, 4).map(p => (
                <ProductCardItem
                  key={p.id}
                  p={p}
                  T={T}
                  onSelect={(prod) => {
                    setSelectedProduct(prod);
                    navigateTo(`/product/${prod.id}`);
                  }}
                  onAddToCart={addToCart}
                  isInWishlist={isInWishlist(p.id)}
                  onToggleWishlist={toggleWishlist}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CATALOGUE VIEW (REQ-CAT-01 to REQ-CAT-04) ── */}
      {view === VIEW_CAT && (
        <div style={{ display: "flex", minHeight: "calc(100vh - 64px)" }}>
          {/* Sidebar Filters */}
          <aside style={{ width: 260, borderRight: `1.5px solid ${T.border}`, padding: "20px", background: T.surface, flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Filters</h3>
              <button
                data-testid="clear-filters-link"
                onClick={handleClearFilters}
                style={{ background: "none", border: "none", color: T.accent, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
              >
                Reset
              </button>
            </div>

            {/* Category Filter */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: T.textSoft, textTransform: "uppercase" }}>Category</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                {categoriesList.map(c => (
                  <button
                    key={c}
                    data-testid={`category-filter-${c.toLowerCase()}`}
                    onClick={() => setDraftCategory(c)}
                    style={{
                      textAlign: "left", padding: "6px 10px", borderRadius: 8,
                      border: `1px solid ${draftCategory === c ? T.accent : "transparent"}`,
                      background: draftCategory === c ? T.accentSoft : "none",
                      color: draftCategory === c ? T.accent : T.text,
                      fontSize: "0.82rem", fontWeight: draftCategory === c ? 700 : 500, cursor: "pointer",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Filter (REQ-CAT-03) */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: T.textSoft, textTransform: "uppercase" }}>Price Range ($)</label>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input
                  type="number"
                  data-testid="min-price-input"
                  placeholder="Min"
                  value={draftMinPrice}
                  onChange={e => setDraftMinPrice(e.target.value)}
                  style={{ width: "50%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: "0.8rem" }}
                />
                <input
                  type="number"
                  data-testid="max-price-input"
                  placeholder="Max"
                  value={draftMaxPrice}
                  onChange={e => setDraftMaxPrice(e.target.value)}
                  style={{ width: "50%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: "0.8rem" }}
                />
              </div>
            </div>

            {/* Rating Filter (REQ-CAT-03: 4★ and above) */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  data-testid="rating-4-filter"
                  checked={draftMinRating4}
                  onChange={e => setDraftMinRating4(e.target.checked)}
                />
                <span>4★ & above</span>
              </label>
            </div>

            {/* In stock only Filter (REQ-CAT-03) */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  data-testid="in-stock-only"
                  checked={draftInStockOnly}
                  onChange={e => setDraftInStockOnly(e.target.checked)}
                />
                <span>In stock only</span>
              </label>
            </div>

            {/* Problem 1: Apply Filters and Clear Filters buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                className="sf-btn"
                data-testid="apply-filters-btn"
                onClick={handleApplyFilters}
                style={{
                  width: "100%", padding: "10px", borderRadius: 8, border: "none",
                  background: T.accentGrad, color: "#fff", fontWeight: 700,
                  fontSize: "0.85rem", cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <span>✓</span> Apply Filters
              </button>
              <button
                data-testid="clear-filters-btn"
                onClick={handleClearFilters}
                style={{
                  width: "100%", padding: "8px", borderRadius: 8,
                  border: `1px solid ${T.border}`, background: T.surface,
                  color: T.textMid, fontWeight: 600, fontSize: "0.8rem", cursor: "pointer",
                }}
              >
                Clear Filters
              </button>
            </div>
          </aside>

          {/* Catalogue Main Area */}
          <main style={{ flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column" }}>
            {/* Top Toolbar: Sort and result count */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: "0.85rem", color: T.textSoft }}>
                Showing <strong style={{ color: T.text }}>{filtered.length}</strong> products · Page {page} of {totalPages || 1}
              </div>

              {/* Sort selector (REQ-CAT-04) */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: "0.82rem", color: T.textMid }}>Sort by:</label>
                <select
                  data-testid="sort-select"
                  value={sortBy}
                  onChange={e => { setSortBy(e.target.value); setPage(1); }}
                  style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.text, fontSize: "0.82rem" }}
                >
                  <option value="default">Default</option>
                  <option value="price_asc">Price: Low → High</option>
                  <option value="price_desc">Price: High → Low</option>
                  <option value="newest">Newest</option>
                  <option value="rating_desc">Top Rated</option>
                </select>
              </div>
            </div>

            {/* Product Grid */}
            {paginated.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 1rem", color: T.textSoft }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
                {/* REQ-CAT-02: No products found for '<text>' */}
                <div data-testid="no-products-message" style={{ fontSize: "1rem", fontWeight: 600, color: T.text }}>
                  {search ? `No products found for '${search}'` : "No products found matching filters"}
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16, flex: 1 }}>
                {paginated.map(p => (
                  <ProductCardItem
                    key={p.id}
                    p={p}
                    T={T}
                    onSelect={(prod) => {
                      setSelectedProduct(prod);
                      navigateTo(`/product/${prod.id}`);
                    }}
                    onAddToCart={addToCart}
                    isInWishlist={isInWishlist(p.id)}
                    onToggleWishlist={toggleWishlist}
                  />
                ))}
              </div>
            )}

            {/* Pagination Controls (REQ-CAT-01: 12 per page) */}
            {totalPages > 1 && (
              <div data-testid="pagination-controls" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 24, paddingBottom: 16, flexWrap: "wrap" }}>
                <button
                  data-testid="pagination-prev"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{
                    padding: "6px 14px", borderRadius: 8,
                    border: `1.5px solid ${page <= 1 ? T.border : T.borderStrong}`,
                    background: T.surface,
                    color: page <= 1 ? T.textSoft : T.text,
                    cursor: page <= 1 ? "not-allowed" : "pointer",
                    fontWeight: 600, fontSize: "0.82rem",
                  }}
                >
                  ← Prev
                </button>

                {getPageNumbers().map((pg, idx) => (
                  pg === "..." ? (
                    <span key={`ellipsis-${idx}`} style={{ padding: "0 6px", color: T.textSoft }}>…</span>
                  ) : (
                    <button
                      key={pg}
                      data-testid={`page-button-${pg}`}
                      onClick={() => setPage(pg)}
                      style={{
                        padding: "6px 12px", minWidth: 36, height: 34, borderRadius: 8,
                        border: `1.5px solid ${pg === page ? T.accent : T.border}`,
                        background: pg === page ? T.accentSoft : T.surface,
                        color: pg === page ? T.accent : T.text,
                        fontWeight: pg === page ? 700 : 500,
                        cursor: "pointer", fontSize: "0.82rem",
                      }}
                    >
                      {pg}
                    </button>
                  )
                ))}

                <button
                  data-testid="pagination-next"
                  disabled={page >= totalPages || totalPages === 0}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  style={{
                    padding: "6px 14px", borderRadius: 8,
                    border: `1.5px solid ${(page >= totalPages || totalPages === 0) ? T.border : T.borderStrong}`,
                    background: T.surface,
                    color: (page >= totalPages || totalPages === 0) ? T.textSoft : T.text,
                    cursor: (page >= totalPages || totalPages === 0) ? "not-allowed" : "pointer",
                    fontWeight: 600, fontSize: "0.82rem",
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </main>
        </div>
      )}

      {/* ── ORDERS VIEW (REQ-ORD-01, REQ-ORD-02) ── */}
      {view === VIEW_ORDERS && (
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1.5rem" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            Order History
          </h2>
          <p style={{ color: T.textSoft, fontSize: 13, marginBottom: 20 }}>Review your past orders and status updates.</p>

          {orders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem", background: T.surface, borderRadius: 16, border: `1.5px solid ${T.border}` }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📦</div>
              <p style={{ color: T.textSoft }}>No orders placed yet.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {orders.map(order => (
                <div key={order.order_id} data-testid="order-card" style={{ background: T.surface, borderRadius: 16, border: `1.5px solid ${T.border}`, padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px dashed ${T.border}`, paddingBottom: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: T.textSoft, textTransform: "uppercase" }}>Order Number</div>
                      <div data-testid="order-id" style={{ fontFamily: "monospace", fontWeight: 700, color: T.accent, fontSize: 15 }}>
                        {order.order_id}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: T.textSoft, textTransform: "uppercase" }}>Total</div>
                      <div data-testid="order-total" style={{ fontWeight: 800, fontSize: 16, color: T.text }}>
                        {fmtPrice(order.total)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span
                        data-testid="order-status"
                        style={{
                          display: "inline-block", padding: "4px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700,
                          background: order.status === "Cancelled" ? `${T.danger}22` : `${T.success}22`,
                          color: order.status === "Cancelled" ? T.danger : T.success,
                        }}
                      >
                        {order.status || "Placed"}
                      </span>
                    </div>

                    {/* REQ-ORD-02: Cancel only while status is Placed */}
                    {order.status === "Placed" && (
                      <button
                        data-testid="cancel-order-btn"
                        onClick={() => handleCancelOrder(order.order_id)}
                        style={{
                          padding: "6px 14px", borderRadius: 8, border: `1px solid ${T.danger}`,
                          background: `${T.danger}11`, color: T.danger, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── WISHLIST VIEW (REQ-WSH-01) ── */}
      {view === VIEW_WISHLIST && (
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1.5rem" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            My Wishlist ({wishlist.length}/50)
          </h2>
          <p style={{ color: T.textSoft, fontSize: 13, marginBottom: 20 }}>Saved items you love.</p>

          {wishlist.length === 0 ? (
            <div style={{ textAlign: "center", padding: "4rem", background: T.surface, borderRadius: 16, border: `1.5px solid ${T.border}` }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>❤️</div>
              <p style={{ color: T.textSoft }}>Your wishlist is empty.</p>
              <button
                onClick={() => {
                  setView(VIEW_CAT);
                  setSelectedProduct(null);
                  navigateTo("/catalogue");
                }}
                style={{
                  marginTop: 14, padding: "8px 18px", borderRadius: 8,
                  background: T.accentGrad, color: "#fff", border: "none",
                  fontWeight: 700, fontSize: "0.85rem", cursor: "pointer"
                }}
              >
                Browse Catalogue
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {wishlist.map(item => (
                <div key={item.id} style={{ background: T.card, borderRadius: 14, border: `1.5px solid ${T.border}`, padding: "14px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div
                    onClick={() => {
                      setSelectedProduct(item);
                      navigateTo(`/product/${item.id}`);
                    }}
                    style={{
                      height: 140, borderRadius: 8, overflow: "hidden", background: T.accentSoft,
                      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
                    }}
                  >
                    <img
                      src={item.img || item.image_url || FALLBACK_PRODUCT_IMAGE}
                      alt={item.name}
                      style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }}
                      onError={e => {
                        if (e.currentTarget.src !== FALLBACK_PRODUCT_IMAGE) {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
                        }
                      }}
                    />
                  </div>
                  <div style={{ fontSize: "0.72rem", color: T.textSoft, textTransform: "uppercase", fontWeight: 600 }}>
                    {item.brand || "GlowIQ"}
                  </div>
                  <div
                    onClick={() => {
                      setSelectedProduct(item);
                      navigateTo(`/product/${item.id}`);
                    }}
                    style={{ fontWeight: 700, fontSize: "0.9rem", color: T.text, cursor: "pointer" }}
                  >
                    {item.name}
                  </div>
                  <div style={{ color: T.accent, fontWeight: 800 }}>{fmtPrice(item.price)}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                    <button
                      data-testid="move-to-cart-btn"
                      onClick={() => handleMoveToCart(item)}
                      style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: T.accentGrad, color: "#fff", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}
                    >
                      Move to Cart
                    </button>
                    <button
                      data-testid="remove-from-wishlist-btn"
                      title="Remove from Wishlist"
                      onClick={() => removeFromWishlist(item.id)}
                      style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: "none", color: T.danger, cursor: "pointer", fontWeight: 700 }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PROFILE VIEW (REQ-ACC-05) ── */}
      {view === VIEW_PROFILE && (
        <ProfileView T={T} user={user} onToast={toast} />
      )}

      {/* Toasts */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 600, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: t.type === "error" ? T.danger : T.accentGrad, color: "#fff", padding: "10px 18px", borderRadius: 10, fontSize: "0.85rem", fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Product Card Component (REQ-CAT-05 & Section 7) ───────────────────────────
function ProductCardItem({ p, T, onSelect, onAddToCart, isInWishlist = false, onToggleWishlist }) {
  const isOutOfStock = p.stock <= 0;
  const isLowStock = p.stock > 0 && p.stock <= 5;
  const stockBadge = isOutOfStock ? "Out of stock" : isLowStock ? `Only ${p.stock} left` : "In stock";
  const stockColor = isOutOfStock ? T.danger : isLowStock ? T.warning : T.success;

  return (
    <div
      className="sf-card"
      data-testid="product-card"
      data-product-id={p.id}
      onClick={() => onSelect?.(p)}
      style={{
        background: T.card,
        borderRadius: 12,
        border: `1.5px solid ${T.border}`,
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        cursor: "pointer",
        position: "relative",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Product Image Container with consistent height */}
      <div style={{
        height: 140,
        borderRadius: 8,
        overflow: "hidden",
        background: T.accentSoft,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}>
        <img
          src={p.img || FALLBACK_PRODUCT_IMAGE}
          alt={p.name}
          style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }}
          onError={e => {
            if (e.currentTarget.src !== FALLBACK_PRODUCT_IMAGE) {
              e.currentTarget.onerror = null;
              e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
            }
          }}
        />

        {/* Wishlist Heart Toggle Button */}
        <button
          type="button"
          data-testid="card-wishlist-btn"
          title={isInWishlist ? "In Wishlist (click to remove)" : "Add to Wishlist"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist?.(p);
          }}
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.92)",
            border: `1px solid ${isInWishlist ? T.accent : T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: "0.85rem",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            zIndex: 2,
            lineHeight: 1,
            padding: 0,
          }}
        >
          {isInWishlist ? "❤️" : "🤍"}
        </button>
      </div>

      {/* Brand & Stock Status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
        <span style={{ fontSize: "0.72rem", color: T.textSoft, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" }}>
          {p.brand || "ShopLab"}
        </span>
        <span style={{ fontSize: "0.72rem", color: stockColor, fontWeight: 700 }}>
          {stockBadge}
        </span>
      </div>

      {/* Product Name (Clamped to 2 lines to remove excessive empty space) */}
      <div
        data-testid="product-name"
        title={p.name}
        style={{
          fontWeight: 600,
          fontSize: "0.85rem",
          lineHeight: "1.3",
          height: "2.6em",
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          color: T.text,
        }}
      >
        {p.name}
      </div>

      {/* Rating & Reviews */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem", color: "#f59e0b", fontWeight: 700 }}>
        <span>★</span>
        <span>{Number(p.rating || 4.5).toFixed(1)}</span>
        <span style={{ color: T.textSoft, fontWeight: 400 }}>({p.reviewCount || 10})</span>
      </div>

      {/* Price & Add to Cart (Pushed consistently to bottom) */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "auto",
        paddingTop: 8,
        borderTop: `1px solid ${T.border}`,
      }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span data-testid="product-price" style={{ fontWeight: 800, fontSize: "0.95rem", color: T.accent }}>
            {fmtPrice(p.price)}
          </span>
          {p.old_price && p.old_price > p.price && (
            <span style={{ fontSize: "0.72rem", color: T.textSoft, textDecoration: "line-through" }}>
              {fmtPrice(p.old_price)}
            </span>
          )}
        </div>

        <button
          className="sf-btn"
          data-testid="add-to-cart-btn"
          disabled={isOutOfStock}
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(p, 1);
          }}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "none",
            background: isOutOfStock ? T.border : T.accentGrad,
            color: "#fff",
            fontSize: "0.78rem",
            fontWeight: 700,
            cursor: isOutOfStock ? "not-allowed" : "pointer",
          }}
        >
          {isOutOfStock ? "Sold Out" : "+ Cart"}
        </button>
      </div>
    </div>
  );
}

// ── Profile View Component (REQ-ACC-05) ───────────────────────────────────────
function ProfileView({ T, user, onToast }) {
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [addresses, setAddresses] = useState([]);
  const [saving, setSaving] = useState(false);

  // Address subform
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postal, setPostal] = useState("");

  useEffect(() => {
    if (user?.email) {
      fetch(`${API_BASE_URL}/api/user/profile?email=${encodeURIComponent(user.email)}`)
        .then(r => r.json())
        .then(d => {
          if (d.user) {
            setName(d.user.name || "");
            setPhone(d.user.phone || "");
            setAddresses(d.user.addresses || []);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/user/profile?email=${encodeURIComponent(user.email)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, addresses }),
      });
      if (resp.ok) {
        onToast("Profile updated successfully!");
      } else {
        onToast("Failed to update profile", "error");
      }
    } catch {
      onToast("Network error saving profile", "error");
    }
    setSaving(false);
  };

  const handleAddAddress = () => {
    if (!street || !city || !postal) {
      onToast("Please complete address fields", "error");
      return;
    }
    if (addresses.length >= 5) {
      onToast("Maximum 5 addresses allowed (REQ-ACC-05)", "error");
      return;
    }
    const newAddr = {
      id: Date.now(),
      street,
      city,
      postal,
      isDefault: addresses.length === 0,
    };
    setAddresses(p => [...p, newAddr]);
    setStreet(""); setCity(""); setPostal("");
  };

  const handleSetDefault = (id) => {
    setAddresses(p => p.map(a => ({ ...a, isDefault: a.id === id })));
  };

  const handleDeleteAddress = (id) => {
    setAddresses(p => p.filter(a => a.id !== id));
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        My Profile (REQ-ACC-05)
      </h2>
      <p style={{ color: T.textSoft, fontSize: 13, marginBottom: 24 }}>Update personal information and addresses.</p>

      <div style={{ background: T.surface, borderRadius: 16, border: `1.5px solid ${T.border}`, padding: "20px", marginBottom: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid }}>Full Name</label>
          <input
            data-testid="profile-name-input"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.border}`, marginTop: 4 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid }}>Phone Number</label>
          <input
            data-testid="profile-phone-input"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.border}`, marginTop: 4 }}
          />
        </div>

        <button
          data-testid="profile-save-btn"
          onClick={handleSaveProfile}
          disabled={saving}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: T.accentGrad, color: "#fff", fontWeight: 700, cursor: "pointer" }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* Address management */}
      <div style={{ background: T.surface, borderRadius: 16, border: `1.5px solid ${T.border}`, padding: "20px" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Saved Addresses (Max 5)</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          {addresses.map(a => (
            <div key={a.id} data-testid="profile-address-item" style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{a.street}, {a.city} {a.postal}</div>
                {a.isDefault && <span style={{ fontSize: "0.72rem", color: T.success, fontWeight: 700 }}>✓ Default Address</span>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {!a.isDefault && (
                  <button onClick={() => handleSetDefault(a.id)} style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${T.border}`, background: "none", fontSize: "0.72rem", cursor: "pointer" }}>
                    Set Default
                  </button>
                )}
                <button onClick={() => handleDeleteAddress(a.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "none", background: "none", color: T.danger, fontSize: "0.72rem", cursor: "pointer" }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {addresses.length < 5 && (
          <div style={{ borderTop: `1px dashed ${T.border}`, paddingTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Add New Address</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input placeholder="Street Address" value={street} onChange={e => setStreet(e.target.value)} style={{ padding: "8px 10px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: "0.8rem" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <input placeholder="City" value={city} onChange={e => setCity(e.target.value)} style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: "0.8rem" }} />
                <input placeholder="Postal Code" value={postal} onChange={e => setPostal(e.target.value)} style={{ width: 120, padding: "8px 10px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: "0.8rem" }} />
              </div>
              <button data-testid="add-address-btn" onClick={handleAddAddress} style={{ alignSelf: "flex-start", padding: "8px 16px", borderRadius: 8, border: `1px solid ${T.accent}`, background: T.accentSoft, color: T.accent, fontWeight: 700, cursor: "pointer", fontSize: "0.8rem" }}>
                + Add Address
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
