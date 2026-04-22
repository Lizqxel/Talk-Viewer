"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2, RefreshCw, ShieldAlert } from "lucide-react";

import { useTalkBootstrapContext } from "@/components/shared/talk-bootstrap-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getTalkPortalAuthorizeUrl, verifyPortalPasswordByApi } from "@/lib/talk-portal-api";

const AUTH_INIT_QUERY_KEY = "talkAuthInit";
const AUTO_AUTH_ATTEMPT_STORAGE_KEY = "talk-portal:auto-auth-init-attempted";

function toErrorMessage(caught: unknown) {
  if (caught instanceof Error) {
    return caught.message;
  }

  return String(caught);
}

export function PasswordAccessGate() {
  const { data, error, isLoading, reload } = useTalkBootstrapContext();
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const errorCode = error?.code ?? "";
  const isPasswordRequired = errorCode === "PASSWORD_REQUIRED";
  const isPasswordNotConfigured = errorCode === "PASSWORD_NOT_CONFIGURED";
  const isAuthFlowIssue =
    errorCode === "AUTH_REDIRECT" ||
    errorCode === "BOOTSTRAP_TIMEOUT" ||
    errorCode === "JSONP_TIMEOUT" ||
    errorCode === "JSONP_LOAD_ERROR" ||
    errorCode === "NETWORK_ERROR";
  const shouldRenderGate =
    !isLoading &&
    !data &&
    (isPasswordRequired || isPasswordNotConfigured || isAuthFlowIssue);
  const authorizeUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.set(AUTH_INIT_QUERY_KEY, "1");
    return getTalkPortalAuthorizeUrl(returnUrl.toString());
  }, []);

  useEffect(() => {
    if (!isAuthFlowIssue) {
      return;
    }

    if (!authorizeUrl || typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    const alreadyInitialized = url.searchParams.get(AUTH_INIT_QUERY_KEY) === "1";
    const attempted = window.sessionStorage.getItem(AUTO_AUTH_ATTEMPT_STORAGE_KEY) === "1";

    if (alreadyInitialized || attempted) {
      return;
    }

    window.sessionStorage.setItem(AUTO_AUTH_ATTEMPT_STORAGE_KEY, "1");
    window.location.assign(authorizeUrl);
  }, [authorizeUrl, isAuthFlowIssue]);

  if (!shouldRenderGate) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!password.trim()) {
      setSubmitError("パスワードを入力してください。");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitMessage(null);

    try {
      await verifyPortalPasswordByApi(password);
      setPassword("");
      const reloadError = await reload();
      if (reloadError) {
        setSubmitError(`認証後の再取得に失敗しました: ${reloadError.message}`);
        return;
      }

      setSubmitMessage("認証が完了しました。");
    } catch (caught) {
      setSubmitError(toErrorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(10,15,28,0.88)_0%,_rgba(8,12,22,0.95)_62%,_rgba(6,10,18,0.98)_100%)] p-4 md:p-8">
      <Card className="w-full max-w-xl border-white/15 bg-zinc-950/90 text-zinc-100 shadow-[0_24px_48px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <KeyRound className="size-5 text-amber-300" aria-hidden="true" />
            サイトアクセス認証
          </CardTitle>
          <CardDescription className="text-zinc-300">
            Googleアカウント判定は利用せず、サイト共通パスワードでアクセスを制御しています。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAuthFlowIssue ? (
            <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              <p className="font-medium">認証状態の確認に失敗しました</p>
              <p className="mt-1 text-xs text-amber-100/90">
                初回アクセス時は Google の認可確認画面が表示される場合があります。表示されたら画面の案内に沿って
                許可を完了し、その後にパスワードを入力してください。
              </p>
              {authorizeUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 border-amber-300/60 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:text-amber-950"
                  onClick={() => {
                    if (typeof window === "undefined") {
                      return;
                    }
                    window.location.assign(authorizeUrl);
                  }}
                >
                  Google 認可画面を開く
                </Button>
              ) : null}
            </div>
          ) : null}

          {isPasswordNotConfigured ? (
            <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              <p className="flex items-center gap-1.5 font-medium">
                <ShieldAlert className="size-4" aria-hidden="true" />
                PORTAL_ACCESS_PASSWORD が未設定です
              </p>
              <p className="mt-1 text-xs text-rose-100/90">
                Apps Script の Script Properties に PORTAL_ACCESS_PASSWORD を設定後、再読み込みしてください。
              </p>
            </div>
          ) : null}

          <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
            <Input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setSubmitError(null);
                setSubmitMessage(null);
              }}
              placeholder="アクセスパスワード"
              disabled={isSubmitting || isPasswordNotConfigured}
              autoComplete="current-password"
              className="border-white/20 bg-zinc-900/60 text-zinc-100 placeholder:text-zinc-400"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSubmitting || isPasswordNotConfigured}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                入室する
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-zinc-500/60 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-zinc-100"
                disabled={isSubmitting}
                onClick={() => {
                  void reload();
                }}
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                再読み込み
              </Button>
            </div>
          </form>

          {submitMessage ? <p className="text-sm text-emerald-300">{submitMessage}</p> : null}
          {submitError ? <p className="text-sm text-rose-300">{submitError}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
