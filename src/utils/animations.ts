import { Variants } from "framer-motion";

export const springConfig = {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
};

export const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

export const listItemVariant: Variants = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: springConfig
    },
};

export const panelVariant: Variants = {
    hidden: { opacity: 0, x: -20 },
    show: {
        opacity: 1,
        x: 0,
        transition: springConfig
    },
};

export const popoverVariant: Variants = {
    hidden: { opacity: 0, scale: 0.9, y: 10 },
    show: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: springConfig
    },
};
