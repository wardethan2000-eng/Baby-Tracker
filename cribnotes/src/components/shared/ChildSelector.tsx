"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Plus } from "lucide-react";
import { formatChildAge } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useEffect, useMemo } from "react";

export function ChildSelector() {
  const selectedChildId = useAppStore((s) => s.selectedChildId);
  const setSelectedChildId = useAppStore((s) => s.setSelectedChildId);

  const { data: childrenData, isLoading } = useQuery({
    queryKey: ["children"],
    queryFn: () => fetch("/api/children").then((r) => r.json()),
  });

  const children = useMemo(
    () => (Array.isArray(childrenData) ? childrenData : []),
    [childrenData]
  );

  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId, setSelectedChildId]);

  if (isLoading) return null;

  if (!children || children.length === 0) return null;

  if (children.length === 1) {
    const child = children[0];
    return (
      <div className="px-4 py-2">
        <span className="text-sm font-medium text-text-primary">
          {child.name} · {formatChildAge(new Date(child.birthDate))}
        </span>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
      {children.map((child: any) => (
        <button
          key={child.id}
          onClick={() => setSelectedChildId(child.id)}
          className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
            selectedChildId === child.id
              ? "bg-primary text-base"
              : "bg-surface text-text-secondary hover:text-primary"
          }`}
        >
          {child.name} · {formatChildAge(new Date(child.birthDate))}
        </button>
      ))}
      <Link
        href="/settings"
        className="flex items-center justify-center w-10 h-10 rounded-full bg-surface text-text-muted hover:text-primary transition-colors shrink-0"
      >
        <Plus size={18} />
      </Link>
    </div>
  );
}
