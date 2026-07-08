"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { logsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { formatDateTime } from "@/lib/utils";
import type { RequestLog, WebhookDelivery } from "@/lib/types";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { MethodBadge, StatusCodeBadge, DeliveryStatusBadge } from "@/components/shared/badges";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RequestLogDetails } from "@/components/logs/request-log-details";
import { WebhookDeliveryTimeline } from "@/components/logs/webhook-delivery-timeline";

export default function LogsPage({ params }: { params: { systemId: string } }) {
  const { systemId } = params;
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<RequestLog | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDelivery | null>(null);

  const requestLogs = useQuery({
    queryKey: qk.requestLogs({ systemId, search }),
    queryFn: () => logsApi.requestLogs({ systemId, search }),
  });

  const deliveries = useQuery({
    queryKey: qk.webhookDeliveries({ systemId }),
    queryFn: () => logsApi.webhookDeliveries({ systemId }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Logs" description="Request logs and outbound webhook delivery history for this system." />

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Request logs</TabsTrigger>
          <TabsTrigger value="webhooks">Webhook deliveries</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-3">
          <Input
            placeholder="Search by path, reference or correlation ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          {requestLogs.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !requestLogs.data || requestLogs.data.length === 0 ? (
            <EmptyState icon={ScrollText} title="No request logs" description="Calls to this system's endpoints will appear here." />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Method</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Source IP</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestLogs.data.map((log) => (
                    <TableRow key={log.id} className="cursor-pointer" onClick={() => setSelectedRequest(log)}>
                      <TableCell><MethodBadge method={log.method} /></TableCell>
                      <TableCell className="max-w-[220px] truncate font-mono text-xs">{log.path}</TableCell>
                      <TableCell><StatusCodeBadge code={log.statusCode} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.responseTimeMs ?? "—"} ms</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.sourceIp ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-3">
          {deliveries.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !deliveries.data || deliveries.data.length === 0 ? (
            <EmptyState icon={ScrollText} title="No webhook deliveries" description="Outbound webhook attempts will appear here." />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Webhook</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempt</TableHead>
                    <TableHead>HTTP</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.data.map((d) => (
                    <TableRow key={d.id} className="cursor-pointer" onClick={() => setSelectedDelivery(d)}>
                      <TableCell className="max-w-[180px] truncate">{d.webhookName ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.event ?? "—"}</TableCell>
                      <TableCell><DeliveryStatusBadge status={d.status} /></TableCell>
                      <TableCell className="text-xs">{d.attempt}</TableCell>
                      <TableCell><StatusCodeBadge code={d.httpStatus ?? undefined} /></TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(d.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedRequest} onOpenChange={(o) => !o && setSelectedRequest(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Request details</DialogTitle>
          </DialogHeader>
          {selectedRequest && <RequestLogDetails logId={selectedRequest.id} fallback={selectedRequest} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedDelivery} onOpenChange={(o) => !o && setSelectedDelivery(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Webhook delivery</DialogTitle>
          </DialogHeader>
          {selectedDelivery && (
            <WebhookDeliveryTimeline
              deliveries={[selectedDelivery]}
              invalidateKey={qk.webhookDeliveries({ systemId })}
              showPayload
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
