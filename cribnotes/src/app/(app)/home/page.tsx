"use client";

import QuickLogGrid from "@/components/dashboard/QuickLogGrid";
import RecentActivity from "@/components/dashboard/RecentActivity";
import DailyStats from "@/components/dashboard/DailyStats";
import { NotesAttention } from "@/components/notes/NotesAttention";

export default function DashboardPage() {
  return (
    <div className="px-4 pt-4 pb-4">
      <QuickLogGrid />
      <DailyStats />
      <NotesAttention />
      <div className="mt-8">
        <RecentActivity />
      </div>
    </div>
  );
}
