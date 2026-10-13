'use client';

import React from 'react';
import {
    Target,
    Zap,
    Book,
    Briefcase,
    Dumbbell,
    GraduationCap,
    Heart,
    Home,
    Globe,
    Music,
    Palette,
    Plane,
    Code,
    Coffee,
    Gamepad,
    Gamepad2,
    Lightbulb,
    Smile,
    Star,
    Sun,
    Trophy,
    User,
    Video,
    Wallet,
    Watch,
    Rocket,
    Camera,
    Headphones,
    ShoppingBag,
    Bike,
    Car,
    Train,
    Pizza,
    Utensils,
    Apple,
    Leaf,
    Mountain,
    Waves,
    Cloud,
    CloudLightning,
    CloudRain,
    CloudSnow,
    Moon,
    Sparkles,
    Flame,
    Droplet,
    Wind,
    Snowflake,
    Flower2,
    Trees,
    Building,
    Building2,
    Store,
    Hospital,
    School,
    Church,
    Factory,
    Landmark,
    Castle,
    Tent,
    Bed,
    Bath,
    Sofa,
    Lamp,
    Shirt,
    ShoppingCart,
    Gift,
    Package,
    Truck,
    Bus,
    Ship,
    Anchor,
    MapPin,
    Map,
    Compass,
    Navigation,
    Flag,
    Award,
    Medal,
    Crown,
    Shield,
    Sword,
    Wand2,
    Gem,
    Diamond,
    DollarSign,
    Euro,
    PoundSterling,
    CreditCard,
    Banknote,
    PiggyBank,
    TrendingUp,
    TrendingDown,
    BarChart3,
    PieChart,
    Activity,
    Gauge,
    Timer,
    Clock,
    Calendar,
    CalendarDays,
    AlarmClock,
    Hourglass,
    Umbrella,
    Key,
    Bell,
    Bookmark,
    Clipboard,
    Crosshair,
    Feather,
    Search as SearchIcon,
    X as CloseIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export const ICONS = {
    Target,
    Zap,
    Book,
    Briefcase,
    Dumbbell,
    GraduationCap,
    Heart,
    Home,
    Globe,
    Music,
    Palette,
    Plane,
    Code,
    Coffee,
    Gamepad,
    Gamepad2,
    Lightbulb,
    Smile,
    Star,
    Sun,
    Trophy,
    User,
    Video,
    Wallet,
    Watch,
    Rocket,
    Camera,
    Headphones,
    ShoppingBag,
    Bike,
    Car,
    Train,
    Pizza,
    Utensils,
    Apple,
    Leaf,
    Mountain,
    Waves,
    Cloud,
    CloudLightning,
    CloudRain,
    CloudSnow,
    Moon,
    Sparkles,
    Flame,
    Droplet,
    Wind,
    Snowflake,
    Flower2,
    Trees,
    Building,
    Building2,
    Store,
    Hospital,
    School,
    Church,
    Factory,
    Landmark,
    Castle,
    Tent,
    Bed,
    Bath,
    Sofa,
    Lamp,
    Shirt,
    ShoppingCart,
    Gift,
    Package,
    Truck,
    Bus,
    Ship,
    Anchor,
    MapPin,
    Map,
    Compass,
    Navigation,
    Flag,
    Award,
    Medal,
    Crown,
    Shield,
    Sword,
    Wand2,
    Gem,
    Diamond,
    DollarSign,
    Euro,
    PoundSterling,
    CreditCard,
    Banknote,
    PiggyBank,
    TrendingUp,
    TrendingDown,
    BarChart3,
    PieChart,
    Activity,
    Gauge,
    Timer,
    Clock,
    Calendar,
    CalendarDays,
    AlarmClock,
    Hourglass,
    Umbrella,
    Key,
    Bell,
    Bookmark,
    Clipboard,
    Crosshair,
    Feather
};

export type IconName = keyof typeof ICONS;

interface IconPickerPanelProps {
    selectedIcon?: string;
    onSelect: (iconName: string) => void;
}

export function IconPickerPanel({ selectedIcon, onSelect }: IconPickerPanelProps) {
    const [search, setSearch] = React.useState('');
    const [isRtl, setIsRtl] = React.useState(true);

    React.useEffect(() => {
        if (typeof document !== 'undefined') {
            setIsRtl(document.documentElement.dir === 'rtl');
        }
    }, []);

    const iconEntries = React.useMemo(() => Object.entries(ICONS), []);

    const filteredIcons = React.useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return iconEntries;
        return iconEntries.filter(([name]) => name.toLowerCase().includes(query));
    }, [search, iconEntries]);

    return (
        <div className="flex flex-col gap-2.5 w-full">
            {/* Search bar and counter */}
            <div className="flex items-center gap-2 px-0.5">
                <div className="relative flex-1">
                    <SearchIcon className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 start-2.5 pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={isRtl ? `بحث في ${iconEntries.length} أيقونة...` : `Search ${iconEntries.length} icons...`}
                        dir={isRtl ? "rtl" : "ltr"}
                        className="w-full h-9 sm:h-8 text-base sm:text-xs rounded-lg border border-border/70 bg-muted/40 ps-8 pe-7 py-1 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-border focus:bg-background transition-all"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="absolute top-1/2 -translate-y-1/2 end-2 p-0.5 text-muted-foreground hover:text-foreground rounded"
                        >
                            <CloseIcon className="h-3 w-3" />
                        </button>
                    )}
                </div>
                <span className="shrink-0 text-[10px] font-bold text-muted-foreground bg-muted/60 px-2 py-1 rounded-md tabular-nums border border-border/40">
                    {filteredIcons.length}
                </span>
            </div>

            {/* Grid of icons */}
            {filteredIcons.length > 0 ? (
                <div className="grid grid-cols-5 min-[360px]:grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-52 sm:max-h-72 overflow-y-auto overscroll-contain scrollbar-thin p-1 justify-items-center">
                    {filteredIcons.map(([name, Icon]) => {
                        const isSelected = selectedIcon === name;
                        return (
                            <button
                                key={name}
                                type="button"
                                title={name}
                                onClick={() => onSelect(name)}
                                className={cn(
                                    "h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center transition-all cursor-pointer",
                                    isSelected
                                        ? "bg-accent text-foreground ring-2 ring-foreground/30 scale-105 shadow-xs font-bold"
                                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground active:scale-95"
                                )}
                            >
                                <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">
                    {isRtl ? "لم يتم العثور على أيقونة مطابقة" : "No matching icons found"}
                </div>
            )}
        </div>
    );
}

interface IconPickerProps {
    selectedIcon: string;
    onSelectIcon: (icon: string) => void;
    className?: string;
}

export function IconPicker({ selectedIcon, onSelectIcon, className }: IconPickerProps) {
    const [open, setOpen] = React.useState(false);
    const SelectedIconComponent = ICONS[selectedIcon as IconName] || Target;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn("w-12 h-12 p-0 rounded-xl", className)}
                >
                    <SelectedIconComponent className="w-6 h-6" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[min(calc(100vw-2rem),360px)] sm:w-96 p-3 z-[100] shadow-xl border-border/80 bg-card"
                align="center"
                side="bottom"
                sideOffset={8}
            >
                <IconPickerPanel
                    selectedIcon={selectedIcon}
                    onSelect={(name) => {
                        onSelectIcon(name);
                        setOpen(false);
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}

export function getIconComponent(iconName: string) {
    return ICONS[iconName as IconName] || Target;
}

export function getGoalIcon(iconName: string | undefined | null) {
    const IconComponent = (iconName && ICONS[iconName as IconName]) || Target;
    return <IconComponent className="w-full h-full" />;
}

interface GoalIconPickerProps {
    currentIconName: string;
    onSelect: (iconName: string) => void;
    children: React.ReactNode;
}

export function GoalIconPicker({ currentIconName, onSelect, children }: GoalIconPickerProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent
                className="w-[min(calc(100vw-2rem),360px)] sm:w-96 p-3 z-[100] shadow-xl border-border/80 bg-card"
                align="center"
                side="bottom"
                sideOffset={8}
            >
                <IconPickerPanel
                    selectedIcon={currentIconName}
                    onSelect={(name) => {
                        onSelect(name);
                        setOpen(false);
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}
