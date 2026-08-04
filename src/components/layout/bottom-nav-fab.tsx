"use client";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Plus } from "lucide-react";

export const BottomNavFab = forwardRef<HTMLButtonElement, HTMLMotionProps<"button">>(
  function BottomNavFab(props, ref) {
    return (
      <motion.button
        ref={ref}
        type="button"
        whileTap={{ scale: 0.92 }}
        aria-label="Quick actions"
        className="flex size-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
        {...props}
      >
        <Plus className="size-6" />
      </motion.button>
    );
  }
);
