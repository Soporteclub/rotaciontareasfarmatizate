"use client";

// FIX (Tarea 2): TaskIcon ahora soporta íconos dinámicos. Cada regla puede
// definir su propio `icon` (nombre Lucide) y `color` (#hex). El map hardcodeado
// TASK_ICON_MAP sigue como fallback para reglas existentes sin ícono definido.

import {
  Trash2, Coffee, Sparkles, ClipboardList, Brush, DoorOpen, DoorClosed,
  PackageSearch, type LucideIcon,
  // Iconos adicionales para la galería del selector (verificados en lucide-react 0.525)
  Utensils, SprayCan, Bath, ShowerHead, Shirt, Wrench, Hammer,
  ShoppingBag, ShoppingCart, Truck, Car, Bike, Bus, Plane, Anchor,
  Phone, Mail, MessageSquare, Bell, BellRing, Volume2, Megaphone,
  Sun, Moon, Sunrise, Sunset, Cloud, CloudRain, Umbrella, Snowflake,
  Users, User, UserCheck, UserPlus, UserCog, Heart, Star, Award,
  Trophy, Medal, Target, Flag, Bookmark, Tag, Hash, Barcode, QrCode,
  FileText, FileCheck, FilePlus, FileSearch, FolderTree, FolderOpen,
  Calendar, CalendarCheck, CalendarClock, CalendarDays, Clock, Timer,
  AlarmClock, Watch, Hourglass, History, Repeat, RotateCw, RefreshCw,
  Lightbulb, Lamp, LampDesk, Flashlight, Flame, FireExtinguisher,
  Battery, BatteryCharging, Power, Plug, Zap, KeyRound, Key, Lock,
  Unlock, Shield, ShieldCheck, Eye, EyeOff, Search, ScanLine, Radar,
  MapPin, Map, Navigation, Compass, Globe, Building2, Building, Store,
  Warehouse, Factory, Home, House, Tent, Bed, Sofa, Armchair, Table,
  Table2, Trees, TreePine, Leaf,
  Flower, Flower2, Sprout, Apple, Cherry, Citrus, Grape, Carrot, Egg,
  Cookie, Candy, IceCream, CakeSlice, Pizza, Beef, Fish, Drumstick,
  Milk, Soup, Wine, Beer, GlassWater, CupSoda,
  Pencil, Pen, PenTool, Paintbrush, PaintRoller, Scissors, Drill,
  Ruler, Settings, Settings2, Cog, Cpu,
  HardDrive, Monitor, Keyboard, Mouse, Printer, Camera, Video, Film,
  Music, Mic, Headphones, Play, Pause, SkipForward,
  FastForward, Rewind, Shuffle, Radio, Tv,
  BookOpen, Book, GraduationCap, School,
  BadgeCheck, CreditCard, Wallet, Banknote, Coins,
  DollarSign, Euro,
  Receipt, Landmark, PiggyBank,
  TrendingUp, TrendingDown, BarChart3, Activity, Gauge, Percent,
  Plus, Check, CheckCheck,
  Layers, Grid, LayoutGrid, List, ListChecks,
  PartyPopper, Gift, Cake,
} from "lucide-react";

// ─── Icon registry: maps a string name → LucideIcon component ───
const ICON_REGISTRY: Record<string, LucideIcon> = {
  // Original task icons
  "trash-2": Trash2,
  "coffee": Coffee,
  "sparkles": Sparkles,
  "clipboard-list": ClipboardList,
  "brush": Brush,
  "door-open": DoorOpen,
  "door-closed": DoorClosed,
  "package-search": PackageSearch,
  // Cleaning / kitchen
  "utensils": Utensils,
  "spray-can": SprayCan,
  "bath": Bath,
  "shower-head": ShowerHead,
  "shirt": Shirt,
  "wrench": Wrench,
  "hammer": Hammer,
  "shopping-bag": ShoppingBag,
  "shopping-cart": ShoppingCart,
  "truck": Truck,
  "car": Car,
  "bike": Bike,
  "bus": Bus,
  "plane": Plane,
  "anchor": Anchor,
  // Communication
  "phone": Phone,
  "mail": Mail,
  "message-square": MessageSquare,
  "bell": Bell,
  "bell-ring": BellRing,
  "volume-2": Volume2,
  "megaphone": Megaphone,
  // Weather / time
  "sun": Sun,
  "moon": Moon,
  "sunrise": Sunrise,
  "sunset": Sunset,
  "cloud": Cloud,
  "cloud-rain": CloudRain,
  "umbrella": Umbrella,
  "snowflake": Snowflake,
  // People
  "users": Users,
  "user": User,
  "user-check": UserCheck,
  "user-plus": UserPlus,
  "user-cog": UserCog,
  "heart": Heart,
  "star": Star,
  "award": Award,
  "trophy": Trophy,
  "medal": Medal,
  "target": Target,
  "flag": Flag,
  "bookmark": Bookmark,
  "tag": Tag,
  "hash": Hash,
  "barcode": Barcode,
  "qr-code": QrCode,
  // Documents
  "file-text": FileText,
  "file-check": FileCheck,
  "file-plus": FilePlus,
  "file-search": FileSearch,
  "folder-tree": FolderTree,
  "folder-open": FolderOpen,
  // Calendar / time
  "calendar": Calendar,
  "calendar-check": CalendarCheck,
  "calendar-clock": CalendarClock,
  "calendar-days": CalendarDays,
  "clock": Clock,
  "timer": Timer,
  "alarm-clock": AlarmClock,
  "watch": Watch,
  "hourglass": Hourglass,
  "history": History,
  "repeat": Repeat,
  "rotate-cw": RotateCw,
  "refresh-cw": RefreshCw,
  // Energy / tools
  "lightbulb": Lightbulb,
  "lamp": Lamp,
  "lamp-desk": LampDesk,
  "flashlight": Flashlight,
  "flame": Flame,
  "fire-extinguisher": FireExtinguisher,
  "battery": Battery,
  "battery-charging": BatteryCharging,
  "power": Power,
  "plug": Plug,
  "zap": Zap,
  "key-round": KeyRound,
  "key": Key,
  "lock": Lock,
  "unlock": Unlock,
  "shield": Shield,
  "shield-check": ShieldCheck,
  "eye": Eye,
  "eye-off": EyeOff,
  "search": Search,
  "scan-line": ScanLine,
  "radar": Radar,
  // Places
  "map-pin": MapPin,
  "map": Map,
  "navigation": Navigation,
  "compass": Compass,
  "globe": Globe,
  "building-2": Building2,
  "building": Building,
  "store": Store,
  "warehouse": Warehouse,
  "factory": Factory,
  "home": Home,
  "house": House,
  "tent": Tent,
  "bed": Bed,
  "sofa": Sofa,
  "armchair": Armchair,
  "table": Table,
  "table-2": Table2,
  "trees": Trees,
  "tree-pine": TreePine,
  "leaf": Leaf,
  // Food
  "apple": Apple,
  "cherry": Cherry,
  "citrus": Citrus,
  "grape": Grape,
  "carrot": Carrot,
  "egg": Egg,
  "cookie": Cookie,
  "candy": Candy,
  "ice-cream": IceCream,
  "cake-slice": CakeSlice,
  "pizza": Pizza,
  "beef": Beef,
  "fish": Fish,
  "drumstick": Drumstick,
  "milk": Milk,
  "soup": Soup,
  "wine": Wine,
  "beer": Beer,
  "glass-water": GlassWater,
  "cup-soda": CupSoda,
  // Tools / settings
  "pencil": Pencil,
  "pen": Pen,
  "pen-tool": PenTool,
  "paintbrush": Paintbrush,
  "paint-roller": PaintRoller,
  "scissors": Scissors,
  "drill": Drill,
  "ruler": Ruler,
  "settings": Settings,
  "settings-2": Settings2,
  "cog": Cog,
  "cpu": Cpu,
  "hard-drive": HardDrive,
  "monitor": Monitor,
  "keyboard": Keyboard,
  "mouse": Mouse,
  "printer": Printer,
  "camera": Camera,
  "video": Video,
  "film": Film,
  // Media
  "music": Music,
  "mic": Mic,
  "headphones": Headphones,
  "play": Play,
  "pause": Pause,
  "skip-forward": SkipForward,
  "fast-forward": FastForward,
  "rewind": Rewind,
  "shuffle": Shuffle,
  "radio": Radio,
  "tv": Tv,
  "book-open": BookOpen,
  "book": Book,
  "graduation-cap": GraduationCap,
  "school": School,
  // Money / charts
  "badge-check": BadgeCheck,
  "credit-card": CreditCard,
  "wallet": Wallet,
  "banknote": Banknote,
  "coins": Coins,
  "dollar-sign": DollarSign,
  "euro": Euro,
  "receipt": Receipt,
  "landmark": Landmark,
  "piggy-bank": PiggyBank,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "bar-chart-3": BarChart3,
  "activity": Activity,
  "gauge": Gauge,
  "percent": Percent,
  // UI
  "plus": Plus,
  "check": Check,
  "check-check": CheckCheck,
  "layers": Layers,
  "grid": Grid,
  "layout-grid": LayoutGrid,
  "list": List,
  "list-checks": ListChecks,
  // Celebration
  "party-popper": PartyPopper,
  "gift": Gift,
  "cake": Cake,
};

/**
 * Resuelve un ícono Lucide por nombre. Devuelve un componente LucideIcon.
 * Si el nombre no está en el registry, devuelve ClipboardList como fallback.
 */
export function resolveIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return ClipboardList;
  const key = iconName.toLowerCase();
  return ICON_REGISTRY[key] ?? ClipboardList;
}

/**
 * Lista de nombres de íconos disponibles para la galería del selector.
 * Agrupados por categoría para facilitar la navegación.
 */
export const ICON_GALLERY_CATEGORIES: { label: string; icons: string[] }[] = [
  {
    label: "Limpieza & Cocina",
    icons: ["trash-2", "brush", "spray-can", "utensils", "coffee", "bath", "shower-head", "shirt"],
  },
  {
    label: "Herramientas",
    icons: ["wrench", "hammer", "drill", "scissors", "paintbrush", "paint-roller", "ruler", "pencil", "pen"],
  },
  {
    label: "Comida & Bebida",
    icons: ["coffee", "utensils", "apple", "carrot", "egg", "cookie", "ice-cream", "pizza", "milk", "wine", "beer", "glass-water", "cup-soda", "soup", "cake", "cake-slice"],
  },
  {
    label: "Tiempo & Calendario",
    icons: ["clock", "timer", "alarm-clock", "calendar", "calendar-check", "calendar-days", "hourglass", "history", "sun", "moon", "sunrise", "sunset"],
  },
  {
    label: "Personas",
    icons: ["user", "users", "user-check", "user-plus", "user-cog", "heart", "star", "award", "trophy", "medal"],
  },
  {
    label: "Lugares",
    icons: ["home", "building", "building-2", "store", "warehouse", "factory", "map-pin", "globe", "compass", "navigation"],
  },
  {
    label: "Documentos",
    icons: ["file-text", "file-check", "file-plus", "folder-open", "clipboard-list", "book-open", "receipt", "barcode", "qr-code"],
  },
  {
    label: "Comunicación",
    icons: ["phone", "mail", "message-square", "bell", "megaphone", "volume-2"],
  },
  {
    label: "Energía & Seguridad",
    icons: ["lightbulb", "flame", "zap", "battery", "plug", "power", "key", "lock", "unlock", "shield", "eye"],
  },
  {
    label: "Transporte",
    icons: ["truck", "car", "bike", "bus", "plane", "anchor", "package-search", "shopping-cart", "shopping-bag"],
  },
  {
    label: "Dinero & Métricas",
    icons: ["dollar-sign", "coins", "credit-card", "wallet", "trending-up", "trending-down", "bar-chart-3", "activity", "percent", "target"],
  },
  {
    label: "UI & Símbolos",
    icons: ["plus", "check", "star", "heart", "flag", "bookmark", "tag", "hash", "layers", "grid", "list", "settings", "cog"],
  },
  {
    label: "Celebración",
    icons: ["party-popper", "gift", "cake", "award", "trophy", "medal", "star"],
  },
];

/** Paleta de colores predefinidos para el selector de color de la tarea */
export const TASK_COLOR_PALETTE: { name: string; value: string }[] = [
  { name: "Naranja", value: "#f15a24" },
  { name: "Esmeralda", value: "#00cd98" },
  { name: "Azul Farmatizate", value: "#1545cb" },
  { name: "Violeta", value: "#425ae0" },
  { name: "Cian", value: "#066aab" },
  { name: "Ámbar", value: "#ca8a04" },
  { name: "Morado", value: "#9333ea" },
  { name: "Rojo", value: "#dc2626" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Lima", value: "#84cc16" },
  { name: "Esmeralda oscuro", value: "#059669" },
  { name: "Índigo", value: "#4f46e5" },
  { name: "Cyan oscuro", value: "#0891b2" },
  { name: "Naranja oscuro", value: "#ea580c" },
  { name: "Gris", value: "#6b7280" },
  { name: "Marrón", value: "#92400e" },
];

// ─── Task Icon Configuration (legacy fallback) ─────────────────

interface TaskIconConfig {
  icon: LucideIcon;
  color: string;
  bgClass: string;
  borderClass: string;
  label: string;
}

const TASK_ICON_MAP: Record<string, TaskIconConfig> = {
  "Sacar Basura": {
    icon: Trash2,
    color: "#f15a24",
    bgClass: "bg-orange-50 dark:bg-orange-950/30",
    borderClass: "border-orange-200 dark:border-orange-800",
    label: "Basura",
  },
  "Lavar Cafetera": {
    icon: Coffee,
    color: "#00cd98",
    bgClass: "bg-teal-50 dark:bg-teal-950/30",
    borderClass: "border-teal-200 dark:border-teal-800",
    label: "Cafetera",
  },
  "Aseo General": {
    icon: Brush,
    color: "#1545cb",
    bgClass: "bg-blue-50 dark:bg-blue-950/30",
    borderClass: "border-blue-200 dark:border-blue-800",
    label: "Aseo",
  },
  "Organizar Cocina": {
    icon: Sparkles,
    color: "#425ae0",
    bgClass: "bg-violet-50 dark:bg-violet-950/30",
    borderClass: "border-violet-200 dark:border-violet-800",
    label: "Cocina",
  },
  "Recepción": {
    icon: DoorOpen,
    color: "#066aab",
    bgClass: "bg-cyan-50 dark:bg-cyan-950/30",
    borderClass: "border-cyan-200 dark:border-cyan-800",
    label: "Recepción",
  },
  "Apertura": {
    icon: DoorOpen,
    color: "#ca8a04",
    bgClass: "bg-yellow-50 dark:bg-yellow-950/30",
    borderClass: "border-yellow-200 dark:border-yellow-800",
    label: "Apertura",
  },
  "Cierre": {
    icon: DoorClosed,
    color: "#9333ea",
    bgClass: "bg-purple-50 dark:bg-purple-950/30",
    borderClass: "border-purple-200 dark:border-purple-800",
    label: "Cierre",
  },
  "Inventarios": {
    icon: PackageSearch,
    color: "#066aab",
    bgClass: "bg-sky-50 dark:bg-sky-950/30",
    borderClass: "border-sky-200 dark:border-sky-800",
    label: "Inventario",
  },
};

const DEFAULT_CONFIG: TaskIconConfig = {
  icon: ClipboardList,
  color: "#6b7280",
  bgClass: "bg-gray-50 dark:bg-gray-900/30",
  borderClass: "border-gray-200 dark:border-gray-700",
  label: "Tarea",
};

export function getTaskIconConfig(taskType: string): TaskIconConfig {
  return TASK_ICON_MAP[taskType] ?? DEFAULT_CONFIG;
}

/**
 * Resuelve el color de una tarea. Prioridad:
 *   1. taskColor explícito (de la regla)
 *   2. TASK_ICON_MAP legacy por nombre
 *   3. DEFAULT_CONFIG
 */
export function getTaskColor(taskType: string, taskColor?: string | null): string {
  if (taskColor && /^#[0-9a-fA-F]{6}$/.test(taskColor)) return taskColor;
  return (TASK_ICON_MAP[taskType] ?? DEFAULT_CONFIG).color;
}

// ─── TaskIcon Component ───────────────────────────────────────

interface TaskIconProps {
  taskType: string;
  /** Explicit icon name (lucide) from the rule. Overrides taskType lookup. */
  iconName?: string | null;
  /** Explicit color (#hex) from the rule. Overrides taskType lookup. */
  color?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  showBg?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: { container: "w-5 h-5 rounded", icon: "h-2.5 w-2.5" },
  sm: { container: "w-6 h-6 rounded-md", icon: "h-3.5 w-3.5" },
  md: { container: "w-8 h-8 rounded-lg", icon: "h-4.5 w-4.5" },
  lg: { container: "w-10 h-10 rounded-xl", icon: "h-5 w-5" },
};

export function TaskIcon({ taskType, iconName, color, size = "md", showBg = true, className }: TaskIconProps) {
  const config = getTaskIconConfig(taskType);
  const Icon = iconName ? resolveIcon(iconName) : config.icon;
  const finalColor = (color && /^#[0-9a-fA-F]{6}$/.test(color)) ? color : config.color;
  const dims = SIZE_MAP[size];

  if (!showBg) {
    return <Icon className={dims.icon} style={{ color: finalColor }} />;
  }

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 border ${config.bgClass} ${config.borderClass} ${dims.container} ${className ?? ""}`}
      style={color ? { backgroundColor: `${finalColor}1a`, borderColor: `${finalColor}40` } : undefined}
    >
      <Icon className={dims.icon} style={{ color: finalColor }} />
    </div>
  );
}

// ─── TaskBadge Component ──────────────────────────────────────

interface TaskBadgeProps {
  taskType: string;
  iconName?: string | null;
  color?: string | null;
  className?: string;
}

export function TaskBadge({ taskType, iconName, color, className }: TaskBadgeProps) {
  const config = getTaskIconConfig(taskType);
  const Icon = iconName ? resolveIcon(iconName) : config.icon;
  const finalColor = (color && /^#[0-9a-fA-F]{6}$/.test(color)) ? color : config.color;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${className ?? ""}`}
      style={{ color: finalColor, backgroundColor: `${finalColor}1a`, borderColor: `${finalColor}40` }}
    >
      <Icon className="h-3 w-3" />
      {taskType}
    </span>
  );
}
