import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

type HeatLevel = "Mild" | "Medium" | "Hot";

type PaymentMethod = "UPI" | "Cash on Delivery" | "Card";

interface Spice {
  id: string;
  name: string;
  description: string;
  notes?: string;
  price: number;
  unit: string;
  heat: HeatLevel;
  origin?: string;
  isNew?: boolean;
  isSignature?: boolean;
  colorClass: string;
  imageDataUrl?: string;
}

interface AdminConfig {
  adminEmail: string;
  brandTagline: string;
  supportPhone?: string;
  upiId?: string;
  city?: string;
  minimumOrderNote?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

interface OrderItem {
  spiceId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface Order {
  id: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerPostalCode?: string;
  note?: string;
  paymentMethod: PaymentMethod;
  items: OrderItem[];
  total: number;
  userId?: string;
}

const STORAGE_KEYS = {
  admin: "homelike_admin_v1",
  spices: "homelike_spices_v1",
  users: "homelike_users_v1",
  orders: "homelike_orders_v1",
};

const defaultAdminConfig: AdminConfig = {
  adminEmail: "",
  brandTagline: "Small batch homestyle masalas for modern kitchens.",
  supportPhone: "",
  upiId: "",
  city: "",
  minimumOrderNote: "Free delivery in your city for orders above INR 400.",
};

const defaultSpices: Spice[] = [
  {
    id: "signature-garam-masala",
    name: "Signature Garam Masala",
    description:
      "Slow roasted whole spices, ground in tiny batches for a deep, homelike base to every curry.",
    notes: "Add at the end of cooking for the best aroma.",
    price: 289,
    unit: "100g jar",
    heat: "Medium",
    origin: "Family recipe developed in a small home kitchen.",
    isSignature: true,
    isNew: true,
    colorClass: "from-amber-500 via-orange-500 to-rose-500",
  },
  {
    id: "chai-masala",
    name: "Sunday Chai Masala",
    description:
      "Cardamom forward chai blend with ginger, cinnamon and clove for slow evenings and long calls.",
    notes: "Simmer with milk and tea leaves for 3-4 minutes.",
    price: 249,
    unit: "75g tin",
    heat: "Mild",
    origin: "Inspired by weekend breakfasts at home.",
    colorClass: "from-orange-400 via-amber-500 to-amber-600",
  },
  {
    id: "everyday-sabzi",
    name: "Everyday Sabzi Blend",
    description:
      "Balanced turmeric, cumin and coriander with a bright tomato note - an easy base for daily sabzis.",
    notes: "Great for bhindi, aloo, paneer and mixed vegetables.",
    price: 199,
    unit: "100g pouch",
    heat: "Mild",
    origin: "Designed for quick weekday cooking.",
    colorClass: "from-amber-400 via-lime-400 to-emerald-500",
  },
  {
    id: "tadka-chilli-oil",
    name: "Flame Tadka Chilli Oil",
    description:
      "Crispy chilli, garlic and mustard seeds infused in cold pressed oil - instant tadka for dal or eggs.",
    notes: "Use a small spoon at a time. It is hot.",
    price: 320,
    unit: "150ml bottle",
    heat: "Hot",
    origin: "Tested over many breakfasts before launch.",
    colorClass: "from-rose-500 via-orange-500 to-amber-500",
  },
];

const formatINR = (amount: number) =>
  amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

function BrandLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses =
    size === "sm"
      ? "h-9 w-9 text-xs"
      : size === "lg"
      ? "h-14 w-14 text-base"
      : "h-11 w-11 text-sm";

  return (
    <div className="relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-[2px] shadow-lg shadow-amber-300/40">
      <div className={`flex ${sizeClasses} items-center justify-center rounded-2xl bg-white text-amber-800`}>
        <div className="relative flex h-full w-full items-center justify-center">
          <span className="absolute inset-x-2 top-1 h-1 rounded-full bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300" />
          <span className="absolute inset-x-3 bottom-1 h-2 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
          <span className="relative inline-flex flex-col items-center text-[9px] font-semibold tracking-[0.2em]">
            <span className="uppercase">HL</span>
            <span className="mt-0.5 text-[7px] uppercase tracking-[0.25em]">Spices</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function SectionHeading(props: { kicker: string; title: string; subtitle: string }) {
  const { kicker, title, subtitle } = props;
  return (
    <div className="space-y-2 text-left md:text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">{kicker}</p>
      <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">{title}</h2>
      <p className="max-w-2xl text-sm text-stone-600 md:mx-auto">{subtitle}</p>
    </div>
  );
}

export function App() {
  const [adminConfig, setAdminConfig] = useState<AdminConfig>(defaultAdminConfig);
  const [spices, setSpices] = useState<Spice[]>(defaultSpices);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [initialized, setInitialized] = useState(false);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("UPI");

  const [orderName, setOrderName] = useState("");
  const [orderEmail, setOrderEmail] = useState("");
  const [orderPhone, setOrderPhone] = useState("");
  const [orderAddress, setOrderAddress] = useState("");
  const [orderCity, setOrderCity] = useState("");
  const [orderPostalCode, setOrderPostalCode] = useState("");
  const [orderNote, setOrderNote] = useState("");

  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<"settings" | "catalog" | "orders">("settings");

  const [newSpice, setNewSpice] = useState<{
    name: string;
    description: string;
    price: string;
    unit: string;
    heat: HeatLevel;
    origin: string;
    notes: string;
    imageDataUrl?: string;
    isSignature: boolean;
  }>(
    {
      name: "",
      description: "",
      price: "",
      unit: "100g",
      heat: "Medium",
      origin: "",
      notes: "",
      imageDataUrl: undefined,
      isSignature: false,
    }
  );

  const currentUser = currentUserId
    ? users.find((u) => u.id === currentUserId) ?? null
    : null;

  // Load from localStorage on first render
  useEffect(() => {
    if (typeof window === "undefined") {
      setInitialized(true);
      return;
    }

    try {
      const storedAdmin = window.localStorage.getItem(STORAGE_KEYS.admin);
      if (storedAdmin) {
        const parsed = JSON.parse(storedAdmin) as AdminConfig;
        if (parsed && typeof parsed === "object") {
          setAdminConfig({ ...defaultAdminConfig, ...parsed });
        }
      }

      const storedSpices = window.localStorage.getItem(STORAGE_KEYS.spices);
      if (storedSpices) {
        const parsed = JSON.parse(storedSpices) as Spice[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSpices(parsed);
        }
      }

      const storedUsers = window.localStorage.getItem(STORAGE_KEYS.users);
      if (storedUsers) {
        const parsed = JSON.parse(storedUsers) as User[];
        if (Array.isArray(parsed)) {
          setUsers(parsed);
        }
      }

      const storedOrders = window.localStorage.getItem(STORAGE_KEYS.orders);
      if (storedOrders) {
        const parsed = JSON.parse(storedOrders) as Order[];
        if (Array.isArray(parsed)) {
          setOrders(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to load Homelike data", error);
    } finally {
      setInitialized(true);
    }
  }, []);

  // Persist admin
  useEffect(() => {
    if (!initialized || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.admin, JSON.stringify(adminConfig));
    } catch (error) {
      console.error("Failed to save admin config", error);
    }
  }, [adminConfig, initialized]);

  // Persist spices
  useEffect(() => {
    if (!initialized || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.spices, JSON.stringify(spices));
    } catch (error) {
      console.error("Failed to save spices", error);
    }
  }, [spices, initialized]);

  // Persist users
  useEffect(() => {
    if (!initialized || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
    } catch (error) {
      console.error("Failed to save users", error);
    }
  }, [users, initialized]);

  // Persist orders
  useEffect(() => {
    if (!initialized || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
    } catch (error) {
      console.error("Failed to save orders", error);
    }
  }, [orders, initialized]);

  // When a saved user is chosen, fill the order form from it
  useEffect(() => {
    if (!currentUser) return;
    setOrderName(currentUser.name);
    setOrderEmail(currentUser.email);
    setOrderPhone(currentUser.phone ?? "");
    setOrderAddress(currentUser.address ?? "");
    setOrderCity(currentUser.city ?? "");
    setOrderPostalCode(currentUser.postalCode ?? "");
  }, [currentUser]);

  const handleQuantityChange = (spiceId: string, value: number) => {
    setQuantities((prev) => {
      const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
      if (safe <= 0) {
        const { [spiceId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [spiceId]: safe };
    });
  };

  const estimatedTotal = spices.reduce((sum, spice) => {
    const qty = quantities[spice.id] ?? 0;
    return sum + spice.price * qty;
  }, 0);

  const hasSelection = Object.values(quantities).some((q) => q > 0);

  const handleSaveProfile = () => {
    setProfileStatus(null);
    if (!orderName.trim() || !orderEmail.trim()) {
      setProfileStatus("Add at least name and email before saving as a profile.");
      return;
    }

    const existing = users.find(
      (u) => u.email.toLowerCase() === orderEmail.trim().toLowerCase()
    );

    const base: User = {
      id: existing?.id ?? `user-${Date.now()}`,
      name: orderName.trim(),
      email: orderEmail.trim(),
      phone: orderPhone.trim() || undefined,
      address: orderAddress.trim() || undefined,
      city: orderCity.trim() || undefined,
      postalCode: orderPostalCode.trim() || undefined,
    };

    if (existing) {
      setUsers((prev) => prev.map((u) => (u.id === existing.id ? base : u)));
      setCurrentUserId(existing.id);
      setProfileStatus("Updated your saved profile.");
    } else {
      setUsers((prev) => [...prev, base]);
      setCurrentUserId(base.id);
      setProfileStatus("Saved a new profile in this browser.");
    }
  };

  const handleUseProfile = (user: User) => {
    setCurrentUserId(user.id);
    setOrderName(user.name);
    setOrderEmail(user.email);
    setOrderPhone(user.phone ?? "");
    setOrderAddress(user.address ?? "");
    setOrderCity(user.city ?? "");
    setOrderPostalCode(user.postalCode ?? "");
  };

  const handlePlaceOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOrderError(null);
    setOrderStatus(null);

    if (!orderName.trim() || !orderEmail.trim()) {
      setOrderError("Please add your name and email so we can confirm your order.");
      return;
    }

    const selected: { spice: Spice; qty: number }[] = spices
      .map((spice) => ({ spice, qty: quantities[spice.id] ?? 0 }))
      .filter((x) => x.qty > 0);

    if (selected.length === 0) {
      setOrderError("Add at least one spice to your order.");
      return;
    }

    const items: OrderItem[] = selected.map(({ spice, qty }) => ({
      spiceId: spice.id,
      name: spice.name,
      quantity: qty,
      unitPrice: spice.price,
      subtotal: spice.price * qty,
    }));

    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    const order: Order = {
      id: `HL-${Date.now()}`,
      createdAt: new Date().toISOString(),
      customerName: orderName.trim(),
      customerEmail: orderEmail.trim(),
      customerPhone: orderPhone.trim() || undefined,
      customerAddress: orderAddress.trim() || undefined,
      customerCity: orderCity.trim() || undefined,
      customerPostalCode: orderPostalCode.trim() || undefined,
      note: orderNote.trim() || undefined,
      paymentMethod,
      items,
      total,
      userId: currentUserId ?? undefined,
    };

    setOrders((prev) => [...prev, order]);

    const lineItemsText = items
      .map(
        (item) =>
          `- ${item.name} x${item.quantity} @ ${formatINR(item.unitPrice)} = ${formatINR(
            item.subtotal
          )}`
      )
      .join("\n");

    const addressLines: string[] = [];
    if (order.customerAddress) addressLines.push(order.customerAddress);
    if (order.customerCity || order.customerPostalCode) {
      addressLines.push(
        `${order.customerCity ?? ""} ${order.customerPostalCode ?? ""}`.trim()
      );
    }

    const bodyLines: string[] = [
      `New Homelike order: ${order.id}`,
      "",
      `Customer: ${order.customerName}`,
      `Email: ${order.customerEmail}`,
    ];

    if (order.customerPhone) bodyLines.push(`Phone: ${order.customerPhone}`);
    if (addressLines.length) bodyLines.push(`Address: ${addressLines.join(", ")}`);

    bodyLines.push("", "Items:", lineItemsText, "");
    bodyLines.push(`Total: ${formatINR(total)}`);
    bodyLines.push(`Payment method: ${order.paymentMethod}`);
    if (order.note) {
      bodyLines.push("", `Customer note: ${order.note}`);
    }
    bodyLines.push("", "This order was placed from the Homelike startup site.");

    const emailBody = bodyLines.join("\n");
    const trimmedAdminEmail = adminConfig.adminEmail.trim();

    if (trimmedAdminEmail && typeof window !== "undefined") {
      const mailto = `mailto:${encodeURIComponent(trimmedAdminEmail)}?subject=${encodeURIComponent(
        `New Homelike order ${order.id}`
      )}&body=${encodeURIComponent(emailBody)}`;

      window.location.href = mailto;

      setOrderStatus(
        "Order drafted. Your email app should open with a ready to send order email to the Homelike admin."
      );
    } else {
      setOrderStatus(
        "Order saved in the local admin panel. Add an admin email in the Admin Panel to enable one click email sending."
      );
    }

    setQuantities({});
    setOrderNote("");
  };

  const handleSpiceImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setNewSpice((prev) => ({ ...prev, imageDataUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateSpice = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminMessage(null);

    if (!newSpice.name.trim()) {
      setAdminMessage("Give your spice a name before adding it.");
      return;
    }

    const priceNumber = Number(newSpice.price);
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      setAdminMessage("Enter a valid price in INR.");
      return;
    }

    const baseId = newSpice.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    const candidateId = baseId || `spice-${Date.now()}`;
    const id = spices.some((s) => s.id === candidateId)
      ? `${candidateId}-${Date.now()}`
      : candidateId;

    const created: Spice = {
      id,
      name: newSpice.name.trim(),
      description: newSpice.description.trim() || "Custom Homelike blend.",
      notes: newSpice.notes.trim() || undefined,
      price: Math.round(priceNumber),
      unit: newSpice.unit.trim() || "100g",
      heat: newSpice.heat,
      origin: newSpice.origin.trim() || undefined,
      isNew: true,
      isSignature: newSpice.isSignature,
      colorClass: "from-amber-500 via-orange-500 to-rose-500",
      imageDataUrl: newSpice.imageDataUrl,
    };

    setSpices((prev) => [...prev, created]);

    setNewSpice({
      name: "",
      description: "",
      price: "",
      unit: "100g",
      heat: "Medium",
      origin: "",
      notes: "",
      imageDataUrl: undefined,
      isSignature: false,
    });

    setAdminMessage(`Added "${created.name}" to your Homelike catalog.`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-rose-50 text-stone-900">
      {/* Soft gradient blobs in the background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 opacity-60 mix-blend-multiply"
      >
        <div className="absolute -left-32 top-10 h-64 w-64 rounded-full bg-amber-300/40 blur-3xl" />
        <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-rose-300/40 blur-3xl" />
        <div className="absolute bottom-10 left-10 h-72 w-72 rounded-full bg-orange-300/40 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-amber-100/60 bg-gradient-to-r from-amber-50/90 via-orange-50/90 to-rose-50/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-3">
            <BrandLogo size="sm" />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-stone-900">Homelike</div>
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-700">
                Spices Startup
              </div>
            </div>
          </a>

          <nav className="hidden items-center gap-6 text-xs font-medium text-stone-700 md:flex">
            <a href="#spices" className="hover:text-stone-900">
              Spices
            </a>
            <a href="#story" className="hover:text-stone-900">
              Story
            </a>
            <a href="#order" className="hover:text-stone-900">
              Order
            </a>
            <a href="#admin" className="hover:text-stone-900">
              Admin Panel
            </a>
            <a href="#hosting" className="hover:text-stone-900">
              Hosting
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("order");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="hidden rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-amber-300/60 transition hover:shadow-lg hover:shadow-amber-300/80 md:inline-flex"
            >
              Early access order
            </button>
          </div>
        </div>
      </header>

      <main
        id="top"
        className="mx-auto flex max-w-6xl flex-col gap-20 px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pt-14"
      >
        {/* Hero */}
        <section className="grid items-center gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-amber-800 shadow-sm shadow-amber-200/70 ring-1 ring-amber-100/90 backdrop-blur">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-rose-500 text-[9px] font-bold text-white">
                HL
              </span>
              <span>Bootstrapped D2C spice brand</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50/90 px-2 py-[2px] text-[10px] font-semibold text-amber-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Small batch launch
              </span>
            </div>

            <h1 className="text-balance text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl lg:text-5xl">
              Homelike Spices
              <span className="block text-lg font-medium text-amber-800 sm:text-xl">
                Startup energy. Kitchen comfort.
              </span>
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-stone-700 sm:text-[15px]">
              Homelike is a new spice brand that still tastes like home. We roast in small batches,
              keep ingredients honest and design blends for busy people who still care about flavour.
            </p>

            <dl className="grid grid-cols-3 gap-3 text-[11px] text-stone-700 sm:text-xs">
              <div className="rounded-2xl bg-white/80 p-3 shadow-sm shadow-amber-100/70 ring-1 ring-amber-100/80 backdrop-blur">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                  Launch batch
                </dt>
                <dd className="mt-1 text-sm font-semibold text-stone-950">001</dd>
                <dd className="mt-0.5 text-[11px] text-stone-500">Friends and early believers</dd>
              </div>
              <div className="rounded-2xl bg-white/80 p-3 shadow-sm shadow-amber-100/70 ring-1 ring-amber-100/80 backdrop-blur">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                  Grind style
                </dt>
                <dd className="mt-1 text-sm font-semibold text-stone-950">Small batch</dd>
                <dd className="mt-0.5 text-[11px] text-stone-500">Packed within days of roast</dd>
              </div>
              <div className="rounded-2xl bg-white/80 p-3 shadow-sm shadow-amber-100/70 ring-1 ring-amber-100/80 backdrop-blur">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                  Preservatives
                </dt>
                <dd className="mt-1 text-sm font-semibold text-stone-950">0%</dd>
                <dd className="mt-0.5 text-[11px] text-stone-500">Only real spices inside</dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("order");
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-amber-300/70 transition hover:shadow-lg hover:shadow-amber-300/90"
              >
                Pre order your first box
              </button>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("spices");
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/50 px-4 py-2 text-xs font-semibold text-amber-900 shadow-sm hover:bg-white"
              >
                Browse blends
              </button>
            </div>
          </div>

          {/* Hero side card showing that there is an admin panel */}
          <div className="space-y-4 md:space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-amber-100/80 bg-gradient-to-br from-amber-100/80 via-white to-rose-100/80 p-4 shadow-xl shadow-amber-200/70">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-700 ring-1 ring-amber-100/90">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Admin preview
                  </div>
                  <p className="text-xs font-medium text-stone-900">
                    Homelike ships with a simple admin panel where you can manage your catalog,
                    business email and captured orders.
                  </p>
                </div>
                <BrandLogo size="md" />
              </div>

              <div className="mt-4 grid gap-3 text-[11px] text-stone-700 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/90 p-3 ring-1 ring-amber-100/80">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                    Catalog
                  </p>
                  <p className="mt-1 text-xs font-semibold text-stone-950">{spices.length} blends</p>
                  <p className="mt-0.5 text-[11px] text-stone-500">Editable photos, price and heat.</p>
                </div>
                <div className="rounded-2xl bg-white/90 p-3 ring-1 ring-amber-100/80">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                    Orders
                  </p>
                  <p className="mt-1 text-xs font-semibold text-stone-950">{orders.length} saved</p>
                  <p className="mt-0.5 text-[11px] text-stone-500">Each mirrored as an email draft.</p>
                </div>
                <div className="rounded-2xl bg-white/90 p-3 ring-1 ring-amber-100/80">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                    Communication
                  </p>
                  <p className="mt-1 text-xs font-semibold text-stone-950">Admin email field</p>
                  <p className="mt-0.5 text-[11px] text-stone-500">Connect to your inbox in one step.</p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-stone-600">
              This demo stores data only in your browser using localStorage. When you host Homelike
              online you will connect it to a real database and email service so orders reach your
              inbox automatically.
            </p>
          </div>
        </section>

        {/* Story */}
        <section
          id="story"
          className="grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]"
        >
          <div className="space-y-5">
            <SectionHeading
              kicker="STORY"
              title="Built in a real home kitchen, with startup thinking"
              subtitle="Homelike started as weekend experiments and friends asking for extra jars. Now it is growing into a focused, digital first spice brand."
            />
            <div className="space-y-3 text-sm text-stone-700">
              <p>
                Every jar is roasted, cooled and ground in small batches. We use the same test for
                each lot: would we serve this at our own dinner table tonight.
              </p>
              <p>
                Instead of launching with every possible masala, we are starting narrow, listening
                to early customers and iterating. That is why this site ships with an admin panel so
                you can add experimental blends, adjust pricing and keep track of orders.
              </p>
              <p>
                As you grow, the same front end can connect to modern tools like Vercel, Supabase or
                Firebase and real email APIs. That makes it easy to scale from a few jars a week to
                a proper D2C brand.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-3xl border border-amber-100/80 bg-white/90 p-4 shadow-md shadow-amber-200/70">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">
                Homelike promise
              </p>
              <ul className="mt-2 space-y-1.5 text-[12px] text-stone-700">
                <li>Whole spices sourced in smaller lots, not stored for years.</li>
                <li>No artificial colour, no anti caking agents and no fake flavour boosters.</li>
                <li>Clear labels and simple ingredients you can pronounce.</li>
                <li>Direct contact with the small founding team for feedback and ideas.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-amber-100/80 bg-amber-50/90 p-4 text-[11px] text-stone-800 shadow-md shadow-amber-200/70">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-800">
                Startup mode
              </p>
              <p>
                In this early stage, every order is turned into a clear email receipt. You can
                answer from your inbox, share a UPI ID or payment link and confirm delivery by hand.
                When you are ready, plug in a payment gateway and database to automate the flow.
              </p>
            </div>
          </div>
        </section>

        {/* Spices */}
        <section id="spices" className="space-y-8">
          <SectionHeading
            kicker="BLENDS"
            title="Spice mixes that taste like home, ready for your first customers"
            subtitle="Start with a small set of flagship blends. Use the admin panel below to add new flavours and experimental batches as your brand grows."
          />

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {spices.map((spice) => {
              const qty = quantities[spice.id] ?? 0;
              return (
                <article
                  key={spice.id}
                  className="group flex flex-col rounded-3xl border border-amber-100/80 bg-white/90 p-4 shadow-sm shadow-amber-100/70 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-200/80"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`relative flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${spice.colorClass} text-white shadow-md shadow-amber-300/70`}
                    >
                      {spice.imageDataUrl ? (
                        <img
                          src={spice.imageDataUrl}
                          alt={spice.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="relative flex h-full w-full flex-col items-center justify-center text-[11px] font-semibold">
                          <span className="mb-0.5 text-[10px] uppercase tracking-[0.16em] opacity-90">
                            Homelike
                          </span>
                          <span className="text-xs leading-tight">Spice</span>
                          <span className="text-[9px] opacity-80">Jar</span>
                        </div>
                      )}
                      {spice.isNew && (
                        <span className="absolute -right-1 -top-1 rounded-full bg-white/95 px-2 py-[2px] text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-800 shadow-sm shadow-amber-200">
                          New
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="truncate text-sm font-semibold text-stone-950">{spice.name}</h3>
                      <p className="line-clamp-3 text-[11px] leading-relaxed text-stone-600">
                        {spice.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-[3px] text-[10px] font-medium text-amber-900 ring-1 ring-amber-100">
                          {formatINR(spice.price)}
                          <span
                            className="mx-1.5 h-[1px] w-4 bg-amber-300/70"
                            aria-hidden="true"
                          />
                          {spice.unit}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-stone-50 px-2 py-[3px] text-[10px] font-medium text-stone-700 ring-1 ring-stone-100">
                          {spice.heat} heat
                        </span>
                        {spice.isSignature && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-[3px] text-[10px] font-semibold text-rose-800 ring-1 ring-rose-100">
                            Signature blend
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {spice.notes && (
                    <p className="mt-2 line-clamp-2 text-[11px] italic text-stone-500">
                      {spice.notes}
                    </p>
                  )}
                  {spice.origin && (
                    <p className="mt-1 text-[10px] text-stone-400">Origin: {spice.origin}</p>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-3 pt-1 text-[11px]">
                    <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-1 text-[10px] font-medium text-amber-900 ring-1 ring-amber-100">
                      Qty
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(spice.id, qty - 1)}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs text-amber-800 ring-1 ring-amber-100 hover:bg-amber-50"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={qty || ""}
                        onChange={(e) =>
                          handleQuantityChange(spice.id, Number(e.target.value) || 0)
                        }
                        className="h-5 w-10 rounded-full border-0 bg-transparent text-center text-[10px] outline-none focus:ring-0"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(spice.id, qty + 1)}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-xs text-white shadow-sm shadow-amber-300 hover:bg-amber-700"
                      >
                        +
                      </button>
                    </div>

                    <p className="text-right text-[10px] text-stone-500">
                      {qty > 0 ? (
                        <>
                          Line total:
                          <span className="ml-1 font-semibold text-stone-900">
                            {formatINR(qty * spice.price)}
                          </span>
                        </>
                      ) : (
                        <span className="italic">Add to your first Homelike box</span>
                      )}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-4 py-3 text-[11px] text-white shadow-lg shadow-amber-300/80">
            <div>
              <p className="text-xs font-semibold">Estimated box total</p>
              <p className="text-sm font-semibold">
                {estimatedTotal > 0 ? formatINR(estimatedTotal) : "Pick any 2 or 3 blends to start"}
              </p>
            </div>
            <div className="text-right text-[10px] opacity-90">
              <p>
                {adminConfig.minimumOrderNote ||
                  "We recommend a starting order of around INR 1000 for the best shipping value."}
              </p>
              <p>Final price and shipping will be confirmed manually over email.</p>
            </div>
          </div>
        </section>

        {/* Order + Users */}
        <section
          id="order"
          className="grid gap-8 rounded-3xl border border-amber-100/80 bg-white/90 p-5 shadow-lg shadow-amber-200/80 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:p-6"
        >
          <div className="space-y-4">
            <SectionHeading
              kicker="ORDER"
              title="Your delivery details and payment preferences"
              subtitle="Fill this once, save it as a profile on this device, and reuse it for faster Homelike orders."
            />

            <form onSubmit={handlePlaceOrder} className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-700">
                    Full name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={orderName}
                    onChange={(e) => setOrderName(e.target.value)}
                    className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2 text-sm text-stone-900 outline-none ring-amber-200 placeholder:text-stone-400 focus:border-amber-300 focus:ring-2"
                    placeholder="Example: Aanya Rao"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-700">
                    Email for order updates <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={orderEmail}
                    onChange={(e) => setOrderEmail(e.target.value)}
                    className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2 text-sm text-stone-900 outline-none ring-amber-200 placeholder:text-stone-400 focus:border-amber-300 focus:ring-2"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-700">Phone (WhatsApp)</label>
                  <input
                    type="tel"
                    value={orderPhone}
                    onChange={(e) => setOrderPhone(e.target.value)}
                    className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2 text-sm text-stone-900 outline-none ring-amber-200 placeholder:text-stone-400 focus:border-amber-300 focus:ring-2"
                    placeholder="10 digit mobile number"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-700">City</label>
                  <input
                    type="text"
                    value={orderCity}
                    onChange={(e) => setOrderCity(e.target.value)}
                    className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2 text-sm text-stone-900 outline-none ring-amber-200 placeholder:text-stone-400 focus:border-amber-300 focus:ring-2"
                    placeholder="Example: Bengaluru"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-700">Street and area</label>
                  <input
                    type="text"
                    value={orderAddress}
                    onChange={(e) => setOrderAddress(e.target.value)}
                    className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2 text-sm text-stone-900 outline-none ring-amber-200 placeholder:text-stone-400 focus:border-amber-300 focus:ring-2"
                    placeholder="House or flat, street, area"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-700">PIN code</label>
                  <input
                    type="text"
                    value={orderPostalCode}
                    onChange={(e) => setOrderPostalCode(e.target.value)}
                    className="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2 text-sm text-stone-900 outline-none ring-amber-200 placeholder:text-stone-400 focus:border-amber-300 focus:ring-2"
                    placeholder="6 digit PIN"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700">Notes for Homelike</label>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2 text-sm text-stone-900 outline-none ring-amber-200 placeholder:text-stone-400 focus:border-amber-300 focus:ring-2"
                  placeholder="Allergies, spice preferences, delivery timing, etc."
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">
                  Payment options (demo only)
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(["UPI", "Cash on Delivery", "Card"] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`flex flex-col items-start rounded-2xl border px-3 py-2 text-left text-[11px] shadow-sm transition ${
                        paymentMethod === method
                          ? "border-amber-500 bg-amber-50 text-amber-900 shadow-amber-200"
                          : "border-amber-100 bg-amber-50/40 text-stone-700 hover:bg-amber-50"
                      }`}
                    >
                      <span className="text-xs font-semibold">
                        {method === "UPI" && "UPI or QR"}
                        {method === "Cash on Delivery" && "Cash on delivery"}
                        {method === "Card" && "Card (payment link)"}
                      </span>
                      <span className="mt-0.5 text-[10px] text-stone-500">
                        {method === "UPI" &&
                          "Pay to the UPI ID or QR that Homelike shares with you after confirming the order."}
                        {method === "Cash on Delivery" &&
                          "Pay the delivery partner in cash or UPI when the order arrives."}
                        {method === "Card" &&
                          "Homelike can send a secure Razorpay or Stripe link from the admin email."}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-stone-500">
                  This demo does not process real payments. It only prepares an order email to the
                  admin. When you connect a backend, wire these options to your real payment
                  gateway.
                </p>
              </div>

              {orderError && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] text-rose-700 ring-1 ring-rose-100">
                  {orderError}
                </p>
              )}
              {orderStatus && (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800 ring-1 ring-emerald-100">
                  {orderStatus}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                <div className="text-[11px] text-stone-600">
                  <p>
                    You are ordering as
                    <span className="font-semibold text-stone-900">
                      {" "}
                      {currentUser ? currentUser.name : "guest"}
                    </span>
                    .
                  </p>
                  <p>
                    A detailed receipt is generated and sent to the admin email set in the Admin
                    Panel.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={!hasSelection}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold text-white shadow-md transition ${
                    hasSelection
                      ? "bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 shadow-amber-300/80 hover:shadow-lg"
                      : "bg-stone-300 text-stone-600"
                  }`}
                >
                  {hasSelection ? "Place pre order" : "Add spices to start"}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-amber-100/80 bg-amber-50/90 p-4 text-[11px] text-stone-800 shadow-md shadow-amber-200/80">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-800">
                  User profiles
                </p>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-3 py-1 text-[10px] font-semibold text-white shadow-sm shadow-amber-300 hover:bg-amber-700"
                >
                  Save these details
                </button>
              </div>
              <p className="mt-1 text-[11px]">
                Click "Save these details" to store this user in your browser. Homelike will
                remember them for faster future orders on this device.
              </p>
              {profileStatus && <p className="mt-1 text-[10px] text-amber-900">{profileStatus}</p>}
            </div>

            <div className="rounded-3xl border border-amber-100/80 bg-white/90 p-4 text-[11px] shadow-md shadow-amber-200/70">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-800">
                  Saved users in this browser
                </p>
                {users.length > 0 && (
                  <span className="rounded-full bg-amber-50 px-2 py-[2px] text-[10px] font-semibold text-amber-900 ring-1 ring-amber-100">
                    {users.length} saved
                  </span>
                )}
              </div>

              {users.length === 0 ? (
                <p className="text-[11px] text-stone-500">
                  No saved users yet. Fill the order form and click "Save these details" to keep a
                  profile on this device.
                </p>
              ) : (
                <ul className="space-y-2">
                  {users.map((user) => (
                    <li
                      key={user.id}
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 ${
                        currentUserId === user.id
                          ? "border-amber-500 bg-amber-50/80"
                          : "border-amber-100 bg-amber-50/40"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold text-stone-900">
                          {user.name}
                        </p>
                        <p className="truncate text-[10px] text-stone-500">{user.email}</p>
                        {(user.city || user.postalCode) && (
                          <p className="truncate text-[10px] text-stone-400">
                            {user.city} {user.postalCode}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUseProfile(user)}
                        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-amber-800 shadow-sm shadow-amber-200 hover:bg-amber-50"
                      >
                        Use
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-2 text-[10px] text-stone-400">
                All user details are stored only in this browser using localStorage. To make this
                work across many devices and admins, connect Homelike to a real database as
                described below.
              </p>
            </div>
          </div>
        </section>

        {/* Admin Panel */}
        <section
          id="admin"
          className="space-y-5 rounded-3xl border border-amber-100/80 bg-stone-950/95 p-5 text-stone-100 shadow-xl shadow-stone-900/60 md:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-300">
                Admin panel (local demo)
              </p>
              <h2 className="text-lg font-semibold tracking-tight">Homelike back office</h2>
              <p className="mt-1 text-xs text-stone-400">
                Everything here runs in your browser only. When you deploy for real, point these
                controls at your own database, email and payment APIs.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-amber-100/10 px-3 py-1 text-[11px] text-amber-100 ring-1 ring-amber-400/40">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Demo mode - data stays on this device
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium">
            {([
              { id: "settings", label: "Business settings" },
              { id: "catalog", label: "Spice catalog" },
              { id: "orders", label: "Orders and receipts" },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAdminTab(tab.id)}
                className={`rounded-full px-3 py-1 transition ${
                  adminTab === tab.id
                    ? "bg-amber-400 text-stone-950 shadow-sm shadow-amber-300"
                    : "bg-stone-900 text-stone-200 hover:bg-stone-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {adminTab === "settings" && (
            <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
                  Communication and brand basics
                </p>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-amber-50">Admin email</label>
                    <input
                      type="email"
                      value={adminConfig.adminEmail}
                      onChange={(e) =>
                        setAdminConfig((prev) => ({ ...prev, adminEmail: e.target.value }))
                      }
                      placeholder="orders@homelike.in"
                      className="w-full rounded-xl border border-amber-500/50 bg-stone-900/80 px-3 py-2 text-xs text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300 focus:ring-1 focus:ring-amber-400"
                    />
                    <p className="text-[11px] text-stone-400">
                      All order receipts are drafted to this address using a mailto link. In
                      production you would send these from your backend or email provider.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-amber-50">Brand tagline</label>
                    <input
                      type="text"
                      value={adminConfig.brandTagline}
                      onChange={(e) =>
                        setAdminConfig((prev) => ({ ...prev, brandTagline: e.target.value }))
                      }
                      className="w-full rounded-xl border border-stone-700 bg-stone-900/80 px-3 py-2 text-xs text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-amber-50">Support phone</label>
                      <input
                        type="tel"
                        value={adminConfig.supportPhone ?? ""}
                        onChange={(e) =>
                          setAdminConfig((prev) => ({
                            ...prev,
                            supportPhone: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-stone-700 bg-stone-900/80 px-3 py-2 text-xs text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300 focus:ring-1 focus:ring-amber-400"
                        placeholder="Optional WhatsApp or support number"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-amber-50">Base city</label>
                      <input
                        type="text"
                        value={adminConfig.city ?? ""}
                        onChange={(e) =>
                          setAdminConfig((prev) => ({ ...prev, city: e.target.value }))
                        }
                        className="w-full rounded-xl border border-stone-700 bg-stone-900/80 px-3 py-2 text-xs text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300 focus:ring-1 focus:ring-amber-400"
                        placeholder="Example: Bengaluru, Mumbai"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-amber-50">UPI ID</label>
                      <input
                        type="text"
                        value={adminConfig.upiId ?? ""}
                        onChange={(e) =>
                          setAdminConfig((prev) => ({ ...prev, upiId: e.target.value }))
                        }
                        className="w-full rounded-xl border border-stone-700 bg-stone-900/80 px-3 py-2 text-xs text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300 focus:ring-1 focus:ring-amber-400"
                        placeholder="yourname@upi"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-amber-50">
                        Minimum order or shipping note
                      </label>
                      <input
                        type="text"
                        value={adminConfig.minimumOrderNote ?? ""}
                        onChange={(e) =>
                          setAdminConfig((prev) => ({
                            ...prev,
                            minimumOrderNote: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-stone-700 bg-stone-900/80 px-3 py-2 text-xs text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300 focus:ring-1 focus:ring-amber-400"
                        placeholder="Example: Free delivery over INR 400 in your city"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-3xl bg-stone-900/80 p-4 text-[11px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300">
                  How the email based ordering works
                </p>
                <ol className="list-decimal space-y-1 pl-4 text-stone-200">
                  <li>
                    A customer selects spices, fills the order form and clicks "Place pre order".
                  </li>
                  <li>
                    The site creates a clean text receipt and opens the visitors email client with a
                    pre filled email to your admin email.
                  </li>
                  <li>
                    You reply from your inbox with a payment link or UPI instructions and final
                    delivery plan.
                  </li>
                  <li>
                    In production you can replace this mailto link with a proper email API like
                    Resend, SendGrid or AWS SES.
                  </li>
                </ol>
                <p className="mt-2 text-[10px] text-stone-400">
                  The same UI can keep working while you upgrade the backend over time.
                </p>
              </div>
            </div>
          )}

          {adminTab === "catalog" && (
            <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <form onSubmit={handleCreateSpice} className="space-y-3 text-xs">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300">
                  Create a new Homelike blend
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-amber-50">Name</label>
                    <input
                      type="text"
                      value={newSpice.name}
                      onChange={(e) => setNewSpice((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-xl border border-stone-700 bg-stone-900/80 px-3 py-2 text-xs text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300 focus:ring-1 focus:ring-amber-400"
                      placeholder="Example: Smoky Sambar Masala"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-amber-50">Price (INR)</label>
                    <input
                      type="number"
                      min={1}
                      value={newSpice.price}
                      onChange={(e) => setNewSpice((prev) => ({ ...prev, price: e.target.value }))}
                      className="w-full rounded-xl border border-stone-700 bg-stone-900/80 px-3 py-2 text-xs text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300 focus:ring-1 focus:ring-amber-400"
                      placeholder="Example: 260"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-amber-50">Pack size</label>
                    <input
                      type="text"
                      value={newSpice.unit}
                      onChange={(e) => setNewSpice((prev) => ({ ...prev, unit: e.target.value }))}
                      className="w-full rounded-xl border border-stone-700 bg-stone-900/80 px-3 py-2 text-xs text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300 focus:ring-1 focus:ring-amber-400"
                      placeholder="Example: 100g jar"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-amber-50">Heat level</label>
                    <select
                      value={newSpice.heat}
                      onChange={(e) =>
                        setNewSpice((prev) => ({ ...prev, heat: e.target.value as HeatLevel }))
                      }
                      className="w-full rounded-xl border border-stone-700 bg-stone-900/80 px-3 py-2 text-xs text-amber-50 outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="Mild">Mild</option>
                      <option value="Medium">Medium</option>
                      <option value="Hot">Hot</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-1 text-[11px] font-medium text-amber-50">
                      <input
                        type="checkbox"
                        checked={newSpice.isSignature}
                        onChange={(e) =>
                          setNewSpice((prev) => ({ ...prev, isSignature: e.target.checked }))
                        }
                        className="h-3 w-3 rounded border-stone-600 bg-stone-900 text-amber-400 focus:ring-amber-400"
                      />
                      Mark as signature blend
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-amber-50">Description</label>
                  <textarea
                    rows={3}
                    value={newSpice.description}
                    onChange={(e) =>
                      setNewSpice((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="w-full resize-none rounded-xl border border-stone-700 bg-stone-900/80 px-3 py-2 text-xs text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300 focus:ring-1 focus:ring-amber-400"
                    placeholder="Explain what this blend is best at."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-amber-50">Tasting or usage notes</label>
                  <textarea
                    rows={2}
                    value={newSpice.notes}
                    onChange={(e) => setNewSpice((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full resize-none rounded-xl border border-stone-700 bg-stone-900/80 px-3 py-2 text-xs text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300 focus:ring-1 focus:ring-amber-400"
                    placeholder="Example: Add 1 teaspoon at the end of cooking."
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-amber-50">Origin or story</label>
                    <input
                      type="text"
                      value={newSpice.origin}
                      onChange={(e) => setNewSpice((prev) => ({ ...prev, origin: e.target.value }))}
                      className="w-full rounded-xl border border-stone-700 bg-stone-900/80 px-3 py-2 text-xs text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300 focus:ring-1 focus:ring-amber-400"
                      placeholder="Example: Family recipe from Chennai"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-amber-50">Photo (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSpiceImageChange}
                      className="block w-full text-[10px] text-stone-300 file:mr-3 file:rounded-full file:border-0 file:bg-amber-500 file:px-3 file:py-1 file:text-[10px] file:font-semibold file:text-white hover:file:bg-amber-600"
                    />
                    <p className="text-[10px] text-stone-500">
                      In a real deployment store images in cloud storage (for example S3 or
                      Cloudinary) and keep only URLs in your database.
                    </p>
                  </div>
                </div>

                {adminMessage && (
                  <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200 ring-1 ring-emerald-500/40">
                    {adminMessage}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[10px] text-stone-400">
                    The new blend will appear in the public catalog and can be ordered immediately.
                  </p>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-4 py-1.5 text-[11px] font-semibold text-stone-950 shadow-sm shadow-amber-300 hover:bg-amber-300"
                  >
                    Add to catalog
                  </button>
                </div>
              </form>

              <div className="space-y-3 rounded-3xl bg-stone-900/80 p-4 text-[11px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300">
                  Current catalog overview
                </p>
                <p className="text-stone-200">
                  You currently have
                  <span className="font-semibold text-amber-200"> {spices.length} blends</span> listed.
                  Later your database can track stock, batch numbers and expiry dates.
                </p>
                <ul className="mt-2 space-y-1.5 text-stone-300">
                  {spices.slice(0, 5).map((spice) => (
                    <li key={spice.id} className="flex items-center justify-between gap-3">
                      <span className="truncate">
                        {spice.name}
                        {spice.isSignature && (
                          <span className="ml-1 rounded-full bg-amber-300/10 px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-200 ring-1 ring-amber-300/40">
                            Signature
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-amber-100">
                        {formatINR(spice.price)} - {spice.unit}
                      </span>
                    </li>
                  ))}
                  {spices.length > 5 && (
                    <li className="text-[10px] text-stone-500">
                      + {spices.length - 5} more blends (scroll up to view them)
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {adminTab === "orders" && (
            <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="space-y-3 rounded-3xl bg-stone-900/80 p-4 text-[11px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300">
                  Recent orders on this device
                </p>

                {orders.length === 0 ? (
                  <p className="text-stone-400">
                    No orders yet. Place a test order above to see how the receipt looks.
                  </p>
                ) : (
                  <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {[...orders]
                      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
                      .map((order) => (
                        <li
                          key={order.id}
                          className="rounded-2xl border border-stone-700 bg-stone-950/80 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold text-amber-100">{order.id}</p>
                            <p className="text-[10px] text-stone-400">
                              {formatDateTime(order.createdAt)}
                            </p>
                          </div>
                          <p className="mt-0.5 text-[11px] text-stone-200">
                            {order.customerName} - {order.items.length} item
                            {order.items.length > 1 ? "s" : ""}
                          </p>
                          <p className="mt-0.5 text-[10px] text-stone-400">
                            {order.items
                              .map((item) => `${item.name} x${item.quantity}`)
                              .join(", ")}
                          </p>
                          <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
                            <span className="rounded-full bg-amber-400/10 px-2 py-[2px] font-semibold text-amber-200 ring-1 ring-amber-400/40">
                              {formatINR(order.total)}
                            </span>
                            <span className="rounded-full bg-stone-900 px-2 py-[2px] text-stone-300 ring-1 ring-stone-700">
                              {order.paymentMethod}
                            </span>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              <div className="space-y-3 rounded-3xl bg-stone-900/80 p-4 text-[11px]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300">
                  From local demo to full stack
                </p>
                <p className="text-stone-200">
                  To make this a real back office you will connect this UI to:
                </p>
                <ul className="mt-2 space-y-1.5 list-disc pl-4 text-stone-200">
                  <li>
                    A database such as Supabase, Firebase, PlanetScale or a Postgres or MySQL
                    instance for users, spices and orders.
                  </li>
                  <li>
                    Authentication for admins so that only you or your team can open this panel.
                  </li>
                  <li>
                    An email provider (for example Resend, SendGrid or AWS SES) to send receipts
                    directly without opening a mail client.
                  </li>
                </ul>
                <p className="mt-2 text-[10px] text-stone-400">
                  The front end you see here is already ready for that upgrade. Only the data
                  sources need to change.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Hosting and database guidance */}
        <section
          id="hosting"
          className="space-y-5 rounded-3xl border border-amber-100/80 bg-white/95 p-5 text-[11px] text-stone-800 shadow-lg shadow-amber-200/80 md:p-6"
        >
          <SectionHeading
            kicker="GOING LIVE"
            title="How to host Homelike and connect a database"
            subtitle="Here is one simple way to ship this startup site and make it available to customers with real hosting, database and email."
          />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 rounded-2xl border border-amber-100 bg-amber-50/80 p-4 shadow-sm shadow-amber-100">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-800">
                1. Host the front end
              </p>
              <p>
                Push this code to GitHub and connect it to a modern static host such as Vercel or
                Netlify.
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                <li>
                  Build command: <code className="rounded bg-amber-100 px-1">npm run build</code>
                </li>
                <li>
                  Output folder: <code className="rounded bg-amber-100 px-1">dist</code>
                </li>
                <li>Set the project to deploy from your main branch.</li>
              </ul>
            </div>

            <div className="space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 shadow-sm shadow-emerald-100">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-800">
                2. Add a database
              </p>
              <p>
                Create a project on Supabase, Firebase or any managed Postgres or MySQL service. Add
                three tables: users, spices and orders.
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                <li>Map the fields in this UI directly to columns in those tables.</li>
                <li>Replace localStorage reads and writes with API or client SDK calls.</li>
                <li>Enable auth so only logged in admins can change the catalog.</li>
              </ul>
            </div>

            <div className="space-y-2 rounded-2xl border border-rose-100 bg-rose-50/80 p-4 shadow-sm shadow-rose-100">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-800">
                3. Connect email and payments
              </p>
              <p>
                Keep the email based experience, but send the email from the backend instead of the
                visitors mail app.
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                <li>
                  Use an email API such as Resend, SendGrid or AWS SES to send order receipts to
                  your admin inbox.
                </li>
                <li>
                  Plug in a payment gateway such as Razorpay, Cashfree or Stripe and store the
                  payment status on each order.
                </li>
                <li>
                  Keep this React UI the same. Only the submit handlers should call your backend.
                </li>
              </ul>
            </div>
          </div>

          <p className="text-[10px] text-stone-500">
            Once deployed you can share your Homelike link with early customers, gather feedback in
            a simple sheet or Notion page and keep improving your blends and packaging.
          </p>
        </section>

        <footer className="pb-4 pt-2 text-center text-[11px] text-stone-500">
          <p>
            Homelike Spices - built as a startup ready front end. Connect your own backend to make
            it fully live.
          </p>
        </footer>
      </main>
    </div>
  );
}
