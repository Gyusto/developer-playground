"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Inbox, RefreshCw, XCircle } from "lucide-react";
import { logsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { formatDateTime, prettyJson } from "@/lib/utils";
import type { InboundWebhookLog } from "@/lib/types";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MethodBadge } from "@/components/shared/badges";
import { JsonViewer } from "@/components/shared/json-viewer";
import { JsonDiffViewer } from "@/components/shared/json-diff-viewer";
import { CopyButton } from "@/components/shared/copy-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast, useToastError } from "@/components/ui/use-toast";

export default function WebhookInboxPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const toastError = useToastError();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<InboundWebhookLog | null>(null);

  const query = useQuery({
    queryKey: qk.inboundLogs({ search, status }),
    queryFn: () => logsApi.inboundWebhookLogs({ search, status }),
  });

  const replay = useMutation({
    mutationFn: (id: string) => logsApi.replayInbound(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbound-webhook-logs"] });
      toast({ variant: "success", title: "Webhook replayed" });
    },
    onError: (e) => toastError(e),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhook Inbox"
        description="Inspect, copy and replay inbound webhooks received by your environments."
      />

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search by event or reference"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Input
          placeholder="Status filter (e.g. PROCESSED)"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {query.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !query.data || query.data.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No inbound webhooks"
          description="Webhooks POSTed to your generated receiver URLs will show up here."
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Method</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Signature</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.map((log) => (
                <TableRow key={log.id} className="cursor-pointer" onClick={() => setSelected(log)}>
                  <TableCell><MethodBadge method={log.method} /></TableCell>
                  <TableCell className="text-sm">{log.event ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{log.reference ?? "—"}</TableCell>
                  <TableCell><SignatureBadge valid={log.signatureValid} /></TableCell>
                  <TableCell>{log.status ? <Badge variant="secondary">{log.status}</Badge> : "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(log.receivedAt ?? log.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Inbound webhook
              {selected && <SignatureBadge valid={selected.signatureValid} />}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <InboundDetail
              log={selected}
              onReplay={() => replay.mutate(selected.id)}
              replaying={replay.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SignatureBadge({ valid }: { valid?: boolean | null }) {
  if (valid == null) return <Badge variant="outline">unsigned</Badge>;
  return valid ? (
    <Badge variant="success" className="gap-1">
      <CheckCircle2 className="h-3 w-3" /> valid
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" /> invalid
    </Badge>
  );
}

function InboundDetail({
  log,
  onReplay,
  replaying,
}: {
  log: InboundWebhookLog;
  onReplay: () => void;
  replaying: boolean;
}) {
  const [schemaText, setSchemaText] = useState("");
  const bodyString = prettyJson(log.body);

  return (
    <Tabs defaultValue="payload">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="payload">Payload</TabsTrigger>
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
        </TabsList>
        <div className="flex gap-2">
          <CopyButton value={bodyString} label="Copy payload" />
          <Button size="sm" onClick={onReplay} loading={replaying}>
            <RefreshCw className="h-3.5 w-3.5" /> Replay
          </Button>
        </div>
      </div>

      <TabsContent value="payload" className="space-y-3">
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div>URL: <span className="font-mono text-foreground">{log.url}</span></div>
          <div>Source IP: <span className="text-foreground">{log.sourceIp ?? "—"}</span></div>
          <div>Content-Type: <span className="text-foreground">{log.contentType ?? "—"}</span></div>
          <div>Received: <span className="text-foreground">{formatDateTime(log.receivedAt ?? log.createdAt)}</span></div>
        </div>
        <JsonViewer value={log.body} maxHeight={280} />
        {log.query && Object.keys(log.query).length > 0 && (
          <div>
            <p className="mb-1 text-sm font-medium">Query parameters</p>
            <JsonViewer value={log.query} maxHeight={140} />
          </div>
        )}
      </TabsContent>

      <TabsContent value="headers">
        <JsonViewer value={log.headers} maxHeight={320} />
      </TabsContent>

      <TabsContent value="compare" className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Paste an expected payload to diff against the received body.
        </p>
        <textarea
          value={schemaText}
          onChange={(e) => setSchemaText(e.target.value)}
          placeholder='{"event":"PAYMENT_COMPLETED", ...}'
          className="scrollbar-thin h-32 w-full rounded-md border bg-background p-2 font-mono text-xs"
        />
        {schemaText.trim() && (
          <JsonDiffViewer
            left={tryParse(schemaText)}
            right={log.body}
            leftLabel="Expected"
            rightLabel="Received"
          />
        )}
      </TabsContent>
    </Tabs>
  );
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
