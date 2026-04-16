/**
 * Talk Portal API (Google Apps Script)
 *
 * Required Script Properties:
 * - SPREADSHEET_ID
 * - ALLOWED_DOMAIN  (example: bb-connection.com)
 * - ALLOWED_EMAILS  (optional, comma-separated emails)
 * - TALKS_SHEET     (default: Talks)
 * - EDITORS_SHEET   (default: Editors)
 * - AUDIT_SHEET     (default: AuditLog)
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

    const action = (e && e.parameter && e.parameter.action) || "";
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

    if (action !== "bootstrap") {
      return sendResponse_(
        {
          ok: false,
          error: {
            code: "INVALID_ACTION",
            message:
              "指定された action はサポートされていません（bootstrap / authorize / listEditorPermissions）",
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

      var targetEmail = normalizeEmail_(body.email || body.editorEmail || (body.editor && body.editor.email));
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

    if (action !== "updateTalk") {
      return jsonResponse_(
        {
          ok: false,
          error: {
            code: "INVALID_ACTION",
            message: "updateTalk / upsertEditorPermission / deleteEditorPermission をサポートしています",
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
    dailyHighlights: [],
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
    const isActive = String(row[idx.is_active] || "TRUE").toUpperCase() === "TRUE";
    if (!isActive) {
      return;
    }

    const jsonText = row[idx.payload_json];
    if (!jsonText) {
      return;
    }

    const talk = JSON.parse(String(jsonText));
    talk.updatedAt = row[idx.updated_at] || talk.updatedAt || "";
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

function isDomainAllowed_(email) {
  const normalizedEmail = String(email || "")
    .toLowerCase()
    .trim();
  if (!normalizedEmail) {
    return false;
  }

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

  if (allowedEmails.indexOf(normalizedEmail) !== -1) {
    return true;
  }

  const domain = prop_("ALLOWED_DOMAIN", "").toLowerCase().trim();
  if (!domain) {
    return false;
  }

  const match = normalizedEmail.match(/@(.+)$/);
  if (!match) {
    return false;
  }

  return match[1] === domain;
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
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
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
