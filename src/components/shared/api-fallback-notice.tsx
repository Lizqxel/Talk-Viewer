"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ApiFallbackNoticeProps {
  onRetry?: () => void;
  reason?: string;
}

export function ApiFallbackNotice({ onRetry, reason }: ApiFallbackNoticeProps) {
  return (
    <div className="rounded-lg border border-amber-400/40 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="flex items-center gap-2 font-medium">
        <AlertTriangle className="size-4" aria-hidden="true" />
        APIに接続できないため、ローカルの既存データを表示しています。
      </p>
      <p className="mt-1 text-xs text-amber-800">Google認証状態またはアクセス制御設定を確認後、再読み込みしてください。</p>
      {reason ? <p className="mt-1 text-xs text-amber-800">原因: {reason}</p> : null}
      {onRetry ? (
        <div className="mt-2">
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="size-4" aria-hidden="true" />
            APIで再取得
          </Button>
        </div>
      ) : null}
    </div>
  );
}