"use client";

import { TalksExplorer } from "@/components/talk/talks-explorer";
import { ApiFallbackNotice } from "@/components/shared/api-fallback-notice";
import { ApiStatusCard } from "@/components/shared/api-status-card";
import { useTalkBootstrapContext } from "@/components/shared/talk-bootstrap-provider";

export default function TalksPage() {
  const { data, error, isLoading, isFallback, reload } = useTalkBootstrapContext();

  if (isLoading || (!data && error) || !data) {
    return <ApiStatusCard isLoading={isLoading} error={error} onRetry={() => void reload()} />;
  }

  return (
    <div className="space-y-4">
      {isFallback ? <ApiFallbackNotice onRetry={() => void reload()} reason={error?.message} /> : null}
      <TalksExplorer
        talks={data.talks}
        categories={data.talkCategories}
        tags={data.talkTags}
        productLabels={data.productLabels}
        sceneLabels={data.sceneLabels}
      />
    </div>
  );
}
