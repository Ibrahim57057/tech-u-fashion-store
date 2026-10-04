import { motion } from "motion/react";
import { CheckCircle, XCircle } from "lucide-react";

export default function Toast({ message, type = "success" }) {
  const Icon = type === "success" ? CheckCircle : XCircle;
  const iconColor = type === "success" ? "text-success" : "text-danger";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className='bg-brand-dark text-white text-sm px-4 py-3 rounded-card shadow-lg flex items-center gap-2'>
      <Icon className={`w-4 h-4 ${iconColor}`} />
      {message}
    </motion.div>
  );
}
