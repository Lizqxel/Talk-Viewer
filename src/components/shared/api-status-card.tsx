"use client";

import { AlertTriangle, LockKeyhole, RefreshCw, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type TalkPortalApiError } from "@/lib/talk-portal-api";

interface ApiStatusCardProps {
  error?: TalkPortalApiError | null;
  isLoading?: boolean;
  onRetry?: () => void;
}

export function ApiStatusCard({ error, isLoading, onRetry }: ApiStatusCardProps) {
  if (isLoading) {
    return (
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-base">データを読み込み中です</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          社内アカウントの認証状態を確認しながら、トークデータを取得しています。
        </CardContent>
      </Card>
    );
  }

  if (!error) {
    return null;
  }

  const isDomainBlocked = error.code === "FORBIDDEN_DOMAIN";
  const isUnauthenticated = error.code === "UNAUTHENTICATED_USER" || error.status === 401;
  const isUnauthorized = isDomainBlocked || isUnauthenticated || error.status === 403;
  const isConfigError = error.code === "MISSING_API_URL";

  const Icon = isUnauthorized ? LockKeyhole : isConfigError ? Settings : AlertTriangle;
  const title = isDomainBlocked
    ? "社外アカウントからはアクセスできません"
    : isUnauthenticated
      ? "社内アカウントで認証されていません"
      : isUnauthorized
        ? "アクセス権限がありません"
    : isConfigError
      ? "API接続先が未設定です"
      : "データの取得に失敗しました";
  const message = isDomainBlocked
    ? "@bb-connection.com のアカウントでログインしたユーザーのみ閲覧可能です。"
    : isUnauthenticated
      ? "Googleアカウントが認証できていません。@bb-connection.com アカウントでログインして再読み込みしてください。"
    : isUnauthorized
      ? "アクセス権限がありません。管理者へ権限付与を依頼してください。"
    : isConfigError
      ? "NEXT_PUBLIC_TALK_API_URL を設定してビルドし直してください。"
      : error.message;

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" aria-hidden="true" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{message}</p>
        {onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry}>
            <RefreshCw className="size-4" aria-hidden="true" />
            再読み込み
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}