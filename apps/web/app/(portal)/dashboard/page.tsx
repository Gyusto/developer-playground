"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Send,
  Radio,
  XCircle,
  Zap,
} from "lucide-react";
import { dashboardApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { DashboardMetrics } from "@/lib/types";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { timeAgo } from "@/lib/utils";

const EMPTY: DashboardMetrics = {
  totalSystems: 0,
  activeEndpoints: 0,
  requestsToday: 0,
  successfulRequests: 0,
  failedRequests: 0,
  webhookSuccessRate: 0,
  failedWebhookDeliveries: 0,
  recentActivity: [],
};

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.dashboard,
    queryFn: dashboardApi.metrics,
    // If the backend has no dashboard endpoint yet, fall back to zeroed metrics.
    retry: false,
  });

  const metrics = data ?? EMPTY;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your integration sandbox activity."
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          {isError && (
            <p className="text-sm text-muted-foreground">
              Live metrics are unavailable — showing placeholders.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Integration Systems" value={metrics.totalSystems} icon={Boxes} />
            <StatCard label="Active endpoints" value={metrics.activeEndpoints} icon={Zap} />
            <StatCard label="Requests today" value={metrics.requestsToday} icon={Activity} />
            <StatCard
              label="Successful requests"
              value={metrics.successfulRequests}
              icon={CheckCircle2}
              tone="success"
            />
            <StatCard
              label="Failed requests"
              value={metrics.failedRequests}
              icon={XCircle}
              tone="destructive"
            />
            <StatCard
              label="Webhook success rate"
              value={`${Math.round(metrics.webhookSuccessRate)}%`}
              icon={Send}
              tone="success"
            />
            <StatCard
              label="Failed deliveries"
              value={metrics.failedWebhookDeliveries}
              icon={AlertTriangle}
              tone="warning"
            />
            <StatCard label="Inbound events" value={metrics.recentActivity.length} icon={Radio} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.recentActivity.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No activity yet"
                  description="Requests, webhook deliveries and configuration changes will appear here."
                />
              ) : (
                <ul className="divide-y">
                  {metrics.recentActivity.map((item) => (
                    <li key={item.id} className="flex items-center justify-between py-3 text-sm">
                      <span>{item.message}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(item.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
