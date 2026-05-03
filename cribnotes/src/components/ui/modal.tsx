"use client";

import { cn } from "@/lib/utils";
import React, { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ open, onClose, title, children }) => {
  useEffect(() => {
    if (open) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [open]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm transition-all duration-300"
      onClick={onClose}
    >
      <div 
        className={cn(
          "w-full bg-surface rounded-t-3xl p-4 transition-transform duration-300 ease-out",
          open ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-12 h-1.5 bg-border rounded-full"></div>
        </div>
        {title && (
          <h3 className="text-lg font-semibold text-text-primary mb-4 text-center">
            {title}
          </h3>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
};

export { Modal };