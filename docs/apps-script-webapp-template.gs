/**
 * Talk Portal API (Google Apps Script)
 *
 * Required Script Properties:
 * - SPREADSHEET_ID
 * - ALLOWED_DOMAIN  (example: bb-connection.com)
 * - ALLOWED_EMAILS  (optional, comma-separated emails)
 * - TALKS_SHEET     (default: Talks)
 * - EDITORS_SHEET   (default: Editors)
 * - HIGHLIGHTS_SHEET (default: DailyHighlights)
 * - AUDIT_SHEET     (default: AuditLog)
 * - CLOSING_SHEET   (default: Closing)
 * - CLOSING_AUDIT_SHEET   (default: ClosingAudit)
 * - ALLOWED_RETURN_HOSTS (optional, comma-separated. ex: lizqxel.github.io,localhost:3000)
 */

function doGet(e) {
  const callback = getCallbackName_(e);

  if (isLegacyEchoRequest_(e)) {
    return sendResponse_(
      {
        ok: false,
        error: {
          code: "INVALID_ENDPOINT",
          message: "このURLでは利用できません。Webアプリの /exec URL を利用してください。",
        },
      },
      400,
      callback,
    );
  }

  try {
    const action = (e && e.parameter && e.parameter.action) || "";

    if (action === "whoami") {
      const allowDebug = getDomainAllowanceDebug_(safeEmail_());

      return sendResponse_(
        {
          ok: true,
          message: allowDebug.email
            ? "判定対象のメールアドレスを取得できました"
            : "メールアドレスを取得できませんでした。Google アカウントの状態を確認してください",
          data: {
            action: "whoami",
            email: allowDebug.email,
            isAllowed: allowDebug.allowed,
            matchedAllowedEmail: allowDebug.matchedAllowedEmail,
            matchedAllowedDomain: allowDebug.matchedAllowedDomain,
            allowedDomain: allowDebug.allowedDomain,
            allowedEmailsCount: allowDebug.allowedEmailsCount,
          },
        },
        200,
        callback,
      );
    }

    const userEmail = getUserEmail_();

    if (!isDomainAllowed_(userEmail)) {
      return sendResponse_(
        {
          ok: false,
          error: {
            code: "FORBIDDEN_DOMAIN",
            message: "許可されたアカウントのみアクセス可能です",
          },
        },
        403,
        callback,
      );
    }

    const canEdit = isEditor_(userEmail);
    const isAdmin = isAdmin_(userEmail);

    if (action === "authorize") {
      const returnTo = getReturnTo_(e);

      if (!callback && returnTo) {
        return htmlRedirectResponse_(returnTo);
      }

      return sendResponse_(
        {
          ok: true,
          message: "認証を確認しました。元のサイトに戻って再読み込みしてください。",
          user: {
            email: userEmail,
            canEdit: canEdit,
            isAdmin: isAdmin,
          },
        },
        200,
        callback,
      );
    }

    if (action === "listEditorPermissions") {
      if (!isAdmin) {
        return sendResponse_(
          {
            ok: false,
            error: {
              code: "FORBIDDEN_ADMIN",
              message: "管理者権限がありません",
            },
          },
          403,
          callback,
        );
      }

      return sendResponse_(
        {
          ok: true,
          user: {
            email: userEmail,
            canEdit: canEdit,
            isAdmin: isAdmin,
          },
          data: {
            editorPermissions: listEditorPermissions_(),
          },
        },
        200,
        callback,
      );
    }

    if (
      action === "closingDashboard" ||
      action === "getClosingDashboard" ||
      action === "getClosingMetrics"
    ) {
      var targetEmail = normalizeEmail_(
        e && e.parameter && e.parameter.email ? e.parameter.email : userEmail,
      );

      if (!isAdmin && targetEmail !== normalizeEmail_(userEmail)) {
        return sendResponse_(
          {
            ok: false,
            error: {
              code: "FORBIDDEN_TARGET",
              message: "他ユーザーのダッシュボードは取得できません",
            },
          },
          403,
          callback,
        );
      }

      var now = new Date();
      var dayKey =
        e && e.parameter && e.parameter.dayKey
          ? String(e.parameter.dayKey)
          : formatTokyoDayKey_(now);
      var monthKey =
        e && e.parameter && e.parameter.monthKey
          ? String(e.parameter.monthKey)
          : formatTokyoMonthKey_(now);

      var dashboard = getClosingDashboardByEmail_(targetEmail, dayKey, monthKey);

      return sendResponse_(
        {
          ok: true,
          user: {
            email: userEmail,
            canEdit: canEdit,
            isAdmin: isAdmin,
          },
          data: {
            closing: dashboard,
          },
        },
        200,
        callback,
      );
    }

    if (
      action === "closingInactivityAlerts" ||
      action === "closingAlerts" ||
      action === "listClosingAlerts"
    ) {
      if (!isAdmin) {
        return sendResponse_(
          {
            ok: false,
            error: {
              code: "FORBIDDEN_ADMIN",
              message: "管理者権限がありません",
            },
          },
          403,
          callback,
        );
      }

      var thresholdMinutes = parseNumber_(
        e && e.parameter && e.parameter.thresholdMinutes ? e.parameter.thresholdMinutes : 15,
        15,
      );

      return sendResponse_(
        {
          ok: true,
          user: {
            email: userEmail,
            canEdit: canEdit,
            isAdmin: isAdmin,
          },
          data: {
            alerts: listClosingInactivityAlerts_(thresholdMinutes, new Date()),
          },
        },
        200,
        callback,
      );
    }

    if (
      action === "recordClosing" ||
      action === "incrementClosing" ||
      action === "addClosingCount"
    ) {
      if (!canEdit) {
        return sendResponse_(
          {
            ok: false,
            error: {
              code: "FORBIDDEN_EDITOR",
              message: "編集権限がありません",
            },
          },
          403,
          callback,
        );
      }

      var recordedByGet = recordClosing_(userEmail, new Date());
      appendClosingAudit_(
        "recordClosing",
        userEmail,
        "ok",
        "today=" + recordedByGet.todayClosingCount + ", via=get",
      );

      return sendResponse_(
        {
          ok: true,
          user: {
            email: userEmail,
            canEdit: canEdit,
            isAdmin: isAdmin,
          },
          data: {
            closing: recordedByGet,
          },
        },
        200,
        callback,
      );
    }

    if (action !== "bootstrap") {
      return sendResponse_(
        {
          ok: false,
          error: {
            code: "INVALID_ACTION",
            message:
              "指定された action はサポートされていません（bootstrap / authorize / listEditorPermissions / whoami / closingDashboard / closingInactivityAlerts / recordClosing）",
          },
        },
        400,
        callback,
      );
    }

    const payload = buildBootstrapPayload_(userEmail, canEdit, isAdmin);

    return sendResponse_(
      {
        ok: true,
        user: {
          email: userEmail,
          canEdit: canEdit,
          isAdmin: isAdmin,
        },
        data: payload,
      },
      200,
      callback,
    );
  } catch (err) {
    return sendResponse_(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: String(err),
        },
      },
      500,
      callback,
    );
  }
}

function doPost(e) {
  var auditAction = "unknown";

  try {
    const userEmail = getUserEmail_();
    const canEdit = isEditor_(userEmail);
    const isAdmin = isAdmin_(userEmail);

    if (!isDomainAllowed_(userEmail)) {
      return jsonResponse_(
        {
          ok: false,
          error: {
            code: "FORBIDDEN_DOMAIN",
            message: "許可されたアカウントのみアクセス可能です",
          },
        },
        403,
      );
    }

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_(
        {
          ok: false,
          error: {
            code: "INVALID_BODY",
            message: "POSTボディが空です",
          },
        },
        400,
      );
    }

    const body = JSON.parse(e.postData.contents);
    const action = body.action || "";
    auditAction = action || "unknown";

    if (action === "upsertEditorPermission") {
      if (!isAdmin) {
        return jsonResponse_(
          {
            ok: false,
            error: {
              code: "FORBIDDEN_ADMIN",
              message: "管理者権限がありません",
            },
          },
          403,
        );
      }

      const editor = body.editor || body.permission;
      if (!editor || !editor.email) {
        return jsonResponse_(
          {
            ok: false,
            error: {
              code: "INVALID_EDITOR",
              message: "editor.email が必要です",
            },
          },
          400,
        );
      }

      const updated = upsertEditorPermission_(editor, userEmail);
      appendAudit_("upsertEditorPermission", "", userEmail, "ok", updated.email);

      return jsonResponse_({
        ok: true,
        user: {
          email: userEmail,
          canEdit: canEdit,
          isAdmin: isAdmin,
        },
        data: {
          editor: updated,
        },
      });
    }

    if (action === "deleteEditorPermission") {
      if (!isAdmin) {
        return jsonResponse_(
          {
            ok: false,
            error: {
              code: "FORBIDDEN_ADMIN",
              message: "管理者権限がありません",
            },
          },
          403,
        );
      }

      var targetEmail = normalizeEmail_(
        body.email || body.editorEmail || (body.editor && body.editor.email),
      );
      if (!targetEmail) {
        return jsonResponse_(
          {
            ok: false,
            error: {
              code: "INVALID_EDITOR",
              message: "削除対象のメールアドレスが必要です",
            },
          },
          400,
        );
      }

      var deleted = deleteEditorPermission_(targetEmail, userEmail);
      appendAudit_("deleteEditorPermission", "", userEmail, "ok", deleted.email);

      return jsonResponse_({
        ok: true,
        user: {
          email: userEmail,
          canEdit: canEdit,
          isAdmin: isAdmin,
        },
        data: {
          deleted: deleted,
        },
      });
    }

    if (action === "upsertDailyHighlight") {
      if (!canEdit) {
        return jsonResponse_(
          {
            ok: false,
            error: {
              code: "FORBIDDEN_EDITOR",
              message: "編集権限がありません",
            },
          },
          403,
        );
      }

      var highlight = body.highlight || body.dailyHighlight || body.item;
      if (!highlight || !highlight.id) {
        return jsonResponse_(
          {
            ok: false,
            error: {
              code: "INVALID_HIGHLIGHT",
              message: "highlight.id が必要です",
            },
          },
          400,
        );
      }

      var updatedHighlight = upsertDailyHighlight_(highlight, userEmail);
      appendAudit_("upsertDailyHighlight", "", userEmail, "ok", updatedHighlight.id);

      return jsonResponse_(
        {
          ok: true,
          user: {
            email: userEmail,
            canEdit: canEdit,
            isAdmin: isAdmin,
          },
          data: {
            highlight: updatedHighlight,
          },
        },
        200,
      );
    }

    if (action === "deleteTalk") {
      if (!canEdit) {
        return jsonResponse_(
          {
            ok: false,
            error: {
              code: "FORBIDDEN_EDITOR",
              message: "編集権限がありません",
            },
          },
          403,
        );
      }

      var targetTalkId = String(body.talkId || body.id || (body.talk && body.talk.id) || "").trim();
      if (!targetTalkId) {
        return jsonResponse_(
          {
            ok: false,
            error: {
              code: "INVALID_TALK",
              message: "削除対象の talkId が必要です",
            },
          },
          400,
        );
      }

      var deletedTalk = deleteTalk_(targetTalkId, userEmail);
      appendAudit_(
        "deleteTalk",
        deletedTalk.talkId,
        userEmail,
        "ok",
        "revision=" + deletedTalk.revision,
      );

      return jsonResponse_({
        ok: true,
        user: {
          email: userEmail,
          canEdit: canEdit,
          isAdmin: isAdmin,
        },
        data: {
          talkId: deletedTalk.talkId,
          revision: deletedTalk.revision,
          deleted: {
            talkId: deletedTalk.talkId,
          },
        },
      });
    }

    if (
      action === "recordClosing" ||
      action === "incrementClosing" ||
      action === "addClosingCount"
    ) {
      if (!canEdit) {
        return jsonResponse_(
          {
            ok: false,
            error: {
              code: "FORBIDDEN_EDITOR",
              message: "編集権限がありません",
            },
          },
          403,
        );
      }

      var recorded = recordClosing_(userEmail, new Date());
      appendClosingAudit_("recordClosing", userEmail, "ok", "today=" + recorded.todayClosingCount);

      return jsonResponse_(
        {
          ok: true,
          user: {
            email: userEmail,
            canEdit: canEdit,
            isAdmin: isAdmin,
          },
          data: {
            closing: recorded,
          },
        },
        200,
      );
    }

    if (action === "updateClosingStats" || action === "upsertClosingStats") {
      if (!canEdit) {
        return jsonResponse_(
          {
            ok: false,
            error: {
              code: "FORBIDDEN_EDITOR",
              message: "編集権限がありません",
            },
          },
          403,
        );
      }

      var updated = upsertClosingStats_(userEmail, body, new Date());
      appendClosingAudit_(
        "updateClosingStats",
        userEmail,
        "ok",
        "pt=" + updated.todayAcquiredPt + ", dialog=" + updated.todayDialogCount,
      );

      return jsonResponse_(
        {
          ok: true,
          user: {
            email: userEmail,
            canEdit: canEdit,
            isAdmin: isAdmin,
          },
          data: {
            closing: updated,
          },
        },
        200,
      );
    }

    if (action === "resetClosingDaily") {
      var targetEmail = normalizeEmail_(body.email || userEmail);
      if (!isAdmin && targetEmail !== normalizeEmail_(userEmail)) {
        return jsonResponse_(
          {
            ok: false,
            error: {
              code: "FORBIDDEN_TARGET",
              message: "他ユーザーの日次リセットは管理者のみ可能です",
            },
          },
          403,
        );
      }

      var dayKey = body.dayKey ? String(body.dayKey) : formatTokyoDayKey_(new Date());
      var resetDaily = resetClosingDaily_(targetEmail, dayKey, userEmail, new Date());
      appendClosingAudit_("resetClosingDaily", userEmail, "ok", targetEmail + ":" + dayKey);

      return jsonResponse_(
        {
          ok: true,
          user: {
            email: userEmail,
            canEdit: canEdit,
            isAdmin: isAdmin,
          },
          data: {
            closing: resetDaily,
          },
        },
        200,
      );
    }

    if (action === "resetClosingMonthly") {
      if (!isAdmin) {
        return jsonResponse_(
          {
            ok: false,
            error: {
              code: "FORBIDDEN_ADMIN",
              message: "管理者権限がありません",
            },
          },
          403,
        );
      }

      var monthTargetEmail = normalizeEmail_(body.email || userEmail);
      var monthKey = body.monthKey ? String(body.monthKey) : formatTokyoMonthKey_(new Date());
      var resetMonthly = resetClosingMonthly_(monthTargetEmail, monthKey, userEmail, new Date());
      appendClosingAudit_(
        "resetClosingMonthly",
        userEmail,
        "ok",
        monthTargetEmail + ":" + monthKey,
      );

      return jsonResponse_(
        {
          ok: true,
          user: {
            email: userEmail,
            canEdit: canEdit,
            isAdmin: isAdmin,
          },
          data: {
            closing: resetMonthly,
          },
        },
        200,
      );
    }

    if (action !== "updateTalk") {
      return jsonResponse_(
        {
          ok: false,
          error: {
            code: "INVALID_ACTION",
            message:
              "updateTalk / deleteTalk / upsertEditorPermission / deleteEditorPermission / upsertDailyHighlight / recordClosing / updateClosingStats / resetClosingDaily / resetClosingMonthly をサポートしています",
          },
        },
        400,
      );
    }

    if (!canEdit) {
      return jsonResponse_(
        {
          ok: false,
          error: {
            code: "FORBIDDEN_EDITOR",
            message: "編集権限がありません",
          },
        },
        403,
      );
    }

    const talk = body.talk;
    if (!talk || !talk.id) {
      return jsonResponse_(
        {
          ok: false,
          error: {
            code: "INVALID_TALK",
            message: "talk.id が必要です",
          },
        },
        400,
      );
    }

    const result = upsertTalk_(talk, userEmail);

    appendAudit_("updateTalk", talk.id, userEmail, "ok", "revision=" + result.revision);

    return jsonResponse_({
      ok: true,
      user: {
        email: userEmail,
        canEdit: true,
        isAdmin: isAdmin,
      },
      data: {
        talkId: talk.id,
        revision: result.revision,
      },
    });
  } catch (err) {
    const email = safeEmail_();
    appendAudit_(auditAction, "", email, "error", String(err));

    return jsonResponse_(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: String(err),
        },
      },
      500,
    );
  }
}

function buildBootstrapPayload_(userEmail, canEdit, isAdmin) {
  const talks = listTalks_();
  const dailyHighlights = listDailyHighlights_();

  const fallbackProductLabels = {
    hikari: "光回線",
    denki: "電気",
    wifi: "WiFi",
    oa: "OA機器",
  };

  const fallbackSceneLabels = {
    kojin: "個人宅向け",
    hojin: "法人向け",
    objection: "断り切り返し",
    remind: "リマインド",
    reception: "受付突破",
    negotiation: "商談",
  };

  return {
    announcements: [],
    dailyHighlights: dailyHighlights,
    quickLinks: [],
    featuredItems: talks.slice(0, 3).map(function (talk, index) {
      return {
        id: "featured-" + (index + 1),
        talkId: talk.id,
        reason: "最新運用データ",
        rank: index + 1,
      };
    }),
    recentUpdates: talks.slice(0, 5).map(function (talk, index) {
      return {
        id: "recent-" + (index + 1),
        talkId: talk.id,
        title: talk.title,
        detail: "スプレッドシート経由で更新",
        date: talk.updatedAt || "",
        type: "talk",
      };
    }),
    talkCategories: buildCategories_(talks),
    talkTags: collectTags_(talks),
    productLabels: fallbackProductLabels,
    sceneLabels: fallbackSceneLabels,
    talks: talks,
    user: {
      email: userEmail,
      canEdit: canEdit,
      isAdmin: isAdmin,
    },
  };
}

function ensureDailyHighlightsColumns_(sheet) {
  var values = sheet.getDataRange().getValues();
  var header = values.length > 0 ? values[0] : [];

  if (header.length === 1 && String(header[0] || "").trim() === "") {
    header = [];
  }

  var required = ["id", "title", "detail", "is_active", "sort_order", "updated_at", "updated_by"];

  var changed = false;
  for (var i = 0; i < required.length; i += 1) {
    if (header.indexOf(required[i]) === -1) {
      header.push(required[i]);
      changed = true;
    }
  }

  if (changed || values.length === 0) {
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
  }
}

function listDailyHighlights_() {
  var sheet = getSheet_(prop_("HIGHLIGHTS_SHEET", "DailyHighlights"));
  ensureDailyHighlightsColumns_(sheet);

  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return [];
  }

  var idx = indexMap_(values[0]);
  var highlights = [];

  for (var i = 1; i < values.length; i += 1) {
    var row = values[i];
    var isActive = parseBoolean_(
      getRowValueByKeys_(row, idx, ["is_active", "isActive", "有効"]),
      true,
    );

    if (!isActive) {
      continue;
    }

    var id = String(
      getRowValueByKeys_(row, idx, ["id", "highlight_id", "highlightId"]) || "",
    ).trim();
    var title = String(getRowValueByKeys_(row, idx, ["title", "見出し"]) || "").trim();
    var detail = String(getRowValueByKeys_(row, idx, ["detail", "body", "本文"]) || "").trim();

    if (!id || !title || !detail) {
      continue;
    }

    var sortOrder = parseNumber_(
      getRowValueByKeys_(row, idx, ["sort_order", "sortOrder", "並び順"]),
      9999,
    );

    highlights.push({
      id: id,
      title: title,
      detail: detail,
      sortOrder: sortOrder,
    });
  }

  highlights.sort(function (a, b) {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }

    return String(a.id).localeCompare(String(b.id));
  });

  return highlights.map(function (item) {
    return {
      id: item.id,
      title: item.title,
      detail: item.detail,
    };
  });
}

function upsertDailyHighlight_(highlight, actorEmail) {
  var sheet = getSheet_(prop_("HIGHLIGHTS_SHEET", "DailyHighlights"));
  ensureDailyHighlightsColumns_(sheet);

  var values = sheet.getDataRange().getValues();
  if (values.length === 0) {
    values = [["id", "title", "detail", "is_active", "sort_order", "updated_at", "updated_by"]];
    sheet.getRange(1, 1, 1, values[0].length).setValues(values);
  }

  var idx = indexMap_(values[0]);
  var id = String(highlight.id || highlight.highlightId || highlight.highlight_id || "").trim();
  if (!id) {
    throw new Error("highlight.id が必要です");
  }

  var title = String(highlight.title || "").trim();
  var detail = String(highlight.detail || highlight.body || "").trim();
  if (!title || !detail) {
    throw new Error("highlight.title / highlight.detail が必要です");
  }

  var isActive = parseBoolean_(highlight.isActive, true);

  var targetRowNumber = -1;
  var existingSortOrder = "";
  for (var i = 1; i < values.length; i += 1) {
    var rowId = String(
      getRowValueByKeys_(values[i], idx, ["id", "highlight_id", "highlightId"]) || "",
    ).trim();
    if (rowId === id) {
      targetRowNumber = i + 1;
      existingSortOrder = getRowValueByKeys_(values[i], idx, ["sort_order", "sortOrder", "並び順"]);
      break;
    }
  }

  var defaultSortOrder =
    existingSortOrder === ""
      ? Math.max(1, values.length)
      : parseNumber_(existingSortOrder, Math.max(1, values.length));
  var sortOrderCandidate = highlight.sortOrder;
  if (
    sortOrderCandidate === undefined ||
    sortOrderCandidate === null ||
    sortOrderCandidate === ""
  ) {
    sortOrderCandidate = defaultSortOrder;
  }
  var sortOrder = parseNumber_(sortOrderCandidate, defaultSortOrder);

  var rowLength = values[0].length;
  var rowValues =
    targetRowNumber === -1 ? new Array(rowLength).fill("") : values[targetRowNumber - 1].slice();

  while (rowValues.length < rowLength) {
    rowValues.push("");
  }

  var now = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
  var actor = normalizeEmail_(actorEmail);

  setRowValueIfPresent_(rowValues, idx, ["id", "highlight_id", "highlightId"], id);
  setRowValueIfPresent_(rowValues, idx, ["title", "見出し"], title);
  setRowValueIfPresent_(rowValues, idx, ["detail", "body", "本文"], detail);
  setRowValueIfPresent_(rowValues, idx, ["is_active", "isActive", "有効"], isActive);
  setRowValueIfPresent_(rowValues, idx, ["sort_order", "sortOrder", "並び順"], sortOrder);
  setRowValueIfPresent_(rowValues, idx, ["updated_at", "updatedAt", "更新日時"], now);
  setRowValueIfPresent_(rowValues, idx, ["updated_by", "updatedBy", "更新者"], actor);

  if (targetRowNumber === -1) {
    sheet.appendRow(rowValues);
  } else {
    sheet.getRange(targetRowNumber, 1, 1, rowValues.length).setValues([rowValues]);
  }

  return {
    id: id,
    title: title,
    detail: detail,
  };
}

function listTalks_() {
  const sheet = getSheet_(prop_("TALKS_SHEET", "Talks"));
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return [];
  }

  const header = values[0];
  const rows = values.slice(1);

  const idx = indexMap_(header);
  const talks = [];

  rows.forEach(function (row) {
    const rawIsActive = getRowValueByKeys_(row, idx, ["is_active", "isActive", "有効"]);
    const isActive = parseBoolean_(rawIsActive === "" ? true : rawIsActive, true);
    if (!isActive) {
      return;
    }

    const jsonText = getRowValueByKeys_(row, idx, [
      "payload_json",
      "payloadJson",
      "payload",
      "json",
    ]);
    if (!jsonText) {
      return;
    }

    const talk = JSON.parse(String(jsonText));
    talk.updatedAt =
      getRowValueByKeys_(row, idx, ["updated_at", "updatedAt", "更新日時"]) || talk.updatedAt || "";
    talks.push(talk);
  });

  talks.sort(function (a, b) {
    return String(b.updatedAt).localeCompare(String(a.updatedAt));
  });

  return talks;
}

function upsertTalk_(talk, userEmail) {
  const sheet = getSheet_(prop_("TALKS_SHEET", "Talks"));
  const values = sheet.getDataRange().getValues();

  const header = values[0];
  const idx = indexMap_(header);
  const now = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");

  let rowIndex = -1;
  let currentRevision = 0;

  for (var i = 1; i < values.length; i += 1) {
    if (String(values[i][idx.talk_id]) === String(talk.id)) {
      rowIndex = i + 1;
      currentRevision = Number(values[i][idx.revision] || 0);
      break;
    }
  }

  const nextRevision = currentRevision + 1;
  const rowValues = [
    talk.id,
    talk.title || "",
    now,
    userEmail,
    nextRevision,
    true,
    JSON.stringify(talk),
  ];

  if (rowIndex === -1) {
    sheet.appendRow(rowValues);
  } else {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  }

  return { revision: nextRevision };
}

function deleteTalk_(talkId, userEmail) {
  const normalizedTalkId = String(talkId || "").trim();
  if (!normalizedTalkId) {
    throw new Error("削除対象の talkId が不正です");
  }

  const sheet = getSheet_(prop_("TALKS_SHEET", "Talks"));
  const values = sheet.getDataRange().getValues();
  if (!values || values.length <= 1) {
    throw new Error("削除対象のトークが見つかりません: " + normalizedTalkId);
  }

  const header = values[0];
  const idx = indexMap_(header);
  const now = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");

  let rowIndex = -1;
  let currentRevision = 0;

  for (var i = 1; i < values.length; i += 1) {
    if (String(values[i][idx.talk_id]) === normalizedTalkId) {
      rowIndex = i + 1;
      currentRevision = Number(values[i][idx.revision] || 0);
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error("削除対象のトークが見つかりません: " + normalizedTalkId);
  }

  const rowValues = values[rowIndex - 1].slice();
  while (rowValues.length < header.length) {
    rowValues.push("");
  }

  setRowValueIfPresent_(rowValues, idx, ["updated_at", "updatedAt", "更新日時"], now);
  setRowValueIfPresent_(rowValues, idx, ["updated_by", "updatedBy", "更新者"], userEmail);
  setRowValueIfPresent_(rowValues, idx, ["revision", "rev", "リビジョン"], currentRevision + 1);
  setRowValueIfPresent_(rowValues, idx, ["is_active", "isActive", "有効"], false);

  var payloadText = String(
    getRowValueByKeys_(rowValues, idx, ["payload_json", "payloadJson", "payload", "json"]) || "",
  );
  if (payloadText) {
    try {
      var payload = JSON.parse(payloadText);
      if (payload && typeof payload === "object") {
        payload.updatedAt = now;
        setRowValueIfPresent_(
          rowValues,
          idx,
          ["payload_json", "payloadJson", "payload", "json"],
          JSON.stringify(payload),
        );
      }
    } catch {}
  }

  sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);

  return {
    talkId: normalizedTalkId,
    revision: currentRevision + 1,
  };
}

function buildCategories_(talks) {
  var seen = {};
  var result = [];

  talks.forEach(function (talk) {
    var id = talk.categoryId || "uncategorized";
    if (seen[id]) {
      return;
    }
    seen[id] = true;

    result.push({
      id: id,
      name: talk.categoryName || id,
      description: "",
      product: talk.product || "hikari",
      scene: talk.scene || "kojin",
    });
  });

  return result;
}

function collectTags_(talks) {
  var map = {};

  talks.forEach(function (talk) {
    (talk.tags || []).forEach(function (tag) {
      map[tag] = true;
    });
  });

  return Object.keys(map);
}

function normalizeEmail_(email) {
  return String(email || "")
    .toLowerCase()
    .trim();
}

function findHeaderIndex_(idx, keys) {
  for (var i = 0; i < keys.length; i += 1) {
    var key = keys[i];
    if (Object.prototype.hasOwnProperty.call(idx, key)) {
      return idx[key];
    }
  }

  return -1;
}

function getRowValueByKeys_(row, idx, keys) {
  var columnIndex = findHeaderIndex_(idx, keys);
  if (columnIndex < 0 || columnIndex >= row.length) {
    return "";
  }

  return row[columnIndex];
}

function setRowValueIfPresent_(row, idx, keys, value) {
  var columnIndex = findHeaderIndex_(idx, keys);
  if (columnIndex < 0) {
    return;
  }

  row[columnIndex] = value;
}

function parseBoolean_(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  var normalized = String(value || "")
    .toLowerCase()
    .trim();

  if (!normalized) {
    return fallback;
  }

  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
    return true;
  }

  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") {
    return false;
  }

  return fallback;
}

function parseAdminByRow_(row, idx) {
  var explicit = getRowValueByKeys_(row, idx, ["is_admin", "isAdmin", "管理者"]);
  var explicitText = String(explicit || "")
    .toLowerCase()
    .trim();

  if (explicitText !== "") {
    return parseBoolean_(explicit, false);
  }

  var role = String(getRowValueByKeys_(row, idx, ["role", "権限"]) || "")
    .toLowerCase()
    .trim();

  if (role === "admin" || role === "administrator" || role === "管理者") {
    return true;
  }

  return false;
}

function ensureEditorColumns_(sheet, header) {
  var nextHeader = header && header.length ? header.slice() : [];

  if (nextHeader.length === 1 && String(nextHeader[0] || "").trim() === "") {
    nextHeader = [];
  }

  var requiredColumns = ["email", "can_edit", "is_active", "is_admin", "updated_at", "updated_by"];
  var changed = false;

  requiredColumns.forEach(function (columnName) {
    if (nextHeader.indexOf(columnName) === -1) {
      nextHeader.push(columnName);
      changed = true;
    }
  });

  if (changed) {
    sheet.getRange(1, 1, 1, nextHeader.length).setValues([nextHeader]);
  }

  return nextHeader;
}

function getEditorPermissionMapByEmail_(values) {
  var map = {};
  if (!values || values.length <= 1) {
    return map;
  }

  var idx = indexMap_(values[0]);

  for (var i = 1; i < values.length; i += 1) {
    var row = values[i];
    var email = normalizeEmail_(getRowValueByKeys_(row, idx, ["email", "mail", "メール"]));
    if (!email) {
      continue;
    }

    map[email] = {
      email: email,
      canEdit: parseBoolean_(
        getRowValueByKeys_(row, idx, ["can_edit", "canEdit", "編集可"]),
        false,
      ),
      isActive: parseBoolean_(
        getRowValueByKeys_(row, idx, ["is_active", "isActive", "有効"]),
        true,
      ),
      isAdmin: parseAdminByRow_(row, idx),
      updatedAt: String(
        getRowValueByKeys_(row, idx, ["updated_at", "updatedAt", "更新日時"]) || "",
      ),
      updatedBy: String(getRowValueByKeys_(row, idx, ["updated_by", "updatedBy", "更新者"]) || ""),
    };
  }

  return map;
}

function isEditor_(email) {
  var normalizedEmail = normalizeEmail_(email);
  if (!normalizedEmail) {
    return false;
  }

  var sheet = getSheet_(prop_("EDITORS_SHEET", "Editors"));
  var map = getEditorPermissionMapByEmail_(sheet.getDataRange().getValues());
  var target = map[normalizedEmail];

  return Boolean(target && target.canEdit && target.isActive);
}

function isAdmin_(email) {
  var normalizedEmail = normalizeEmail_(email);
  if (!normalizedEmail) {
    return false;
  }

  var sheet = getSheet_(prop_("EDITORS_SHEET", "Editors"));
  var map = getEditorPermissionMapByEmail_(sheet.getDataRange().getValues());
  var target = map[normalizedEmail];

  return Boolean(target && target.isAdmin && target.isActive);
}

function listEditorPermissions_() {
  var sheet = getSheet_(prop_("EDITORS_SHEET", "Editors"));
  var values = sheet.getDataRange().getValues();
  var map = getEditorPermissionMapByEmail_(values);

  return Object.keys(map)
    .sort()
    .map(function (email) {
      return map[email];
    });
}

function upsertEditorPermission_(editor, actorEmail) {
  var sheet = getSheet_(prop_("EDITORS_SHEET", "Editors"));
  var values = sheet.getDataRange().getValues();
  var header = ensureEditorColumns_(sheet, values.length > 0 ? values[0] : []);

  values = sheet.getDataRange().getValues();
  if (values.length === 0) {
    values = [header];
  }

  var idx = indexMap_(values[0]);
  var normalizedEmail = normalizeEmail_(editor.email);
  if (!normalizedEmail) {
    throw new Error("editor.email が不正です");
  }

  var canEdit = parseBoolean_(editor.canEdit, false);
  var isActive = parseBoolean_(editor.isActive, true);
  var isAdmin = parseBoolean_(editor.isAdmin, false);

  var targetRowNumber = -1;
  for (var i = 1; i < values.length; i += 1) {
    var rowEmail = normalizeEmail_(getRowValueByKeys_(values[i], idx, ["email", "mail", "メール"]));
    if (rowEmail === normalizedEmail) {
      targetRowNumber = i + 1;
      break;
    }
  }

  var rowLength = values[0].length;
  var rowValues =
    targetRowNumber === -1 ? new Array(rowLength).fill("") : values[targetRowNumber - 1].slice();

  while (rowValues.length < rowLength) {
    rowValues.push("");
  }

  var now = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
  var actor = normalizeEmail_(actorEmail);

  setRowValueIfPresent_(rowValues, idx, ["email", "mail", "メール"], normalizedEmail);
  setRowValueIfPresent_(rowValues, idx, ["can_edit", "canEdit", "編集可"], canEdit);
  setRowValueIfPresent_(rowValues, idx, ["is_active", "isActive", "有効"], isActive);
  setRowValueIfPresent_(rowValues, idx, ["is_admin", "isAdmin", "管理者"], isAdmin);
  setRowValueIfPresent_(rowValues, idx, ["role", "権限"], isAdmin ? "admin" : "editor");
  setRowValueIfPresent_(rowValues, idx, ["updated_at", "updatedAt", "更新日時"], now);
  setRowValueIfPresent_(rowValues, idx, ["updated_by", "updatedBy", "更新者"], actor);

  if (targetRowNumber === -1) {
    sheet.appendRow(rowValues);
  } else {
    sheet.getRange(targetRowNumber, 1, 1, rowValues.length).setValues([rowValues]);
  }

  return {
    email: normalizedEmail,
    canEdit: canEdit,
    isActive: isActive,
    isAdmin: isAdmin,
    updatedAt: now,
    updatedBy: actor,
  };
}

function deleteEditorPermission_(email, actorEmail) {
  var sheet = getSheet_(prop_("EDITORS_SHEET", "Editors"));
  var values = sheet.getDataRange().getValues();
  if (!values || values.length <= 1) {
    throw new Error("削除対象の編集権限が見つかりません");
  }

  var idx = indexMap_(values[0]);
  var normalizedEmail = normalizeEmail_(email);
  if (!normalizedEmail) {
    throw new Error("削除対象のメールアドレスが不正です");
  }

  var targetRowNumber = -1;
  for (var i = 1; i < values.length; i += 1) {
    var rowEmail = normalizeEmail_(getRowValueByKeys_(values[i], idx, ["email", "mail", "メール"]));
    if (rowEmail === normalizedEmail) {
      targetRowNumber = i + 1;
      break;
    }
  }

  if (targetRowNumber === -1) {
    throw new Error("削除対象の編集権限が見つかりません: " + normalizedEmail);
  }

  sheet.deleteRow(targetRowNumber);

  return {
    email: normalizedEmail,
    deletedBy: normalizeEmail_(actorEmail),
    deletedAt: Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss"),
  };
}

function appendAudit_(action, talkId, actorEmail, result, detail) {
  const sheet = getSheet_(prop_("AUDIT_SHEET", "AuditLog"));
  const now = Utilities.formatDate(new Date(), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
  sheet.appendRow([now, action, talkId, actorEmail, result, detail]);
}

function getClosingDashboardByEmail_(email, dayKey, monthKey) {
  var normalizedEmail = normalizeEmail_(email);
  var now = new Date();
  var targetDayKey = normalizeDayKeyValue_(dayKey, now);
  var targetMonthKey = normalizeMonthKeyValue_(monthKey, now);

  var closing = getOrCreateClosingRow_(normalizedEmail, now, normalizedEmail);
  normalizeClosingPeriod_(closing, targetDayKey, targetMonthKey, now, normalizedEmail);

  return buildClosingSnapshot_(closing);
}

function recordClosing_(email, now) {
  var normalizedEmail = normalizeEmail_(email);
  var dayKey = formatTokyoDayKey_(now);
  var monthKey = formatTokyoMonthKey_(now);
  var nowIso = toIsoString_(now);
  var nowText = formatTokyoDateTime_(now);

  var closing = getOrCreateClosingRow_(normalizedEmail, now, normalizedEmail);
  normalizeClosingPeriod_(closing, dayKey, monthKey, now, normalizedEmail);

  closing.row[closing.idx.today_closing_count] =
    parseNumber_(closing.row[closing.idx.today_closing_count], 0) + 1;
  closing.row[closing.idx.monthly_closing_count] =
    parseNumber_(closing.row[closing.idx.monthly_closing_count], 0) + 1;
  closing.row[closing.idx.last_closing_at] = nowIso;
  closing.row[closing.idx.updated_at] = nowText;
  closing.row[closing.idx.updated_by] = normalizedEmail;

  writeClosingRow_(closing, closing.row);

  return buildClosingSnapshot_(closing);
}

function upsertClosingStats_(email, body, now) {
  var normalizedEmail = normalizeEmail_(email);
  var dayKey = normalizeDayKeyValue_(body.dayKey, now);
  var monthKey = normalizeMonthKeyValue_(body.monthKey, now);
  var mode = body.mode ? String(body.mode).toLowerCase() : "set";

  var closing = getOrCreateClosingRow_(normalizedEmail, now, normalizedEmail);
  normalizeClosingPeriod_(closing, dayKey, monthKey, now, normalizedEmail);

  var currentPt = parseNumber_(closing.row[closing.idx.today_acquired_pt], 0);
  var currentDialog = parseNumber_(closing.row[closing.idx.today_dialog_count], 0);

  var nextPt;
  var nextDialog;

  if (mode === "delta") {
    nextPt = currentPt + parseNumber_(body.deltaAcquiredPt, 0);
    nextDialog = currentDialog + parseNumber_(body.deltaDialogCount, 0);
  } else {
    var ptInput = body.todayAcquiredPt;
    if (ptInput === undefined || ptInput === null) {
      ptInput = body.acquiredPt;
    }

    var dialogInput = body.todayDialogCount;
    if (dialogInput === undefined || dialogInput === null) {
      dialogInput = body.dialogCount;
    }

    nextPt =
      ptInput === undefined || ptInput === null ? currentPt : parseNumber_(ptInput, currentPt);
    nextDialog =
      dialogInput === undefined || dialogInput === null
        ? currentDialog
        : parseNumber_(dialogInput, currentDialog);
  }

  if (nextPt < 0) {
    nextPt = 0;
  }
  if (nextDialog < 0) {
    nextDialog = 0;
  }

  closing.row[closing.idx.today_acquired_pt] = nextPt;
  closing.row[closing.idx.today_dialog_count] = nextDialog;
  closing.row[closing.idx.updated_at] = formatTokyoDateTime_(now);
  closing.row[closing.idx.updated_by] = normalizedEmail;

  writeClosingRow_(closing, closing.row);

  return buildClosingSnapshot_(closing);
}

function resetClosingDaily_(email, dayKey, actorEmail, now) {
  var normalizedEmail = normalizeEmail_(email);
  var targetDayKey = normalizeDayKeyValue_(dayKey, now);
  var targetMonthKey =
    targetDayKey && targetDayKey.length >= 7
      ? normalizeMonthKeyValue_(String(targetDayKey).slice(0, 7), now)
      : formatTokyoMonthKey_(now);

  var closing = getOrCreateClosingRow_(normalizedEmail, now, actorEmail);
  normalizeClosingPeriod_(closing, targetDayKey, targetMonthKey, now, actorEmail);

  closing.row[closing.idx.today_closing_count] = 0;
  closing.row[closing.idx.today_acquired_pt] = 0;
  closing.row[closing.idx.today_dialog_count] = 0;
  closing.row[closing.idx.last_closing_at] = "";
  closing.row[closing.idx.updated_at] = formatTokyoDateTime_(now);
  closing.row[closing.idx.updated_by] = normalizeEmail_(actorEmail);

  writeClosingRow_(closing, closing.row);

  return buildClosingSnapshot_(closing);
}

function resetClosingMonthly_(email, monthKey, actorEmail, now) {
  var normalizedEmail = normalizeEmail_(email);
  var targetMonthKey = normalizeMonthKeyValue_(monthKey, now);
  var targetDayKey = formatTokyoDayKey_(now);

  var closing = getOrCreateClosingRow_(normalizedEmail, now, actorEmail);
  normalizeClosingPeriod_(closing, targetDayKey, targetMonthKey, now, actorEmail);

  closing.row[closing.idx.monthly_closing_count] = 0;
  closing.row[closing.idx.updated_at] = formatTokyoDateTime_(now);
  closing.row[closing.idx.updated_by] = normalizeEmail_(actorEmail);

  writeClosingRow_(closing, closing.row);

  return {
    monthKey: String(closing.row[closing.idx.month_key] || targetMonthKey),
    monthlyClosingCount: parseNumber_(closing.row[closing.idx.monthly_closing_count], 0),
  };
}

function listClosingInactivityAlerts_(thresholdMinutes, now) {
  var minutes = parseNumber_(thresholdMinutes, 15);
  var thresholdMs = minutes * 60 * 1000;
  var current = now || new Date();
  var nowMs = current.getTime();
  var dayKey = formatTokyoDayKey_(current);

  var sheet = getSheet_(prop_("CLOSING_SHEET", "Closing"));
  ensureClosingColumns_(sheet);
  var values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return [];
  }

  var idx = indexMap_(values[0]);
  var alerts = [];

  for (var i = 1; i < values.length; i += 1) {
    var row = values[i];
    var rowEmail = normalizeEmail_(row[idx.email]);
    var rowDayKey = normalizeDayKeyValue_(row[idx.day_key], current);
    var lastClosingAt = row[idx.last_closing_at] ? String(row[idx.last_closing_at]) : "";

    if (!rowEmail || rowDayKey !== dayKey || !lastClosingAt) {
      continue;
    }

    var lastMs = new Date(lastClosingAt).getTime();
    if (!Number.isFinite(lastMs)) {
      continue;
    }

    var diffMs = nowMs - lastMs;
    if (diffMs < thresholdMs) {
      continue;
    }

    alerts.push({
      userEmail: rowEmail,
      minutesWithoutClosing: Math.floor(diffMs / 60000),
      lastClosingAt: lastClosingAt,
    });
  }

  alerts.sort(function (a, b) {
    return b.minutesWithoutClosing - a.minutesWithoutClosing;
  });

  return alerts;
}

function getOrCreateClosingRow_(email, now, actorEmail) {
  var sheet = getSheet_(prop_("CLOSING_SHEET", "Closing"));
  ensureClosingColumns_(sheet);

  var values = sheet.getDataRange().getValues();
  var idx = indexMap_(values[0]);
  var rowNumber = -1;

  for (var i = 1; i < values.length; i += 1) {
    var rowEmail = normalizeEmail_(values[i][idx.email]);
    if (rowEmail === email) {
      rowNumber = i + 1;
      break;
    }
  }

  if (rowNumber === -1) {
    var row = new Array(values[0].length).fill("");
    row[idx.email] = email;
    row[idx.day_key] = formatTokyoDayKey_(now);
    row[idx.month_key] = formatTokyoMonthKey_(now);
    row[idx.today_closing_count] = 0;
    row[idx.today_acquired_pt] = 0;
    row[idx.today_dialog_count] = 0;
    row[idx.monthly_closing_count] = 0;
    row[idx.last_closing_at] = "";
    row[idx.updated_at] = formatTokyoDateTime_(now);
    row[idx.updated_by] = normalizeEmail_(actorEmail);

    sheet.appendRow(row);

    values = sheet.getDataRange().getValues();
    idx = indexMap_(values[0]);
    for (var j = 1; j < values.length; j += 1) {
      var appendedRowEmail = normalizeEmail_(values[j][idx.email]);
      if (appendedRowEmail === email) {
        rowNumber = j + 1;
        break;
      }
    }
  }

  if (rowNumber === -1) {
    throw new Error("Closing 行の作成に失敗しました: " + email);
  }

  return {
    sheet: sheet,
    idx: idx,
    rowNumber: rowNumber,
    row: values[rowNumber - 1],
  };
}

function normalizeClosingPeriod_(closing, targetDayKey, targetMonthKey, now, actorEmail) {
  var row = closing.row;
  var idx = closing.idx;
  var changed = false;

  var currentMonthKey = normalizeMonthKeyValue_(row[idx.month_key], now);
  var currentDayKey = normalizeDayKeyValue_(row[idx.day_key], now);
  var hasMonthFormatDrift = String(row[idx.month_key] || "") !== currentMonthKey;
  var hasDayFormatDrift = String(row[idx.day_key] || "") !== currentDayKey;

  if (currentMonthKey !== targetMonthKey) {
    row[idx.month_key] = targetMonthKey;
    row[idx.monthly_closing_count] = 0;
    changed = true;
  } else if (hasMonthFormatDrift) {
    row[idx.month_key] = currentMonthKey;
    changed = true;
  }

  if (currentDayKey !== targetDayKey) {
    row[idx.day_key] = targetDayKey;
    row[idx.today_closing_count] = 0;
    row[idx.today_acquired_pt] = 0;
    row[idx.today_dialog_count] = 0;
    row[idx.last_closing_at] = "";
    changed = true;
  } else if (hasDayFormatDrift) {
    row[idx.day_key] = currentDayKey;
    changed = true;
  }

  if (!changed) {
    return;
  }

  row[idx.updated_at] = formatTokyoDateTime_(now);
  row[idx.updated_by] = normalizeEmail_(actorEmail);
  writeClosingRow_(closing, row);
}

function writeClosingRow_(closing, row) {
  closing.row = row;
  if (typeof closing.idx.day_key === "number") {
    closing.sheet.getRange(closing.rowNumber, closing.idx.day_key + 1, 1, 1).setNumberFormat("@");
  }
  if (typeof closing.idx.month_key === "number") {
    closing.sheet.getRange(closing.rowNumber, closing.idx.month_key + 1, 1, 1).setNumberFormat("@");
  }
  closing.sheet.getRange(closing.rowNumber, 1, 1, row.length).setValues([row]);
}

function buildClosingSnapshot_(closing) {
  var row = closing.row;
  var idx = closing.idx;
  var now = new Date();

  return {
    dayKey: normalizeDayKeyValue_(row[idx.day_key], now),
    monthKey: normalizeMonthKeyValue_(row[idx.month_key], now),
    todayClosingCount: parseNumber_(row[idx.today_closing_count], 0),
    todayAcquiredPt: parseNumber_(row[idx.today_acquired_pt], 0),
    todayDialogCount: parseNumber_(row[idx.today_dialog_count], 0),
    monthlyClosingCount: parseNumber_(row[idx.monthly_closing_count], 0),
    lastClosingAt: row[idx.last_closing_at] ? String(row[idx.last_closing_at]) : null,
  };
}

function ensureClosingColumns_(sheet) {
  var values = sheet.getDataRange().getValues();
  var header = values.length > 0 ? values[0] : [];

  if (header.length === 1 && String(header[0] || "").trim() === "") {
    header = [];
  }

  var required = [
    "email",
    "day_key",
    "month_key",
    "today_closing_count",
    "today_acquired_pt",
    "today_dialog_count",
    "monthly_closing_count",
    "last_closing_at",
    "updated_at",
    "updated_by",
  ];

  var changed = false;
  for (var i = 0; i < required.length; i += 1) {
    if (header.indexOf(required[i]) === -1) {
      header.push(required[i]);
      changed = true;
    }
  }

  if (changed || values.length === 0) {
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
  }
}

function appendClosingAudit_(action, actorEmail, result, detail) {
  try {
    var sheet = getSheet_(prop_("CLOSING_AUDIT_SHEET", "ClosingAudit"));
    var now = formatTokyoDateTime_(new Date());
    sheet.appendRow([now, action, normalizeEmail_(actorEmail), result, detail]);
  } catch (err) {
    // Audit failure must not break API responses.
  }
}

function parseNumber_(value, fallback) {
  var base = typeof fallback === "number" ? fallback : 0;
  var parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : base;
}

function pad2_(value) {
  return String(value || "").padStart(2, "0");
}

function normalizeDayKeyValue_(value, fallbackDate) {
  var baseDate = fallbackDate || new Date();

  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return Utilities.formatDate(value, "Asia/Tokyo", "yyyy-MM-dd");
  }

  var raw = String(value || "").trim();
  if (!raw) {
    return formatTokyoDayKey_(baseDate);
  }

  var directMatch = raw.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (directMatch) {
    return directMatch[1] + "-" + pad2_(directMatch[2]) + "-" + pad2_(directMatch[3]);
  }

  var parsed = new Date(raw);
  if (Number.isFinite(parsed.getTime())) {
    return Utilities.formatDate(parsed, "Asia/Tokyo", "yyyy-MM-dd");
  }

  return raw;
}

function normalizeMonthKeyValue_(value, fallbackDate) {
  var baseDate = fallbackDate || new Date();

  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return Utilities.formatDate(value, "Asia/Tokyo", "yyyy-MM");
  }

  var raw = String(value || "").trim();
  if (!raw) {
    return formatTokyoMonthKey_(baseDate);
  }

  var directMatch = raw.match(/^(\d{4})[\/-](\d{1,2})(?:[\/-](\d{1,2}))?/);
  if (directMatch) {
    return directMatch[1] + "-" + pad2_(directMatch[2]);
  }

  var parsed = new Date(raw);
  if (Number.isFinite(parsed.getTime())) {
    return Utilities.formatDate(parsed, "Asia/Tokyo", "yyyy-MM");
  }

  return raw;
}

function toTokyoDate_(date) {
  var source = date || new Date();
  var text = Utilities.formatDate(source, "Asia/Tokyo", "yyyy-MM-dd'T'HH:mm:ss");
  return new Date(text + "+09:00");
}

function toIsoString_(date) {
  return toTokyoDate_(date).toISOString();
}

function formatTokyoDateTime_(date) {
  return Utilities.formatDate(toTokyoDate_(date), "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss");
}

function formatTokyoDayKey_(date) {
  return Utilities.formatDate(toTokyoDate_(date), "Asia/Tokyo", "yyyy-MM-dd");
}

function formatTokyoMonthKey_(date) {
  return Utilities.formatDate(toTokyoDate_(date), "Asia/Tokyo", "yyyy-MM");
}

function isDomainAllowed_(email) {
  return getDomainAllowanceDebug_(email).allowed;
}

function getDomainAllowanceDebug_(email) {
  const normalizedEmail = String(email || "")
    .toLowerCase()
    .trim();

  const allowedEmailsText = prop_("ALLOWED_EMAILS", "");
  const allowedEmails = allowedEmailsText
    .split(",")
    .map(function (item) {
      return String(item || "")
        .toLowerCase()
        .trim();
    })
    .filter(function (item) {
      return item !== "";
    });

  const matchedAllowedEmail =
    normalizedEmail !== "" && allowedEmails.indexOf(normalizedEmail) !== -1;

  const domain = prop_("ALLOWED_DOMAIN", "").toLowerCase().trim();
  const match = normalizedEmail.match(/@(.+)$/);
  const matchedAllowedDomain = Boolean(
    normalizedEmail !== "" && domain && match && match[1] === domain,
  );

  return {
    email: normalizedEmail,
    allowedDomain: domain,
    allowedEmailsCount: allowedEmails.length,
    matchedAllowedEmail: matchedAllowedEmail,
    matchedAllowedDomain: matchedAllowedDomain,
    allowed: matchedAllowedEmail || matchedAllowedDomain,
  };
}

function getUserEmail_() {
  const email = safeEmail_();
  if (!email) {
    throw new Error("ユーザーのメールアドレスを取得できませんでした");
  }
  return email;
}

function safeEmail_() {
  try {
    return Session.getActiveUser().getEmail();
  } catch (err) {
    return "";
  }
}

function prop_(key, fallback) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  return value !== null && value !== "" ? value : fallback;
}

function getSheet_(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(prop_("SPREADSHEET_ID", ""));
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    var closingSheetName = prop_("CLOSING_SHEET", "Closing");
    var closingAuditSheetName = prop_("CLOSING_AUDIT_SHEET", "ClosingAudit");
    var highlightsSheetName = prop_("HIGHLIGHTS_SHEET", "DailyHighlights");

    if (
      sheetName === closingSheetName ||
      sheetName === closingAuditSheetName ||
      sheetName === highlightsSheetName
    ) {
      sheet = spreadsheet.insertSheet(sheetName);
      return sheet;
    }

    throw new Error("シートが見つかりません: " + sheetName);
  }
  return sheet;
}

function indexMap_(header) {
  var map = {};

  for (var i = 0; i < header.length; i += 1) {
    var key = String(header[i] || "").trim();
    if (!key) {
      continue;
    }
    map[key] = i;
  }

  return map;
}

function jsonResponse_(obj, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function sendResponse_(obj, statusCode, callbackName) {
  if (callbackName) {
    return jsonpResponse_(callbackName, obj);
  }

  return jsonResponse_(obj, statusCode);
}

function jsonpResponse_(callbackName, obj) {
  const output = ContentService.createTextOutput(callbackName + "(" + JSON.stringify(obj) + ");");
  output.setMimeType(ContentService.MimeType.JAVASCRIPT);
  return output;
}

function getCallbackName_(e) {
  const raw = e && e.parameter && e.parameter.callback ? String(e.parameter.callback).trim() : "";

  if (!raw) {
    return "";
  }

  const isValid = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(raw);
  return isValid ? raw : "";
}

function isLegacyEchoRequest_(e) {
  if (!e || !e.parameter) {
    return false;
  }

  const hasUserContentKey = Boolean(e.parameter.user_content_key);
  const hasLibraryKey = Boolean(e.parameter.lib);
  return hasUserContentKey || hasLibraryKey;
}

function getReturnTo_(e) {
  if (!e || !e.parameter || !e.parameter.return_to) {
    return "";
  }

  const raw = String(e.parameter.return_to || "").trim();
  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw);
    const protocol = String(url.protocol || "").toLowerCase();
    if (protocol !== "https:" && protocol !== "http:") {
      return "";
    }

    const allowedHosts = prop_("ALLOWED_RETURN_HOSTS", "lizqxel.github.io,localhost:3000")
      .split(",")
      .map(function (value) {
        return String(value || "")
          .toLowerCase()
          .trim();
      })
      .filter(function (value) {
        return value !== "";
      });

    const host = String(url.host || "")
      .toLowerCase()
      .trim();
    if (allowedHosts.indexOf(host) === -1) {
      return "";
    }

    return url.toString();
  } catch (err) {
    return "";
  }
}

function htmlRedirectResponse_(url) {
  const escapedUrl = JSON.stringify(String(url || ""));
  const html =
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>認証完了</title></head><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:24px;">' +
    '<p style="margin:0 0 12px;">認証を確認しました。元の画面に戻ります...</p>' +
    "<script>window.location.replace(" +
    escapedUrl +
    ");</script>" +
    '<p style="margin:0;">自動で戻らない場合は <a id="return-link" href="#">こちら</a> をクリックしてください。</p>' +
    "<script>document.getElementById('return-link').setAttribute('href', " +
    escapedUrl +
    ");</script>" +
    "</body></html>";

  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(
    HtmlService.XFrameOptionsMode.ALLOWALL,
  );
}
