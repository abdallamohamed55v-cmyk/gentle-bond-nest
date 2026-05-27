import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MegsyStar from "@/components/files/MegsyStar";

const MESSAGES = [
  "بنحضرلك الصفحة...",
  "لحظات صغيرة وهيظهر السحر ✨",
  "بنلمّع البكسلات...",
  "Megsy بتفكر معاك...",
  "تقريباً خلصنا...",
  "بنرتب الكلام والصور...",
  "شوية صبر، يستاهل والله",
  "بنشغّل النجمة بتاعتنا 🌟",
];

/**
 * Full-screen loader shown while lazy route chunks load.
 * Delays render ~180ms to avoid flashing on fast transitions.
 */
const PageLoader = () => {
  const [show, setShow] = useState(false);
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * MESSAGES.length));

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 180);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!show) return;
    const i = setInterval(() => {
      setIdx((p) => (p + 1) % MESSAGES.length);
    }, 1600);
    return () => clearInterval(i);
  }, [show]);

  if (!show) return <div className="h-screen bg-background" />;

  return (
    <div className="h-screen w-full bg-background flex flex-col items-center justify-center gap-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative"
      >
        <div className="absolute inset-0 blur-3xl bg-primary/30 rounded-full" />
        <div className="relative">
          <MegsyStar size={72} />
        </div>
      </motion.div>

      <div className="h-6 text-center px-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="text-sm md:text-base text-muted-foreground"
            dir="auto"
          >
            {MESSAGES[idx]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
};

export default PageLoader;
